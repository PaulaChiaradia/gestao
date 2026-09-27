import { StatTile } from "@/components/charts/stat-tile";
import { PageHeader } from "@/components/page-header";
import { requireArea } from "@/lib/auth";
import { formatBRL, formatInt, formatPct } from "@/lib/format";
import { OPEN_STAGES, type Opportunity } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";
import { Board } from "./board";

export const metadata = { title: "Palestras e treinamentos | Paula Chiaradia" };

export default async function PipelinePage() {
  const user = await requireArea("pipeline");
  const supabase = await createClient();
  const { data } = await supabase.from("opportunities").select("*").order("updated_at", { ascending: false });
  const items = (data ?? []) as Opportunity[];

  const open = items.filter((o) => OPEN_STAGES.includes(o.stage));
  const year = new Date().getFullYear();
  const wonThisYear = items.filter((o) => o.stage === "fechado" && new Date(o.stage_changed_at).getFullYear() === year);
  const decided = items.filter((o) => o.stage === "fechado" || o.stage === "perdido");
  const winRate = decided.length ? decided.filter((o) => o.stage === "fechado").length / decided.length : 0;
  const sum = (list: Opportunity[]) => list.reduce((s, o) => s + Number(o.value ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Palestras e treinamentos"
        description="Solicitações de palestras, treinamentos e consultorias, do primeiro contato ao fechamento."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Em negociação" value={formatInt(open.length)} hint={`${formatBRL(sum(open))} em propostas`} />
        <StatTile label={`Fechados em ${year}`} value={formatInt(wonThisYear.length)} hint={formatBRL(sum(wonThisYear))} />
        <StatTile label="Taxa de fechamento" value={formatPct(winRate)} hint="Fechados ÷ (fechados + perdidos)" />
        <StatTile
          label="Público alcançado"
          value={formatInt(wonThisYear.reduce((s, o) => s + (o.audience ?? 0), 0))}
          hint={`Participantes em eventos fechados em ${year}`}
        />
      </section>

      <Board items={items} canDelete={user.role === "admin" || user.role === "gestor"} />
    </>
  );
}
