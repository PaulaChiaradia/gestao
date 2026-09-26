import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Vendas | Paula Chiaradia" };

export default async function VendasPage() {
  await requireArea("vendas");
  return (
    <ModulePlaceholder
      title="Vendas Hotmart"
      description="Vendas dos infoprodutos em tempo real."
      stage="Etapa 1 · próxima"
      features={[
        "Faturamento, vendas, reembolsos e ticket médio",
        "Mapa de vendas por estado e ranking de cidades",
        "Desempenho por produto e forma de pagamento",
        "Origem das vendas (UTM, afiliados, anúncios)",
      ]}
      requirements={[
        "Credenciais do Hotmart Developers (Client ID, Secret e Basic)",
        "Hottok para validar os webhooks de venda",
      ]}
    />
  );
}
