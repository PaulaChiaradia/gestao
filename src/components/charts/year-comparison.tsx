"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  formatBRL,
  formatBRLCompact,
  formatInt,
  formatPct,
} from "@/lib/format";
import { ChartCard, StatTile } from "./stat-tile";
import { ColumnChart } from "./column-chart";

type YearStats = {
  year: number;
  sales: number;
  revenue: number;
  net: number;
  monthlyRevenue: number[];
  monthlySales: number[];
  ytdRevenue: number;
  ytdSales: number;
};
type Props = {
  years: YearStats[];
  currentYear: number;
  currentMonth: number;
  today: number;
  bestMonth: {
    year: number;
    month: number;
    sales: number;
    revenue: number;
  } | null;
};

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
// Três cores validadas para daltonismo (todas as combinações); cada cor fica presa a um ano escolhido
const SLOT_COLORS = ["#528a4a", "#2a78d6", "#e87ba4"];

function niceMax(v: number) {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].find((s) => s * pow >= v)! * pow;
}

function Delta({ now, before }: { now: number; before: number }) {
  if (!before)
    return <span className="text-muted">sem vendas para comparar</span>;
  const d = (now - before) / before;
  const up = d >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium ${up ? "text-[#006300]" : "text-danger"}`}
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {formatPct(d)}
    </span>
  );
}

export function YearComparison({
  years,
  currentYear,
  currentMonth,
  today,
  bestMonth,
}: Props) {
  const byYear = useMemo(() => new Map(years.map((y) => [y.year, y])), [years]);
  const current = byYear.get(currentYear);
  const previous = byYear.get(currentYear - 1);
  const pastBest = [...years]
    .filter((y) => y.year < currentYear)
    .sort((a, b) => b.ytdRevenue - a.ytdRevenue)[0];
  const cutoff = `até ${String(today).padStart(2, "0")}/${String(currentMonth + 1).padStart(2, "0")}`;

  // Padrão: ano atual, ano anterior e o melhor ano anterior (se diferente)
  const initial = [currentYear, currentYear - 1, pastBest?.year].filter(
    (y, i, a) => y && byYear.has(y) && a.indexOf(y) === i,
  );
  const [slots, setSlots] = useState<(number | null)[]>(() => [
    initial[0] ?? null,
    initial[1] ?? null,
    initial[2] ?? null,
  ]);
  const [metric, setMetric] = useState<"revenue" | "sales">("revenue");
  const [mode, setMode] = useState<"mensal" | "acumulado">("acumulado");

  function toggle(year: number) {
    setSlots((s) => {
      const at = s.indexOf(year);
      if (at >= 0) return s.map((v, i) => (i === at ? null : v)); // tira o ano, os outros mantêm a cor
      const free = s.indexOf(null);
      if (free < 0) return s; // já há 3 anos escolhidos
      return s.map((v, i) => (i === free ? year : v));
    });
  }

  const series = slots
    .map((year, slot) => ({ year, slot }))
    .filter(
      (x): x is { year: number; slot: number } =>
        x.year != null && byYear.has(x.year),
    )
    .map(({ year, slot }) => {
      const s = byYear.get(year)!;
      const raw = metric === "revenue" ? s.monthlyRevenue : s.monthlySales;
      const lastMonth = year === currentYear ? currentMonth : 11; // ano atual para no mês corrente
      let acc = 0;
      const values = raw
        .slice(0, lastMonth + 1)
        .map((v) => (mode === "acumulado" ? (acc += v) : v));
      return { year, color: SLOT_COLORS[slot], values };
    });

  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const fmt = (v: number) =>
    metric === "revenue"
      ? formatBRL(v)
      : `${formatInt(v)} ${v === 1 ? "venda" : "vendas"}`;
  const fmtAxis = (v: number) =>
    metric === "revenue" ? formatBRLCompact(v) : formatInt(v);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={`${currentYear} ${cutoff}`}
          value={formatBRL(current?.ytdRevenue ?? 0)}
          hint={`${formatInt(current?.ytdSales ?? 0)} vendas aprovadas`}
        />
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">
            Contra o mesmo período de {currentYear - 1}
          </p>
          <p className="mt-2 text-[28px] font-semibold leading-tight">
            {formatBRL(previous?.ytdRevenue ?? 0)}
          </p>
          <p className="mt-1.5 text-xs">
            <Delta
              now={current?.ytdRevenue ?? 0}
              before={previous?.ytdRevenue ?? 0}
            />{" "}
            <span className="text-muted">em {currentYear}</span>
          </p>
        </div>
        {pastBest && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">
              Contra {pastBest.year}, melhor ano anterior
            </p>
            <p className="mt-2 text-[28px] font-semibold leading-tight">
              {formatBRL(pastBest.ytdRevenue)}
            </p>
            <p className="mt-1.5 text-xs">
              <Delta
                now={current?.ytdRevenue ?? 0}
                before={pastBest.ytdRevenue}
              />{" "}
              <span className="text-muted">no mesmo período</span>
            </p>
          </div>
        )}
        {bestMonth && (
          <StatTile
            label="Melhor mês da história"
            value={`${MONTHS[bestMonth.month]}/${bestMonth.year}`}
            hint={`${formatInt(bestMonth.sales)} vendas · ${formatBRL(bestMonth.revenue)}`}
          />
        )}
      </section>

      <ChartCard
        title="Faturamento por ano"
        subtitle={`Vendas aprovadas · ${currentYear} parcial (${cutoff})`}
      >
        <ColumnChart
          points={years.map((y) => ({
            key: String(y.year),
            label: y.year === currentYear ? `${y.year}*` : String(y.year),
            revenue: y.revenue,
            count: y.sales,
          }))}
        />
      </ChartCard>

      <ChartCard title="Mês a mês" subtitle="Escolha até 3 anos para comparar">
        {/* Filtros do gráfico */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              ["revenue", "Faturamento"],
              ["sales", "Vendas"],
            ]}
          />
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              ["acumulado", "Acumulado no ano"],
              ["mensal", "Mensal"],
            ]}
          />
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => {
              const slot = slots.indexOf(y.year);
              const full = slot < 0 && !slots.includes(null);
              return (
                <button
                  key={y.year}
                  type="button"
                  onClick={() => toggle(y.year)}
                  disabled={full}
                  aria-pressed={slot >= 0}
                  title={
                    full
                      ? "Tire um ano para escolher outro (máximo 3)"
                      : undefined
                  }
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition disabled:opacity-40 ${
                    slot >= 0
                      ? "border-foreground bg-surface"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      background:
                        slot >= 0 ? SLOT_COLORS[slot] : "var(--border)",
                    }}
                  />
                  {y.year}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          {series.map((s) => (
            <span key={s.year} className="flex items-center gap-2">
              <span
                className="h-0.5 w-4 rounded"
                style={{ background: s.color }}
              />
              {s.year}
              {s.year === currentYear && (
                <span className="text-xs text-muted">({cutoff})</span>
              )}
            </span>
          ))}
        </div>

        <div className="relative flex h-72">
          <div className="flex w-16 shrink-0 flex-col justify-between pr-2 text-right text-[11px] tabular-nums text-muted">
            {[max, max / 2, 0].map((t) => (
              <span
                key={t}
                className="-translate-y-1/2 first:translate-y-0 last:translate-y-0"
              >
                {fmtAxis(t)}
              </span>
            ))}
          </div>
          <div
            className="relative mr-16 flex-1"
            onMouseLeave={() => setHover(null)}
          >
            {[0, 0.5, 1].map((p) => (
              <div
                key={p}
                className="absolute inset-x-0 h-px bg-[var(--grid)]"
                style={{ top: `${p * 100}%` }}
              />
            ))}
            <svg
              viewBox="0 0 1100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              {series.map((s) => (
                <polyline
                  key={s.year}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  points={s.values
                    .map((v, m) => `${m * 100},${100 - (v / max) * 100}`)
                    .join(" ")}
                />
              ))}
            </svg>
            {/* Marcador e rótulo no fim de cada linha (identidade sem depender só da cor) */}
            {series.map((s, i) => {
              const m = s.values.length - 1;
              if (m < 0) return null;
              const y = 100 - (s.values[m] / max) * 100;
              // Linhas que terminam no mesmo ponto: um rótulo só, com todos os anos
              const near = (o: (typeof series)[number]) =>
                o.values.length - 1 === m && Math.abs(100 - (o.values[m] / max) * 100 - y) < 7;
              const collides = series.slice(0, i).some(near);
              const sharedYears = [s.year, ...series.slice(i + 1).filter(near).map((o) => o.year)].join(" · ");
              return (
                <span key={s.year}>
                  <span
                    className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                    style={{
                      left: `${(m / 11) * 100}%`,
                      top: `${100 - (s.values[m] / max) * 100}%`,
                      background: s.color,
                    }}
                  />
                  {!collides && (
                    <span
                      className="absolute -translate-y-1/2 whitespace-nowrap pl-2 text-xs font-medium"
                      style={{
                        left: `${(m / 11) * 100}%`,
                        top: `${100 - (s.values[m] / max) * 100}%`,
                      }}
                    >
                      {sharedYears}
                    </span>
                  )}
                </span>
              );
            })}
            {/* Camada de hover: um alvo por mês */}
            <div className="absolute inset-0">
              {MONTHS.map((_, m) => (
                <button
                  key={m}
                  type="button"
                  aria-label={`${MONTHS[m]}: ${series.map((s) => `${s.year} ${s.values[m] != null ? fmt(s.values[m]) : "sem dado"}`).join(", ")}`}
                  className="absolute inset-y-0 focus:outline-none"
                  // alvo centrado no mês (os pontos ficam em m/11 da largura)
                  style={{
                    left: `${((m - 0.5) / 11) * 100}%`,
                    width: `${100 / 11}%`,
                  }}
                  onMouseEnter={() => setHover(m)}
                  onFocus={() => setHover(m)}
                  onBlur={() => setHover(null)}
                />
              ))}
            </div>
            {hover != null && (
              <>
                <div
                  className="pointer-events-none absolute inset-y-0 w-px bg-muted/40"
                  style={{ left: `${(hover / 11) * 100}%` }}
                />
                <div
                  className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg"
                  style={
                    hover > 7
                      ? {
                          right: `${100 - (hover / 11) * 100}%`,
                          marginRight: 12,
                        }
                      : { left: `${(hover / 11) * 100}%`, marginLeft: 12 }
                  }
                >
                  <p className="mb-1 text-xs text-muted">
                    {MONTHS[hover]} ·{" "}
                    {mode === "acumulado" ? "acumulado no ano" : "no mês"}
                  </p>
                  {series.map((s) => (
                    <p
                      key={s.year}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <span
                          className="h-0.5 w-3 rounded"
                          style={{ background: s.color }}
                        />
                        {s.year}
                      </span>
                      <strong className="tabular-nums">
                        {s.values[hover] != null ? fmt(s.values[hover]) : "—"}
                      </strong>
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="ml-16 mr-16 mt-2 flex justify-between text-[11px] text-muted">
          {MONTHS.map((m) => (
            <span key={m} className="w-0 text-center">
              <span className="-ml-3 inline-block w-6">{m}</span>
            </span>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Resumo por ano">
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-border">
                <th className="px-5 py-2 font-normal sm:px-6">Ano</th>
                <th className="px-3 py-2 text-right font-normal">Vendas</th>
                <th className="px-3 py-2 text-right font-normal">
                  Faturamento
                </th>
                <th className="px-3 py-2 text-right font-normal">Sua parte</th>
                <th className="px-3 py-2 text-right font-normal">
                  Ticket médio
                </th>
                <th className="px-5 py-2 text-right font-normal sm:px-6">
                  Faturamento vs. ano anterior
                </th>
              </tr>
            </thead>
            <tbody>
              {[...years].reverse().map((y) => {
                const prev = byYear.get(y.year - 1);
                return (
                  <tr
                    key={y.year}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-2.5 font-medium sm:px-6">
                      {y.year}
                      {y.year === currentYear && (
                        <span className="ml-1 text-xs font-normal text-muted">
                          ({cutoff})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatInt(y.sales)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatBRL(y.revenue)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatBRL(y.net)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatBRL(y.sales ? y.revenue / y.sales : 0)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-xs sm:px-6">
                      {y.year === currentYear ? (
                        <span className="text-muted">
                          <Delta
                            now={y.ytdRevenue}
                            before={prev?.ytdRevenue ?? 0}
                          />{" "}
                          no mesmo período
                        </span>
                      ) : prev ? (
                        <Delta now={y.revenue} before={prev.revenue} />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex rounded-lg border border-border bg-surface p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-md px-3 py-1.5 text-sm ${value === v ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
