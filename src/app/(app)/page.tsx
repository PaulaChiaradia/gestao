import { BarChart3, Camera, Mail, Megaphone, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";

const KPIS = [
  { label: "Faturamento no mês", source: "Hotmart" },
  { label: "Vendas no mês", source: "Hotmart" },
  { label: "Investimento em anúncios", source: "Meta Ads" },
  { label: "Retorno sobre anúncios (ROAS)", source: "Hotmart + Meta" },
  { label: "Conversas abertas", source: "WhatsApp + Instagram" },
  { label: "Novos seguidores", source: "Instagram" },
];

const INTEGRATIONS = [
  { name: "Hotmart", detail: "Vendas, reembolsos e origem das compras", icon: BarChart3 },
  { name: "Meta Ads", detail: "Campanhas, gastos e alcance por estado", icon: Megaphone },
  { name: "Instagram", detail: "Posts, Reels, Stories, público e Direct", icon: Camera },
  { name: "WhatsApp Business", detail: "Atendimento e robô de respostas", icon: MessageCircle },
  { name: "E-mail", detail: "Mensagens recebidas no atendimento", icon: Mail },
];

export default async function PainelPage() {
  const user = await getCurrentUser();
  const firstName = user?.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Olá, ${firstName}`} description="Visão geral do negócio em um só lugar." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-2 font-display text-3xl text-muted/60">—</p>
            <p className="mt-3 text-xs text-muted">Aguardando integração · {k.source}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl tracking-wide">Integrações</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {INTEGRATIONS.map(({ name, detail, icon: Icon }) => (
            <li key={name} className="flex items-center gap-4 px-5 py-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sand">
                <Icon className="size-5 text-accent" />
              </span>
              <div className="flex-1">
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted">{detail}</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">Não conectado</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
