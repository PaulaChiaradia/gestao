import { ChartCard } from "@/components/charts/stat-tile";
import { PageHeader } from "@/components/page-header";
import { requireArea } from "@/lib/auth";
import { BOT_MODELS } from "@/lib/bot";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeList, SettingsForm, TestChat, type Knowledge } from "./bot-ui";

export const metadata = { title: "Robô de atendimento | Paula Chiaradia" };

export default async function BotPage() {
  await requireArea("bot");
  const supabase = await createClient();
  const [{ data: settings }, { data: knowledge }] = await Promise.all([
    supabase.from("bot_settings").select("*").eq("id", 1).single(),
    supabase.from("bot_knowledge").select("*").order("sort").order("title"),
  ]);
  const apiReady = !!process.env.ANTHROPIC_API_KEY;

  return (
    <>
      <PageHeader
        title="Robô de atendimento"
        description="O que o assistente com IA sabe, como fala e quando passa a conversa para a equipe."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <ChartCard
            title="Base de conhecimento"
            subtitle="O robô responde somente com o que está aqui. Itens em amarelo foram montados a partir do Instagram e das páginas de venda e precisam de confirmação."
          >
            <KnowledgeList items={(knowledge ?? []) as Knowledge[]} />
          </ChartCard>

          {settings && (
            <ChartCard title="Comportamento">
              <SettingsForm settings={settings} models={BOT_MODELS} />
            </ChartCard>
          )}
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <ChartCard
            title="Testar o robô"
            subtitle="Conversa de teste com as configurações salvas. Nada é enviado a clientes."
          >
            <TestChat ready={apiReady} />
          </ChartCard>
        </div>
      </div>
    </>
  );
}
