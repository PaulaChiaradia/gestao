import "server-only";
import { createClient } from "@/lib/supabase/server";
import { commissionBRL, PAID_STATUSES, saleBRL } from "./sales";

export type YearStats = {
  year: number;
  sales: number;
  revenue: number;
  net: number;
  /** Faturamento e vendas por mês (índice 0 = janeiro). */
  monthlyRevenue: number[];
  monthlySales: number[];
  /** Até a mesma data do ano atual (dia/mês de hoje), para comparação justa. */
  ytdRevenue: number;
  ytdSales: number;
};

export type YearlySummary = {
  years: YearStats[];
  currentYear: number;
  /** Mês atual (0–11) e dia de hoje, no fuso de São Paulo. */
  currentMonth: number;
  today: number;
  bestMonth: { year: number; month: number; sales: number; revenue: number } | null;
};

const TZ = "America/Sao_Paulo";
function ymd(iso: string) {
  const [y, m, d] = new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number);
  return { y, m: m - 1, d };
}

export async function getYearlySummary(productId?: string): Promise<YearlySummary> {
  const supabase = await createClient();
  type Row = { order_date: string | null; price: number | null; currency: string | null; gross_brl: number | null; commission_brl: number | null; producer_commission: number | null };
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from("hotmart_sales")
      .select("order_date, price, currency, gross_brl, commission_brl, producer_commission")
      .in("status", PAID_STATUSES)
      .not("order_date", "is", null)
      .order("order_date")
      .order("transaction")
      .range(from, from + 999);
    if (productId) q = q.eq("product_id", productId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }

  const now = ymd(new Date().toISOString());
  const byYear = new Map<number, YearStats>();
  for (const r of rows) {
    const { y, m, d } = ymd(r.order_date!);
    let s = byYear.get(y);
    if (!s) {
      s = { year: y, sales: 0, revenue: 0, net: 0, monthlyRevenue: Array(12).fill(0), monthlySales: Array(12).fill(0), ytdRevenue: 0, ytdSales: 0 };
      byYear.set(y, s);
    }
    const value = saleBRL(r);
    s.sales += 1;
    s.revenue += value;
    s.net += commissionBRL(r);
    s.monthlyRevenue[m] += value;
    s.monthlySales[m] += 1;
    if (m < now.m || (m === now.m && d <= now.d)) {
      s.ytdRevenue += value;
      s.ytdSales += 1;
    }
  }

  const years = [...byYear.values()].sort((a, b) => a.year - b.year);
  let bestMonth: YearlySummary["bestMonth"] = null;
  for (const s of years) {
    s.monthlySales.forEach((n, m) => {
      if (!bestMonth || n > bestMonth.sales) bestMonth = { year: s.year, month: m, sales: n, revenue: s.monthlyRevenue[m] };
    });
  }
  return { years, currentYear: now.y, currentMonth: now.m, today: now.d, bestMonth };
}
