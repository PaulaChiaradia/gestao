"use client";

import { useState } from "react";
import { UF_NAMES, UF_TILES, type UF } from "@/lib/brazil";
import { formatBRL, formatInt } from "@/lib/format";

type Data = Record<UF, { revenue: number; count: number }>;

const STEPS = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)"];
// Passos 1–2 são claros: texto escuro; 3–5 escuros: texto branco
const TEXT_ON = ["#1c1b19", "#1c1b19", "#ffffff", "#ffffff", "#ffffff"];

/** Mapa em grade: cada estado é um quadrado igual, cor proporcional ao faturamento (5 faixas). */
export function BrazilMap({ data }: { data: Data }) {
  const [active, setActive] = useState<UF | null>(null);
  const max = Math.max(...Object.values(data).map((d) => d.revenue), 0);
  const step = (v: number) => (v <= 0 || max <= 0 ? -1 : Math.min(4, Math.floor((v / max) * 5 - 1e-9)));

  const cols = 6;
  const rows = 8;
  const hovered = active ? data[active] : null;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div
        className="relative grid w-full max-w-[300px] gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
        onMouseLeave={() => setActive(null)}
      >
        {(Object.keys(UF_TILES) as UF[]).map((uf) => {
          const [c, r] = UF_TILES[uf];
          const s = step(data[uf].revenue);
          return (
            <button
              key={uf}
              type="button"
              onMouseEnter={() => setActive(uf)}
              onFocus={() => setActive(uf)}
              onBlur={() => setActive(null)}
              aria-label={`${UF_NAMES[uf]}: ${formatBRL(data[uf].revenue)}, ${data[uf].count} vendas`}
              className="aspect-square rounded-[4px] text-[11px] font-medium outline-offset-2 transition-transform hover:scale-105"
              style={{
                gridColumn: c + 1,
                gridRow: r + 1,
                background: s < 0 ? "var(--seq-empty)" : STEPS[s],
                color: s < 0 ? "var(--muted)" : TEXT_ON[s],
              }}
            >
              {uf}
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="min-h-[52px] rounded-lg bg-background px-3 py-2">
          {active && hovered ? (
            <>
              <p className="text-sm text-muted">{UF_NAMES[active]}</p>
              <p className="font-semibold tabular-nums">
                {formatBRL(hovered.revenue)}
                <span className="ml-2 whitespace-nowrap text-xs font-normal text-muted">
                  {formatInt(hovered.count)} {hovered.count === 1 ? "venda" : "vendas"}
                </span>
              </p>
            </>
          ) : (
            <p className="py-2 text-sm text-muted">Passe o mouse sobre um estado.</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs text-muted">Faturamento</p>
          <div className="flex gap-[2px]">
            <span className="h-2.5 flex-1 rounded-l-[4px] bg-[var(--seq-empty)]" title="Sem vendas" />
            {STEPS.map((s, i) => (
              <span key={s} className={`h-2.5 flex-1 ${i === 4 ? "rounded-r-[4px]" : ""}`} style={{ background: s }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>Sem vendas</span>
            <span className="tabular-nums">{max > 0 ? formatBRL(max) : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
