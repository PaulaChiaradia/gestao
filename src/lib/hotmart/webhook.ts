import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone, normalizeUF, ufFromPhone } from "@/lib/brazil";

// Formato do webhook Hotmart versão 2.0 (somente os campos usados)
type Money = { value?: number; currency_value?: string };
export type HotmartWebhook = {
  id?: string;
  creation_date?: number;
  event?: string;
  version?: string;
  hottok?: string;
  data?: {
    product?: { id?: number; ucode?: string; name?: string };
    affiliates?: { affiliate_code?: string; name?: string }[];
    buyer?: {
      name?: string;
      email?: string;
      checkout_phone?: string;
      checkout_phone_code?: string;
      document?: string;
      address?: { city?: string; state?: string; country?: string; country_iso?: string; zipcode?: string };
    };
    commissions?: { value?: number; source?: string; currency_value?: string }[];
    purchase?: {
      transaction?: string;
      status?: string;
      order_date?: number;
      approved_date?: number;
      price?: Money;
      original_offer_price?: Money;
      offer?: { code?: string; coupon_code?: string };
      payment?: { type?: string; installments_number?: number };
      order_bump?: { is_order_bump?: boolean };
      checkout_country?: { iso?: string; name?: string };
      origin?: { src?: string; sck?: string; xcod?: string };
      sckPaymentLink?: string;
    };
    subscription?: { subscriber?: { code?: string }; status?: string };
  };
};

const REFUND_STATUSES = new Set(["REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK"]);

const toDate = (ms?: number) => (ms ? new Date(ms).toISOString() : null);

function titleCase(s?: string | null) {
  if (!s) return null;
  return s
    .trim()
    .toLowerCase()
    .replace(/(^|\s|-)(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (w) => w.toLowerCase());
}

type Result = { status: "processado" | "ignorado"; reason?: string };

/** Grava/atualiza a venda e o contato a partir de um evento de compra. */
export async function processHotmartEvent(db: SupabaseClient, payload: HotmartWebhook): Promise<Result> {
  const purchase = payload.data?.purchase;
  const transaction = purchase?.transaction;
  if (!transaction || !purchase?.status) return { status: "ignorado", reason: "evento sem transação" };

  const eventAt = toDate(payload.creation_date) ?? new Date().toISOString();

  // Eventos podem chegar fora de ordem: não sobrescreve um estado mais recente
  const { data: existing } = await db
    .from("hotmart_sales")
    .select("*")
    .eq("transaction", transaction)
    .maybeSingle();
  if (existing?.event_at && Date.parse(existing.event_at) > Date.parse(eventAt)) {
    return { status: "ignorado", reason: "evento antigo" };
  }

  const product = payload.data?.product;
  const buyer = payload.data?.buyer;
  const address = buyer?.address;
  const countryIso = address?.country_iso ?? purchase.checkout_country?.iso ?? null;

  const productId = await upsertProduct(db, product);

  const phone = normalizePhone(
    [buyer?.checkout_phone_code, buyer?.checkout_phone].filter(Boolean).join("") || buyer?.checkout_phone,
    countryIso,
  );
  let state = normalizeUF(address?.state);
  let geoSource = state ? "endereco" : "nenhum";
  if (!state && (!countryIso || countryIso === "BR")) {
    state = ufFromPhone(phone);
    if (state) geoSource = "ddd";
  }
  const city = address?.city ? titleCase(address.city) : null;

  const contactId = await upsertContact(db, {
    name: buyer?.name ?? null,
    email: buyer?.email?.trim().toLowerCase() ?? null,
    phone,
    document: buyer?.document ?? null,
    city,
    state,
    country: address?.country ?? purchase.checkout_country?.name ?? null,
    zipcode: address?.zipcode ?? null,
  });

  const producer = payload.data?.commissions?.find((c) => c.source === "PRODUCER");
  const inBRL = (m?: { currency_value?: string }) => !m?.currency_value || m.currency_value === "BRL";
  // Em reais: preço da oferta (sem juros). Outras moedas são convertidas na sincronização diária com a API.
  const offer = purchase.original_offer_price ?? purchase.price;
  const isRefund = REFUND_STATUSES.has(purchase.status);

  const incoming: Record<string, unknown> = {
    transaction,
    product_id: productId,
    contact_id: contactId,
    status: purchase.status,
    last_event: payload.event ?? purchase.status,
    event_at: eventAt,
    offer_code: purchase.offer?.code ?? null,
    coupon_code: purchase.offer?.coupon_code ?? null,
    price: purchase.price?.value ?? null,
    currency: purchase.price?.currency_value ?? null,
    producer_commission: producer?.value ?? null,
    gross_brl: inBRL(offer) ? (offer?.value ?? null) : null,
    commission_brl: producer && inBRL(producer) ? (producer.value ?? null) : null,
    payment_type: purchase.payment?.type ?? null,
    installments: purchase.payment?.installments_number ?? null,
    is_order_bump: purchase.order_bump?.is_order_bump ?? false,
    is_subscription: !!payload.data?.subscription?.subscriber?.code,
    buyer_name: buyer?.name ?? null,
    buyer_email: buyer?.email?.trim().toLowerCase() ?? null,
    buyer_phone: phone,
    city,
    state,
    country: address?.country ?? purchase.checkout_country?.name ?? null,
    zipcode: address?.zipcode ?? null,
    geo_source: geoSource,
    src: purchase.origin?.src || null,
    sck: purchase.origin?.sck || purchase.sckPaymentLink || null,
    affiliate_name: payload.data?.affiliates?.[0]?.name || null,
    order_date: toDate(purchase.order_date),
    approved_date: toDate(purchase.approved_date),
    refunded_at: isRefund ? (existing?.refunded_at ?? eventAt) : null,
    raw: payload,
  };

  // Eventos seguintes (ex.: reembolso) podem vir sem origem ou endereço: nunca apaga o que já se sabe
  const row = existing
    ? Object.fromEntries(Object.entries(incoming).map(([k, v]) => [k, v ?? existing[k] ?? null]))
    : incoming;
  if (existing && !incoming.state && existing.state) row.geo_source = existing.geo_source;

  const { error } = await db.from("hotmart_sales").upsert(row);
  if (error) throw new Error(`hotmart_sales: ${error.message}`);

  return { status: "processado" };
}

async function upsertProduct(db: SupabaseClient, product?: { id?: number; ucode?: string; name?: string }) {
  if (!product?.id && !product?.ucode) return null;

  if (product.id) {
    const { data } = await db.from("hotmart_products").select("id").eq("hotmart_id", product.id).maybeSingle();
    if (data) return data.id as string;
  }
  // Produto cadastrado manualmente (pelo código do checkout) ainda sem o id da Hotmart: casa pelo nome
  if (product.name) {
    const { data } = await db
      .from("hotmart_products")
      .select("id")
      .is("hotmart_id", null)
      .ilike("name", product.name)
      .maybeSingle();
    if (data) {
      await db.from("hotmart_products").update({ hotmart_id: product.id, ucode: product.ucode }).eq("id", data.id);
      return data.id as string;
    }
  }
  const { data, error } = await db
    .from("hotmart_products")
    .insert({ hotmart_id: product.id, ucode: product.ucode, name: product.name ?? `Produto ${product.id}` })
    .select("id")
    .single();
  if (error) throw new Error(`hotmart_products: ${error.message}`);
  return data.id as string;
}

type ContactInput = {
  name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipcode: string | null;
};

/** Encontra o contato por e-mail (ou telefone) e completa só os campos vazios. */
async function upsertContact(db: SupabaseClient, input: ContactInput) {
  if (!input.email && !input.phone) return null;

  let query = db.from("contacts").select("*").limit(1);
  query = input.email ? query.eq("email", input.email) : query.eq("phone", input.phone!);
  const { data: found } = await query.maybeSingle();

  if (found) {
    const patch = Object.fromEntries(
      Object.entries(input).filter(([k, v]) => v && !found[k as keyof typeof found]),
    );
    const tags = found.tags?.includes("comprador") ? found.tags : [...(found.tags ?? []), "comprador"];
    await db.from("contacts").update({ ...patch, tags }).eq("id", found.id);
    return found.id as string;
  }

  const { data, error } = await db
    .from("contacts")
    .insert({ ...input, first_source: "hotmart", tags: ["comprador"] })
    .select("id")
    .single();
  if (error) throw new Error(`contacts: ${error.message}`);
  return data.id as string;
}
