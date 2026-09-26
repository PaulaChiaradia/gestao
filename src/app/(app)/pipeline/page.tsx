import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Palestras e treinamentos | Paula Chiaradia" };

export default async function PipelinePage() {
  await requireArea("pipeline");
  return (
    <ModulePlaceholder
      title="Palestras e treinamentos"
      description="Acompanhamento das solicitações até o fechamento."
      stage="Etapa 4"
      features={[
        "Etapas: novo, qualificado, proposta enviada, fechado, perdido",
        "Empresa, cidade, data do evento e número de participantes",
        "Oportunidades criadas automaticamente pelo robô",
        "Taxa de conversão e valor em negociação",
      ]}
    />
  );
}
