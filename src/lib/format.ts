const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const int = new Intl.NumberFormat("pt-BR");
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export const formatBRL = (v: number) => brl.format(v);
export const formatBRLCompact = (v: number) => (Math.abs(v) >= 10_000 ? brlCompact.format(v) : brl.format(v));
export const formatInt = (v: number) => int.format(v);
export const formatPct = (v: number) => pct.format(v);

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** 5519981774841 → (19) 98177-4841 */
export function formatPhone(p: string | null) {
  if (!p) return null;
  const m = p.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${p}`;
}
