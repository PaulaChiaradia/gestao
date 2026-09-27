import Link from "next/link";
import { BarChart3, CalendarRange, Info, Map as MapIcon } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { BrazilMap } from "@/components/charts/brazil-map";
import { ColumnChart } from "@/components/charts/column-chart";
import { SalesMap } from "@/components/charts/sales-map";
import { YearComparison } from "@/components/charts/year-comparison";
import { getYearlySummary } from "@/lib/hotmart/yearly";
import { ChartCard, StatTile } from "@/components/charts/stat-tile";
import { PageHeader } from "@/components/page-header";
import { ProductFilter } from "./product-filter";
import { SalesTable } from "./sale-detail";
import { requireArea } from "@/lib/auth";
import { UF_NAMES, type UF } from "@/lib/brazil";
import { formatBRL, formatInt, formatPct } from "@/lib/format";
import { getSalesSummary, PERIODS, type PeriodKey } from "@/lib/hotmart/sales";

export const metadata = { title: "Vendas | Paula Chiaradia" };

export default async function VendasPage({
  searchParams,
}: PageProps<"/vendas">) {
  await requireArea("vendas");
  const sp = await searchParams;
  const period = (
    typeof sp.periodo === "string" && sp.periodo in PERIODS ? sp.periodo : "30d"
  ) as PeriodKey;
  const product = typeof sp.produto === "string" ? sp.produto : undefined;
  const view =
    sp.visao === "mapa" || sp.visao === "anos" ? sp.visao : "indicadores";

  const [s, yearly] = await Promise.all([
    getSalesSummary(period, product),
    view === "anos" ? getYearlySummary(product) : Promise.resolve(null),
  ]);
  const href = (
    p: Partial<{ periodo: string; produto: string; visao: string }>,
  ) => {
    const q = new URLSearchParams({
      periodo: period,
      ...(product ? { produto: product } : {}),
      ...(view !== "indicadores" ? { visao: view } : {}),
      ...p,
    });
    if (p.produto === "") q.delete("produto");
    if (p.visao === "indicadores") q.delete("visao");
    return `/vendas?${q}`;
  };

  const states = (Object.keys(s.byState) as UF[])
    .filter((uf) => s.byState[uf].count > 0)
    .map((uf) => ({ key: uf, label: UF_NAMES[uf], ...s.byState[uf] }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas Hotmart"
        description="Vendas dos infoprodutos, por produto, região e origem."
      />

      {/* Filtros: uma linha, acima de tudo o que eles afetam */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-lg border border-border bg-surface p-0.5"
          role="group"
          aria-label="Visão"
        >
          {(
            [
              ["indicadores", "Indicadores", BarChart3],
              ["mapa", "Mapa", MapIcon],
              ["anos", "Ano a ano", CalendarRange],
            ] as const
          ).map(([value, label, Icon]) => (
            <Link
              key={value}
              href={href({ visao: value })}
              aria-current={view === value ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${view === value ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>
        {/* A comparação anual cobre todos os anos: o filtro de período não se aplica */}
        {view !== "anos" && (
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
              <Link
                key={k}
                href={href({ periodo: k })}
                className={`rounded-md px-3 py-1.5 text-sm ${k === period ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
              >
                {PERIODS[k].label}
              </Link>
            ))}
          </div>
        )}
        <ProductFilter products={s.products} value={product} />
      </div>

      {view === "anos" && yearly ? (
        <YearComparison {...yearly} />
      ) : (
        <>
          {!s.hasAnySale && (
            <div className="flex gap-3 rounded-2xl border border-border bg-sand/60 p-5 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" />
              <p>
                Nenhuma venda neste período ainda. As vendas aparecem aqui
                automaticamente assim que a Hotmart estiver conectada. O
                histórico anterior é importado na ativação.
              </p>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Faturamento"
              value={formatBRL(s.revenue)}
              hint="Valor das vendas, sem juros do parcelamento"
            />
            <StatTile
              label="Receita líquida"
              value={formatBRL(s.net)}
              hint="Sua parte, após taxa Hotmart e coprodução"
            />
            <StatTile
              label="Vendas"
              value={formatInt(s.sales)}
              hint="Aprovadas e concluídas"
            />
            <StatTile label="Ticket médio" value={formatBRL(s.ticket)} />
            <StatTile
              label="Reembolsos"
              value={formatInt(s.refunds)}
              hint={`${formatPct(s.refundRate)} das vendas`}
            />
          </section>

          {view === "mapa" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <ChartCard
                title="Onde as vendas acontecem"
                subtitle="Faturamento por região, no período e produto selecionados"
              >
                <SalesMap
                  points={s.mapPoints}
                  withoutLocation={s.withoutLocation}
                />
              </ChartCard>
              <ChartCard
                title="Regiões com mais vendas"
                subtitle="Pelo DDD do celular do comprador"
              >
                <BarList items={s.topRegions} />
              </ChartCard>
            </div>
          ) : (
            <>
              <ChartCard
                title="Faturamento"
                subtitle={`Por ${s.series.granularity}, vendas aprovadas`}
              >
                <ColumnChart points={s.series.points} />
              </ChartCard>

              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                  title="Vendas por estado"
                  subtitle={
                    s.unknownState
                      ? `${formatInt(s.unknownState)} ${s.unknownState === 1 ? "venda" : "vendas"} sem estado identificado`
                      : "Pelo endereço do comprador ou DDD do telefone"
                  }
                >
                  <BrazilMap data={s.byState} />
                </ChartCard>
                <ChartCard title="Ranking de estados">
                  <BarList items={states.slice(0, 10)} />
                </ChartCard>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                  title="Regiões com mais vendas"
                  subtitle="Pelo DDD do celular do comprador"
                >
                  <BarList items={s.topRegions} />
                </ChartCard>
                <ChartCard
                  title="Origem das vendas"
                  subtitle="Parâmetro src dos links rastreados"
                >
                  <BarList items={s.byOrigin} />
                </ChartCard>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="Produtos">
                  <BarList items={s.byProduct} />
                </ChartCard>
                <ChartCard title="Forma de pagamento">
                  <BarList items={s.byPayment} />
                </ChartCard>
              </div>

              <ChartCard title="Últimas transações">
                <SalesTable rows={s.recent} />
              </ChartCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
