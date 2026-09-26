import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Robô de atendimento | Paula Chiaradia" };

export default async function BotPage() {
  await requireArea("bot");
  return (
    <ModulePlaceholder
      title="Robô de atendimento"
      description="Assistente com IA que responde contatos no WhatsApp e no Instagram."
      stage="Etapa 4"
      features={[
        "Base de conhecimento: palestras, treinamentos, cursos e dúvidas frequentes",
        "Tom de voz e horário de atendimento configuráveis",
        "Perguntas de qualificação para pedidos de palestra",
        "Regras de transferência para atendimento humano",
      ]}
      requirements={[
        "Chave da API da Anthropic (Claude)",
        "Conteúdo da base de conhecimento e política de preços",
      ]}
    />
  );
}
