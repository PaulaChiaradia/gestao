import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireArea } from "@/lib/auth";

export const metadata = { title: "Instagram | Paula Chiaradia" };

export default async function InstagramPage() {
  await requireArea("instagram");
  return (
    <ModulePlaceholder
      title="Instagram"
      description="Conteúdo, alcance e público do perfil."
      stage="Etapa 3"
      features={[
        "Posts, Reels e Stories com alcance, engajamento e salvamentos",
        "Conteúdos com melhor desempenho",
        "Público por cidade, idade e gênero",
        "Crescimento de seguidores",
      ]}
      requirements={[
        "Conta profissional vinculada a uma página do Facebook",
        "App Meta aprovado com permissões do Instagram",
      ]}
    />
  );
}
