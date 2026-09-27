import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone, normalizeUF, ufFromPhone } from "@/lib/brazil";
import { hotmartList } from "./api";

// Todas as situações aceitas pelo filtro do histórico (sem filtro a API devolve só aprovadas/concluídas)
const ALL_STATUSES = [
  "APPROVED", "COMPLETE", "REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK", "CANCELLED", "PROTESTED",
  "EXPIRED", "OVERDUE", "WAITING_PAYMENT", "PRINTED_BILLET", "UNDER_ANALISYS", "BLOCKED", "NO_FUNDS", "STARTED", "PRE_ORDER",
];

type HistoryItem = {
  product: { id: number; name: string };
  buyer?: { name?: string; email?: string; ucode?: string };
  purchase: {
    transaction: string;
    status: string;
    order_date?: number;
    approved_date?: number;
    is_subscription?: boolean;
    commission_as?: string;
    price?: { value?: number; currency_code?: string };
    payment?: { type?: string; method?: string; installments_number?: number };
    offer?: { code?: string; payment_mode?: string };
    tracking?: { source?: string; source_sck?: string; external_code?: string };
    warranty_expire_date?: number;
    recurrency_number?: number;
    hotmart_fee?: { total?: number; percentage?: number };
  };
};
type UsersItem = {
  transaction: string;
  users: { role: string; user: { cellphone?: string; phone?: string; locale?: string; address?: Record<string, string> } }[];
};
type CommissionItem = {
  transaction: string;
  exchange_rate_currency_payout?: number;
  commissions: { source: string; user?: { name?: string }; commission: { value: number; currency_code?: string } }[];
};
type Money = { value?: number; currency_code?: string };
type PriceItem = { transaction: string; real_conversion_rate?: number; base?: Money; total?: Money; fee?: Money };
type ApiProduct = { id: number; name: string; format?: string; status?: string };

const toISO = (ms?: number) => (ms ? new Date(ms).toISOString() : null);

function titleCase(s?: string | null) {
  if (!s) return null;
  return s.trim().toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Cadastra/atualiza os produtos da conta e devolve o mapa id Hotmart → id interno. */
export async function syncProducts(db: SupabaseClient) {
  const products = await hotmartList<ApiProduct>("/products/api/v1/products", {});
  const { data: existing } = await db.from("hotmart_products").select("id, hotmart_id");
  const known = new Set((existing ?? []).map((p) => p.hotmart_id));
  const fresh = products.filter((p) => !known.has(p.id));
  if (fresh.length) {
    await db.from("hotmart_products").insert(
      fresh.map((p) => ({ hotmart_id: p.id, name: p.name.trim(), kind: p.format?.toLowerCase() ?? null, active: p.status === "ACTIVE" })),
    );
  }
  for (const p of products.filter((p) => known.has(p.id))) {
    await db.from("hotmart_products").update({ active: p.status === "ACTIVE" }).eq("hotmart_id", p.id);
  }
  const { data: all } = await db.from("hotmart_products").select("id, hotmart_id").not("hotmart_id", "is", null);
  return new Map((all ?? []).map((p) => [Number(p.hotmart_id), p.id as string]));
}

export type ImportStats = { sales: number; newContacts: number };

/** Importa as vendas de um intervalo (máximo de 1 ano, limite da API). */
export async function importWindow(
  db: SupabaseClient,
  productMap: Map<number, string>,
  start: number,
  end: number,
): Promise<ImportStats> {
  const params = { start_date: start, end_date: end, transaction_status: ALL_STATUSES };
  const history = await hotmartList<HistoryItem>("/payments/api/v1/sales/history", params);
  if (!history.length) return { sales: 0, newContacts: 0 };

  const [users, commissions, prices] = await Promise.all([
    hotmartList<UsersItem>("/payments/api/v1/sales/users", params),
    hotmartList<CommissionItem>("/payments/api/v1/sales/commissions", params),
    hotmartList<PriceItem>("/payments/api/v1/sales/price/details", params),
  ]);
  const buyerOf = new Map(users.map((u) => [u.transaction, u.users.find((x) => x.role === "BUYER")?.user]));
  const commissionOf = new Map(commissions.map((c) => [c.transaction, c]));
  const priceOf = new Map(prices.map((p) => [p.transaction, p]));

  // Produtos que surgiram só nas vendas (ex.: excluídos da conta)
  for (const it of history) {
    if (!productMap.has(it.product.id)) {
      const { data } = await db
        .from("hotmart_products")
        .insert({ hotmart_id: it.product.id, name: it.product.name.trim(), active: false })
        .select("id")
        .single();
      if (data) productMap.set(it.product.id, data.id);
    }
  }

  // Monta cada venda com geografia (endereço ou DDD) e a comissão da conta
  const rows = history.map((it) => {
    const p = it.purchase;
    const buyer = buyerOf.get(p.transaction);
    const address = buyer?.address ?? {};
    const country = address.country ?? null;
    const isBR = !country || /brasil|brazil/i.test(country);
    const phone = normalizePhone(buyer?.cellphone || buyer?.phone, isBR ? "BR" : "XX");
    let state: string | null = normalizeUF(address.state);
    let geo = state ? "endereco" : "nenhum";
    if (!state && isBR) {
      state = ufFromPhone(phone);
      if (state) geo = "ddd";
    }
    // Valores em reais: preço base da oferta (sem juros) ÷ taxa de conversão da Hotmart
    const priceInfo = priceOf.get(p.transaction);
    const rate = priceInfo?.real_conversion_rate || 1;
    const base = priceInfo?.base?.value ?? (p.price?.currency_code === "BRL" ? p.price?.value : undefined);
    const grossBrl = base != null ? Math.round((base / rate) * 100) / 100 : null;
    const inBrl = (v?: number) => (v != null ? Math.round((v / rate) * 100) / 100 : null);
    const totalPaidBrl = inBrl(priceInfo?.total?.value ?? p.price?.value);
    const installmentFeeBrl =
      priceInfo?.fee?.value != null
        ? inBrl(priceInfo.fee.value)
        : totalPaidBrl != null && grossBrl != null
          ? Math.max(0, Math.round((totalPaidBrl - grossBrl) * 100) / 100)
          : null;

    // Comissões vêm na moeda de repasse: converte para reais
    const comm = commissionOf.get(p.transaction);
    const payoutRate = comm?.exchange_rate_currency_payout;
    const commissionToBrl = (c: { value: number; currency_code?: string }) =>
      (c.currency_code ?? "BRL") === "BRL"
        ? c.value
        : payoutRate
          ? Math.round((c.value / payoutRate / rate) * 100) / 100
          : null;
    const mine = comm?.commissions.find((c) => c.source === (p.commission_as ?? "PRODUCER"));
    const commissionBrl = mine ? commissionToBrl(mine.commission) : null;
    const split = comm?.commissions.map((c) => ({
      source: c.source,
      name: c.user?.name?.trim() ?? null,
      value_brl: commissionToBrl(c.commission),
      mine: c === mine,
    }));
    return {
      transaction: p.transaction,
      product_id: productMap.get(it.product.id) ?? null,
      status: p.status,
      last_event: "IMPORTACAO",
      offer_code: p.offer?.code ?? null,
      price: p.price?.value ?? null,
      currency: p.price?.currency_code ?? null,
      producer_commission: mine?.commission.value ?? null,
      gross_brl: grossBrl,
      commission_brl: commissionBrl,
      payment_type: p.payment?.type ?? null,
      payment_method: p.payment?.method ?? null,
      offer_payment_mode: p.offer?.payment_mode ?? null,
      recurrency_number: p.recurrency_number ?? null,
      warranty_expire_date: toISO(p.warranty_expire_date),
      buyer_ucode: it.buyer?.ucode ?? null,
      buyer_locale: buyer?.locale ?? null,
      external_code: p.tracking?.external_code && p.tracking.external_code !== "undefined" ? p.tracking.external_code : null,
      conversion_rate: rate,
      total_paid_brl: totalPaidBrl,
      installment_fee_brl: installmentFeeBrl,
      hotmart_fee_brl: inBrl(p.hotmart_fee?.total),
      hotmart_fee_percentage: p.hotmart_fee?.percentage ?? null,
      commissions: split ?? null,
      installments: p.payment?.installments_number ?? null,
      is_subscription: !!p.is_subscription,
      buyer_name: it.buyer?.name?.trim() ?? null,
      buyer_email: it.buyer?.email?.trim().toLowerCase() ?? null,
      buyer_phone: phone,
      city: titleCase(address.city),
      state,
      country,
      zipcode: address.zip_code ?? null,
      geo_source: geo,
      src: p.tracking?.source ?? null,
      sck: p.tracking?.source_sck ?? null,
      order_date: toISO(p.order_date),
      approved_date: toISO(p.approved_date),
      raw: it,
    };
  });

  const newContacts = await linkContacts(db, rows);

  // Não sobrescreve dados que o webhook já trouxe (origem, endereço) com vazios da importação
  const txs = rows.map((r) => r.transaction);
  const current = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < txs.length; i += 300) {
    const { data } = await db
      .from("hotmart_sales")
      .select("transaction, src, sck, city, state, geo_source, zipcode, refunded_at, event_at, last_event")
      .in("transaction", txs.slice(i, i + 300));
    data?.forEach((d) => current.set(d.transaction, d));
  }
  const now = new Date().toISOString();
  const merged = rows.map((r) => {
    const cur = current.get(r.transaction);
    const out: Record<string, unknown> = { ...r, event_at: now };
    if (cur) {
      for (const k of ["src", "sck", "city", "state", "zipcode"] as const) out[k] = r[k] ?? cur[k] ?? null;
      if (!r.state && cur.state) out.geo_source = cur.geo_source;
      out.refunded_at = cur.refunded_at ?? null;
      if (cur.last_event && cur.last_event !== "IMPORTACAO") out.last_event = cur.last_event;
    }
    return out;
  });
  for (let i = 0; i < merged.length; i += 500) {
    const { error } = await db.from("hotmart_sales").upsert(merged.slice(i, i + 500), { onConflict: "transaction" });
    if (error) throw new Error(`hotmart_sales: ${error.message}`);
  }
  return { sales: rows.length, newContacts };
}

type SaleForContact = {
  transaction: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipcode: string | null;
  contact_id?: string | null;
};

/** Cria/completa os contatos dos compradores e liga cada venda ao contato. */
async function linkContacts(db: SupabaseClient, rows: SaleForContact[]) {
  const emails = [...new Set(rows.map((r) => r.buyer_email).filter(Boolean))] as string[];
  const found = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await db.from("contacts").select("*").in("email", emails.slice(i, i + 200));
    data?.forEach((c) => found.set(c.email, c));
  }

  // Um registro por e-mail, com os dados mais completos entre as compras
  const best = new Map<string, SaleForContact>();
  for (const r of rows) {
    if (!r.buyer_email) continue;
    const prev = best.get(r.buyer_email);
    best.set(r.buyer_email, {
      ...r,
      buyer_name: prev?.buyer_name ?? r.buyer_name,
      buyer_phone: prev?.buyer_phone ?? r.buyer_phone,
      city: prev?.city ?? r.city,
      state: prev?.state ?? r.state,
      country: prev?.country ?? r.country,
      zipcode: prev?.zipcode ?? r.zipcode,
    });
  }

  const inserts = [];
  for (const [email, r] of best) {
    const c = found.get(email);
    const data = { name: r.buyer_name, phone: r.buyer_phone, city: r.city, state: r.state, country: r.country, zipcode: r.zipcode };
    if (!c) {
      inserts.push({ email, ...data, first_source: "hotmart", tags: ["comprador"] });
      continue;
    }
    const patch = Object.fromEntries(Object.entries(data).filter(([k, v]) => v && !c[k]));
    const tags = (c.tags as string[]).includes("comprador") ? null : [...(c.tags as string[]), "comprador"];
    if (Object.keys(patch).length || tags) await db.from("contacts").update({ ...patch, ...(tags && { tags }) }).eq("id", c.id);
  }
  for (let i = 0; i < inserts.length; i += 500) {
    const { data, error } = await db.from("contacts").insert(inserts.slice(i, i + 500)).select("*");
    if (error) throw new Error(`contacts: ${error.message}`);
    data?.forEach((c) => found.set(c.email, c));
  }
  for (const r of rows) r.contact_id = r.buyer_email ? ((found.get(r.buyer_email)?.id as string) ?? null) : null;
  return inserts.length;
}

/** Sincroniza de hoje para trás, em janelas de 1 ano, até `years` anos. */
export async function importHistory(db: SupabaseClient, years: number, onProgress?: (msg: string) => void) {
  const productMap = await syncProducts(db);
  const YEAR = 365 * 86_400_000;
  const end = Date.now();
  let total = 0;
  let contacts = 0;
  for (let y = 0; y < years; y++) {
    const to = end - y * YEAR;
    const from = to - YEAR + 1;
    const stats = await importWindow(db, productMap, from, to);
    total += stats.sales;
    contacts += stats.newContacts;
    onProgress?.(`${new Date(from).toLocaleDateString("pt-BR")} a ${new Date(to).toLocaleDateString("pt-BR")}: ${stats.sales} vendas`);
  }
  await db
    .from("integrations")
    .update({ status: "conectado", last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("key", "hotmart");
  return { total, contacts };
}
