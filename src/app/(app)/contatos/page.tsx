import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Contatos | Paula Chiaradia" };

export default async function ContatosPage() {
  await requireArea("contatos");
  return (
    <ModulePlaceholder
      title="Contatos"
      description="Uma ficha única por pessoa, de todos os canais."
      stage="Etapa 1 em diante"
      features={[
        "Compradores da Hotmart, contatos do WhatsApp, Instagram e e-mail unificados",
        "Histórico de compras, conversas e oportunidades",
        "Cidade, estado e origem do contato",
        "Busca e filtros por etiqueta",
      ]}
    />
  );
}
