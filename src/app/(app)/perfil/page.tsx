import { redirect } from "next/navigation";
import { ChartCard } from "@/components/charts/stat-tile";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { NameForm, PhotoForm } from "./profile-form";

export const metadata = { title: "Meu perfil | Paula Chiaradia" };

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=acesso");

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Meu perfil" description="Sua foto e seu nome aparecem no topo do sistema e para a equipe." />

      <ChartCard title="Foto">
        <PhotoForm userId={user.id} name={user.name} avatarUrl={user.avatarUrl} />
      </ChartCard>

      <ChartCard title="Dados de acesso">
        <div className="space-y-5">
          <NameForm name={user.name} />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-background px-3 py-2">
              <dt className="text-xs text-muted">E-mail de acesso</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <dt className="text-xs text-muted">Perfil</dt>
              <dd>{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            Para trocar a senha, saia do sistema e use “Esqueci minha senha” na tela de login. O perfil de acesso é
            definido pela administração.
          </p>
        </div>
      </ChartCard>
    </div>
  );
}
