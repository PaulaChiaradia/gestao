import Link from "next/link";
import { Info } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { BrazilMap } from "@/components/charts/brazil-map";
import { ColumnChart } from "@/components/charts/column-chart";
import { ChartCard, StatTile } from "@/components/charts/stat-tile";
import { PageHeader } from "@/components/page-header";
import { requireArea } from "@/lib/auth";
import { UF_NAMES, type UF } from "@/lib/brazil";
import { formatBRL, formatDate, formatInt, formatPct } from "@/lib/format";
import { getSalesSummary, PAID_STATUSES, PERIODS, REFUND_STATUSES, type PeriodKey } from "@/lib/hotmart/sales";

export const metadata = { title: "Vendas | Paula Chiaradia" };

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovada",
  COMPLETE: "Concluída",
  REFUNDED: "Reembolsada",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  CHARGEBACK: "Chargeback",
  CANCELED: "Cancelada",
  WAITING_PAYMENT: "Aguardando pagamento",
  BILLET_PRINTED: "Boleto gerado",
  EXPIRED: "Expirada",
  DELAYED: "Atrasada",
  PROTESTED: "Em disputa",
};

export default async function VendasPage({ searchParams }: PageProps<"/vendas">) {
  await requireArea("vendas");
  const sp = await searchParams;
  const period = (typeof sp.periodo === "string" && sp.periodo in PERIODS ? sp.periodo : "30d") as PeriodKey;
  const product = typeof sp.produto === "string" ? sp.produto : undefined;

  const s = await getSalesSummary(period, product);
  const href = (p: Partial<{ periodo: string; produto: string }>) => {
    const q = new URLSearchParams({ periodo: period, ...(product ? { produto: product } : {}), ...p });
    if (p.produto === "") q.delete("produto");
    return `/vendas?${q}`;
  };

  const states = (Object.keys(s.byState) as UF[])
    .filter((uf) => s.byState[uf].count > 0)
    .map((uf) => ({ key: uf, label: UF_NAMES[uf], ...s.byState[uf] }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <PageHeader title="Vendas Hotmart" description="Vendas dos infoprodutos, por produto, região e origem." />

      {/* Filtros: uma linha, acima de tudo o que eles afetam */}
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex flex-wrap rounded-lg border border-border bg-surface p-0.5">
          <Link
            href={href({ produto: "" })}
            className={`rounded-md px-3 py-1.5 text-sm ${!product ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
          >
            Todos os produtos
          </Link>
          {s.products.map((p) => (
            <Link
              key={p.id}
              href={href({ produto: p.id })}
              className={`rounded-md px-3 py-1.5 text-sm ${product === p.id ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      </div>

      {!s.hasAnySale && (
        <div className="flex gap-3 rounded-2xl border border-border bg-sand/60 p-5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" />
          <p>
            Nenhuma venda neste período ainda. As vendas aparecem aqui automaticamente assim que a Hotmart estiver
            conectada. O histórico anterior é importado na ativação.
          </p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Faturamento" value={formatBRL(s.revenue)} hint="Valor pago pelos compradores" />
        <StatTile label="Receita líquida" value={formatBRL(s.net)} hint="Após taxas e comissões" />
        <StatTile label="Vendas" value={formatInt(s.sales)} hint="Aprovadas e concluídas" />
        <StatTile label="Ticket médio" value={formatBRL(s.ticket)} />
        <StatTile label="Reembolsos" value={formatInt(s.refunds)} hint={`${formatPct(s.refundRate)} das vendas`} />
      </section>

      <ChartCard title="Faturamento" subtitle={`Por ${s.series.granularity}, vendas aprovadas`}>
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
        <ChartCard title="Cidades com mais vendas" subtitle="Quando o comprador informa o endereço">
          <BarList items={s.topCities} />
        </ChartCard>
        <ChartCard title="Origem das vendas" subtitle="Parâmetro src dos links rastreados">
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
        {s.recent.length ? (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-5 py-2 font-normal sm:px-6">Data</th>
                  <th className="px-3 py-2 font-normal">Comprador</th>
                  <th className="px-3 py-2 font-normal">Produto</th>
                  <th className="px-3 py-2 font-normal">Local</th>
                  <th className="px-3 py-2 font-normal">Situação</th>
                  <th className="px-5 py-2 text-right font-normal sm:px-6">Valor</th>
                </tr>
              </thead>
              <tbody>
                {s.recent.map((r) => (
                  <tr key={r.transaction} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 tabular-nums sm:px-6">{formatDate(r.order_date)}</td>
                    <td className="px-3 py-2.5">{r.buyer_name ?? "—"}</td>
                    <td className="px-3 py-2.5">{r.productName}</td>
                    <td className="px-3 py-2.5 text-muted">
                      {[r.city, r.state].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          PAID_STATUSES.includes(r.status)
                            ? "bg-accent/10 text-accent"
                            : REFUND_STATUSES.includes(r.status)
                              ? "bg-danger/10 text-danger"
                              : "bg-sand text-muted"
                        }`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums sm:px-6">{formatBRL(Number(r.price ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Nenhuma transação no período.</p>
        )}
      </ChartCard>
    </div>
  );
}
