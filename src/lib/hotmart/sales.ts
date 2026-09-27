import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DDD_REGION, dddOf, UF_NAMES, type UF } from "@/lib/brazil";

export const PERIODS = {
  "7d": { label: "7 dias", days: 7 },
  "30d": { label: "30 dias", days: 30 },
  "90d": { label: "90 dias", days: 90 },
  "12m": { label: "12 meses", days: 365 },
  tudo: { label: "Tudo", days: null },
} as const;
export type PeriodKey = keyof typeof PERIODS;

export const PAID_STATUSES = ["APPROVED", "COMPLETE"];
export const REFUND_STATUSES = ["REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK"];

const PAYMENT_LABELS: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  APPLE_PAY: "Apple Pay",
  CASH_PAYMENT: "Pagamento em espécie (exterior)",
  DIRECT_DEBIT: "Débito em conta",
  FINANCED_BILLET: "Boleto parcelado",
  FINANCED_INSTALLMENT: "Parcelamento financiado",
  PIX: "Pix",
  BILLET: "Boleto",
  PAYPAL: "PayPal",
  GOOGLE_PAY: "Google Pay",
  HOTCARD: "Hotcard",
  WALLET: "Saldo Hotmart",
};

/** Valor da venda em reais (sem juros); vendas recém-chegadas pelo webhook ainda sem conversão usam o preço em BRL. */
export function saleBRL(r: { gross_brl?: number | null; price?: number | null; currency?: string | null }) {
  if (r.gross_brl != null) return Number(r.gross_brl);
  return r.currency === "BRL" || !r.currency ? Number(r.price ?? 0) : 0;
}

/** Parte da conta (produtora) em reais. */
export function commissionBRL(r: { commission_brl?: number | null; producer_commission?: number | null; currency?: string | null }) {
  if (r.commission_brl != null) return Number(r.commission_brl);
  return r.currency === "BRL" || !r.currency ? Number(r.producer_commission ?? 0) : 0;
}

type SaleRow = {
  transaction: string;
  product_id: string | null;
  status: string;
  price: number | null;
  producer_commission: number | null;
  payment_type: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  city: string | null;
  state: string | null;
  src: string | null;
  sck: string | null;
  order_date: string | null;
};

export type Bucket = { key: string; label: string; revenue: number; count: number };

export type SalesSummary = {
  products: { id: string; name: string }[];
  revenue: number;
  net: number;
  sales: number;
  ticket: number;
  refunds: number;
  refundRate: number;
  series: { granularity: "dia" | "mês"; points: Bucket[] };
  byState: Record<UF, { revenue: number; count: number }>;
  unknownState: number;
  topRegions: Bucket[];
  byProduct: Bucket[];
  byOrigin: Bucket[];
  byPayment: Bucket[];
  recent: (SaleRow & { productName: string })[];
  hasAnySale: boolean;
};

const tz = "America/Sao_Paulo";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz }); // AAAA-MM-DD
const monthKey = (iso: string) => dayKey(iso).slice(0, 7);

function group(rows: SaleRow[], keyOf: (r: SaleRow) => string, labelOf?: (key: string) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    const key = keyOf(r);
    const b = map.get(key) ?? { key, label: labelOf ? labelOf(key) : key, revenue: 0, count: 0 };
    b.revenue += Number(r.price ?? 0);
    b.count += 1;
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export async function getSalesSummary(period: PeriodKey, productId?: string): Promise<SalesSummary> {
  const supabase = await createClient();
  const days = PERIODS[period].days;
  const since = days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;

  const { data: productRows } = await supabase.from("hotmart_products").select("id, name, short_name").order("name");
  const products = (productRows ?? []).map((p) => ({ id: p.id as string, name: (p.short_name || p.name) as string }));
  const productName = new Map(products.map((p) => [p.id, p.name]));

  // A API devolve no máximo 1.000 linhas por chamada: busca em páginas
  const rows: SaleRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("hotmart_sales")
      .select(
        "transaction, product_id, status, price, currency, gross_brl, commission_brl, producer_commission, payment_type, buyer_name, buyer_phone, city, state, src, sck, order_date",
      )
      .order("order_date", { ascending: false })
      .order("transaction")
      .range(from, from + PAGE - 1);
    if (since) query = query.gte("order_date", since);
    if (productId) query = query.eq("product_id", productId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    // Daqui em diante price = valor em reais e producer_commission = parte da conta em reais
    for (const r of (data ?? []) as (SaleRow & { currency: string | null; gross_brl: number | null; commission_brl: number | null })[]) {
      rows.push({ ...r, price: saleBRL(r), producer_commission: commissionBRL(r) });
    }
    if (!data || data.length < PAGE) break;
  }

  const paid = rows.filter((r) => PAID_STATUSES.includes(r.status));
  const refunded = rows.filter((r) => REFUND_STATUSES.includes(r.status));
  const revenue = paid.reduce((s, r) => s + Number(r.price ?? 0), 0);
  const net = paid.reduce((s, r) => s + Number(r.producer_commission ?? 0), 0);
  const settled = paid.length + refunded.length;

  // Série temporal: por dia até 90 dias, por mês acima disso (buckets vazios incluídos)
  const granularity = days && days <= 90 ? "dia" : "mês";
  const keyOf = granularity === "dia" ? dayKey : monthKey;
  const byTime = new Map(group(paid.filter((r) => r.order_date), (r) => keyOf(r.order_date!)).map((b) => [b.key, b]));
  const points: Bucket[] = [];
  const first = since ?? paid.at(-1)?.order_date ?? new Date().toISOString();
  const cursor = new Date(first);
  const end = new Date();
  while (cursor <= end) {
    const key = keyOf(cursor.toISOString());
    if (!points.length || points.at(-1)!.key !== key) {
      const [y, m, d] = key.split("-");
      const label = granularity === "dia" ? `${d}/${m}` : `${m}/${y.slice(2)}`;
      points.push({ key, label, revenue: byTime.get(key)?.revenue ?? 0, count: byTime.get(key)?.count ?? 0 });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const byState = Object.fromEntries(
    Object.keys(UF_NAMES).map((uf) => [uf, { revenue: 0, count: 0 }]),
  ) as SalesSummary["byState"];
  let unknownState = 0;
  for (const r of paid) {
    if (r.state && r.state in byState) {
      byState[r.state as UF].revenue += Number(r.price ?? 0);
      byState[r.state as UF].count += 1;
    } else unknownState += 1;
  }

  // Poucos compradores informam cidade; o DDD do celular indica a região em quase todas as vendas
  const withDdd = paid.filter((r) => dddOf(r.buyer_phone));
  const topRegions = group(
    withDdd,
    (r) => dddOf(r.buyer_phone)!,
    (d) => `${d} · ${DDD_REGION[d] ?? `DDD ${d}`}`,
  ).slice(0, 10);

  return {
    products,
    revenue,
    net,
    sales: paid.length,
    ticket: paid.length ? revenue / paid.length : 0,
    refunds: refunded.length,
    refundRate: settled ? refunded.length / settled : 0,
    series: { granularity, points },
    byState,
    unknownState,
    topRegions,
    byProduct: group(paid, (r) => r.product_id ?? "", (k) => productName.get(k) ?? "Produto não identificado"),
    byOrigin: group(paid, (r) => r.src ?? "", (k) => k || "Sem origem registrada").slice(0, 10),
    byPayment: group(paid, (r) => r.payment_type ?? "", (k) => PAYMENT_LABELS[k] ?? (k || "Não informado")),
    recent: rows.slice(0, 15).map((r) => ({ ...r, productName: productName.get(r.product_id ?? "") ?? "—" })),
    hasAnySale: rows.length > 0,
  };
}
