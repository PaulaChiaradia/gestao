"use server";

import { requireArea } from "@/lib/auth";
import { DDD_REGION, dddOf } from "@/lib/brazil";
import { PAID_STATUSES, saleBRL } from "@/lib/hotmart/sales";
import { createClient } from "@/lib/supabase/server";
import { channelLabel } from "@/lib/tracking";

export type SplitEntry = { source: string; name: string | null; value_brl: number | null; mine?: boolean };

export type SaleDetail = {
  transaction: string;
  status: string;
  productName: string;
  offerCode: string | null;
  offerPaymentMode: string | null;
  couponCode: string | null;
  orderDate: string | null;
  approvedDate: string | null;
  warrantyExpireDate: string | null;
  refundedAt: string | null;
  paymentMethod: string | null;
  paymentType: string | null;
  installments: number | null;
  isSubscription: boolean;
  recurrencyNumber: number | null;
  grossBrl: number;
  totalPaidBrl: number | null;
  installmentFeeBrl: number | null;
  hotmartFeeBrl: number | null;
  hotmartFeePercentage: number | null;
  commissionBrl: number | null;
  currency: string | null;
  priceOriginal: number | null;
  conversionRate: number | null;
  split: SplitEntry[];
  buyer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    region: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
    country: string | null;
    locale: string | null;
    geoSource: string | null;
    contactId: string | null;
  };
  origin: { src: string | null; sck: string | null; externalCode: string | null; linkLabel: string | null };
  history: { transaction: string; date: string | null; product: string; status: string; value: number }[];
  historyPaidTotal: number;
  historyPaidCount: number;
};

type Row = Record<string, unknown> & { product: { name: string; short_name: string | null } | null };

export async function getSaleDetail(transaction: string): Promise<SaleDetail | null> {
  await requireArea("vendas");
  const supabase = await createClient();

  const { data } = await supabase
    .from("hotmart_sales")
    .select("*, product:hotmart_products(name, short_name)")
    .eq("transaction", transaction)
    .maybeSingle();
  if (!data) return null;
  const s = data as Row;
  const str = (k: string) => (s[k] as string | null) ?? null;
  const num = (k: string) => (s[k] == null ? null : Number(s[k]));

  // Outras compras da mesma pessoa (pelo e-mail ou pelo código Hotmart do comprador)
  const email = str("buyer_email");
  const ucode = str("buyer_ucode");
  const filters = [email && `buyer_email.eq."${email}"`, ucode && `buyer_ucode.eq."${ucode}"`].filter(Boolean).join(",");
  const { data: others } = filters
    ? await supabase
        .from("hotmart_sales")
        .select("transaction, status, order_date, price, currency, gross_brl, product:hotmart_products(name, short_name)")
        .or(filters)
        .order("order_date", { ascending: false })
        .limit(50)
    : { data: [] };

  const history = ((others ?? []) as unknown as Row[]).map((o) => ({
    transaction: o.transaction as string,
    date: (o.order_date as string) ?? null,
    product: o.product?.short_name || o.product?.name || "—",
    status: o.status as string,
    value: saleBRL(o as unknown as { gross_brl: number | null; price: number | null; currency: string | null }),
  }));
  const paid = history.filter((h) => PAID_STATUSES.includes(h.status));

  // Nome amigável do link rastreado, quando a origem veio de um link criado no sistema
  let linkLabel: string | null = null;
  if (str("src")) {
    let q = supabase.from("tracked_links").select("label").eq("channel", str("src")!).limit(1);
    q = str("sck") ? q.eq("campaign", str("sck")!) : q.is("campaign", null);
    const { data: link } = await q.maybeSingle();
    linkLabel = link?.label ?? channelLabel(str("src")!);
  }

  const phone = str("buyer_phone");
  const ddd = dddOf(phone);

  return {
    transaction: s.transaction as string,
    status: s.status as string,
    productName: s.product?.name ?? "—",
    offerCode: str("offer_code"),
    offerPaymentMode: str("offer_payment_mode"),
    couponCode: str("coupon_code"),
    orderDate: str("order_date"),
    approvedDate: str("approved_date"),
    warrantyExpireDate: str("warranty_expire_date"),
    refundedAt: str("refunded_at"),
    paymentMethod: str("payment_method"),
    paymentType: str("payment_type"),
    installments: num("installments"),
    isSubscription: !!s.is_subscription,
    recurrencyNumber: num("recurrency_number"),
    grossBrl: saleBRL(s as unknown as { gross_brl: number | null; price: number | null; currency: string | null }),
    totalPaidBrl: num("total_paid_brl"),
    installmentFeeBrl: num("installment_fee_brl"),
    hotmartFeeBrl: num("hotmart_fee_brl"),
    hotmartFeePercentage: num("hotmart_fee_percentage"),
    commissionBrl: num("commission_brl"),
    currency: str("currency"),
    priceOriginal: num("price"),
    conversionRate: num("conversion_rate"),
    split: ((s.commissions as SplitEntry[] | null) ?? []).map((c) => ({ ...c, value_brl: c.value_brl == null ? null : Number(c.value_brl) })),
    buyer: {
      name: str("buyer_name"),
      email,
      phone,
      region: ddd ? `${ddd} · ${DDD_REGION[ddd] ?? `DDD ${ddd}`}` : null,
      city: str("city"),
      state: str("state"),
      zipcode: str("zipcode"),
      country: str("country"),
      locale: str("buyer_locale"),
      geoSource: str("geo_source"),
      contactId: str("contact_id"),
    },
    origin: { src: str("src"), sck: str("sck"), externalCode: str("external_code"), linkLabel },
    history,
    historyPaidTotal: paid.reduce((sum, h) => sum + h.value, 0),
    historyPaidCount: paid.length,
  };
}
