import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Atendimento | Paula Chiaradia" };

export default async function AtendimentoPage() {
  await requireArea("atendimento");
  return (
    <ModulePlaceholder
      title="Atendimento"
      description="WhatsApp, Direct do Instagram e e-mail em uma só caixa de entrada."
      stage="Etapa 4"
      features={[
        "Conversas de todos os canais em um só lugar",
        "Robô responde, qualifica e passa para a equipe quando necessário",
        "Etiquetas, responsável e respostas rápidas",
        "Histórico completo de cada contato",
      ]}
      requirements={[
        "WhatsApp Business Platform (API oficial) configurada",
        "Permissão de mensagens do Instagram aprovada",
        "Provedor de e-mail definido",
      ]}
    />
  );
}
