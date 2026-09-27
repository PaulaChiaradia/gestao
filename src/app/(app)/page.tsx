import { BarChart3, Camera, Mail, Megaphone, MessageCircle, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { formatBRL, formatDate, formatInt } from "@/lib/format";
import { PAID_STATUSES, saleBRL } from "@/lib/hotmart/sales";
import { canAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const INTEGRATION_INFO: Record<string, { detail: string; icon: LucideIcon }> = {
  hotmart: { detail: "Vendas, reembolsos e origem das compras", icon: BarChart3 },
  meta_ads: { detail: "Campanhas, gastos e alcance por estado", icon: Megaphone },
  instagram: { detail: "Posts, Reels, Stories, público e Direct", icon: Camera },
  whatsapp: { detail: "Atendimento e robô de respostas", icon: MessageCircle },
  email: { detail: "Mensagens recebidas no atendimento", icon: Mail },
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  conectado: { label: "Conectado", className: "border-accent/30 bg-accent/10 text-accent" },
  erro: { label: "Com erro", className: "border-danger/30 bg-danger/10 text-danger" },
  desconectado: { label: "Não conectado", className: "border-border text-muted" },
};

export default async function PainelPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const firstName = user?.name.split(" ")[0];
  const seesSales = user ? canAccess(user.role, "vendas") : false;

  // Mês corrente no fuso de São Paulo
  const now = new Date();
  const ym = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
  const monthStart = new Date(`${ym}-01T00:00:00-03:00`).toISOString();

  const [{ data: integrations }, { data: monthSales }] = await Promise.all([
    supabase.from("integrations").select("key, name, status, last_event_at").order("key"),
    seesSales
      ? supabase.from("hotmart_sales").select("price, currency, gross_brl").in("status", PAID_STATUSES).gte("order_date", monthStart)
      : Promise.resolve({ data: null }),
  ]);

  const hotmartOn = integrations?.some((i) => i.key === "hotmart" && i.status === "conectado");
  const monthRevenue = monthSales?.reduce((s, r) => s + saleBRL(r), 0) ?? 0;

  const kpis = [
    {
      label: "Faturamento no mês",
      source: "Hotmart",
      value: seesSales && hotmartOn ? formatBRL(monthRevenue) : null,
    },
    {
      label: "Vendas no mês",
      source: "Hotmart",
      value: seesSales && hotmartOn ? formatInt(monthSales?.length ?? 0) : null,
    },
    { label: "Investimento em anúncios", source: "Meta Ads", value: null },
    { label: "Retorno sobre anúncios (ROAS)", source: "Hotmart + Meta", value: null },
    { label: "Conversas abertas", source: "WhatsApp + Instagram", value: null },
    { label: "Novos seguidores", source: "Instagram", value: null },
  ];

  const order = ["hotmart", "meta_ads", "instagram", "whatsapp", "email"];
  const sortedIntegrations = [...(integrations ?? [])].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return (
    <>
      <PageHeader title={`Olá, ${firstName}`} description="Visão geral do negócio em um só lugar." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">{k.label}</p>
            <p className={`mt-2 text-[28px] font-semibold leading-tight ${k.value ? "" : "text-muted/50"}`}>
              {k.value ?? "—"}
            </p>
            <p className="mt-3 text-xs text-muted">{k.value ? k.source : `Aguardando integração · ${k.source}`}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl tracking-wide">Integrações</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {sortedIntegrations.map((i) => {
            const info = INTEGRATION_INFO[i.key];
            const status = STATUS_STYLE[i.status] ?? STATUS_STYLE.desconectado;
            const Icon = info?.icon ?? BarChart3;
            return (
              <li key={i.key} className="flex items-center gap-4 px-5 py-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-sand">
                  <Icon className="size-5 text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-sm text-muted">
                    {info?.detail}
                    {i.last_event_at && ` · último evento em ${formatDate(i.last_event_at)}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${status.className}`}>{status.label}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
