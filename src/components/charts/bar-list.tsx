import { formatBRL, formatInt } from "@/lib/format";

type Item = { key: string; label: string; revenue: number; count: number };

/** Barras horizontais de uma série só: valor no fim da barra, quantidade em texto secundário. */
export function BarList({ items, empty = "Sem dados no período." }: { items: Item[]; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.revenue), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              {formatBRL(item.revenue)}
              <span className="ml-2 text-xs text-muted">
                {formatInt(item.count)} {item.count === 1 ? "venda" : "vendas"}
              </span>
            </span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-transparent">
            <div
              className="h-full rounded-r-[4px] bg-[var(--series-1)] transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max((item.revenue / max) * 100, 1.5)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
