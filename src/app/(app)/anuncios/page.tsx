import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Anúncios | Paula Chiaradia" };

export default async function AnunciosPage() {
  await requireArea("anuncios");
  return (
    <ModulePlaceholder
      title="Anúncios Meta"
      description="Desempenho das campanhas de tráfego pago."
      stage="Etapa 2"
      features={[
        "Investimento, alcance, cliques, leads e custo por resultado",
        "Onde os anúncios são vistos: mapa por estado",
        "Público por idade e gênero, desempenho por posicionamento",
        "Cruzamento com as vendas da Hotmart (ROAS real)",
      ]}
      requirements={[
        "Empresa verificada no Gerenciador de Negócios",
        "App Meta aprovado com permissão ads_read",
        "ID da conta de anúncios",
      ]}
    />
  );
}
