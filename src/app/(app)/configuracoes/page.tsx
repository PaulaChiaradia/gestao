import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Configurações | Paula Chiaradia" };

export default async function ConfiguracoesPage() {
  await requireArea("configuracoes");
  return (
    <ModulePlaceholder
      title="Configurações"
      description="Usuários, perfis de acesso e integrações."
      stage="Etapa 0 · em andamento"
      features={[
        "Convidar usuários e definir perfis de acesso",
        "Conectar e acompanhar o status de cada integração",
        "Registro de eventos recebidos das plataformas",
      ]}
    />
  );
}
