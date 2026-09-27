"use client";

import { useState } from "react";
import { formatBRL, formatBRLCompact, formatInt } from "@/lib/format";

type Point = { key: string; label: string; revenue: number; count: number };

function niceMax(v: number) {
  if (v <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v / 1)!;
  return step * pow;
}

/** Faturamento no tempo: colunas finas de uma série, hover por coluna com valor e quantidade. */
export function ColumnChart({ points, height = 220 }: { points: Point[]; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.revenue), 0));
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.ceil(points.length / 8);
  const hovered = active !== null ? points[active] : null;

  return (
    <div className="relative">
      <div className="flex" style={{ height }}>
        {/* Eixo Y */}
        <div className="flex w-16 shrink-0 flex-col justify-between pr-2 text-right text-[11px] tabular-nums text-muted">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatBRLCompact(t)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {ticks.map((t, i) => (
            <div
              key={t}
              className="absolute inset-x-0 h-px bg-[var(--grid)]"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
            {points.map((p, i) => (
              <button
                key={p.key}
                type="button"
                className="flex h-full flex-1 items-end justify-center focus:outline-none"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${p.label}: ${formatBRL(p.revenue)}, ${p.count} vendas`}
              >
                <span
                  className="block w-full max-w-6 rounded-t-[4px] bg-[var(--series-1)] transition-opacity"
                  style={{
                    height: p.revenue > 0 ? `max(${(p.revenue / max) * 100}%, 2px)` : 0,
                    opacity: active === null || active === i ? 1 : 0.45,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Eixo X */}
      <div className="ml-16 mt-2 flex text-[11px] text-muted">
        {points.map((p, i) => (
          <span key={p.key} className="flex-1 text-center tabular-nums">
            {i % labelEvery === 0 ? p.label : ""}
          </span>
        ))}
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg"
          style={{ left: `calc(4rem + (100% - 4rem) * ${(active! + 0.5) / points.length})` }}
        >
          <p className="font-semibold tabular-nums">{formatBRL(hovered.revenue)}</p>
          <p className="text-xs text-muted">
            {hovered.label} · {formatInt(hovered.count)} {hovered.count === 1 ? "venda" : "vendas"}
          </p>
        </div>
      )}
    </div>
  );
}
