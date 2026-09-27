import { headers } from "next/headers";
import { ChartCard } from "@/components/charts/stat-tile";
import { PageHeader } from "@/components/page-header";
import { requireArea } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { isRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyButton } from "../vendas/links/link-builder";
import { InviteForm, UserList, type UserRow } from "./users";

export const metadata = { title: "Configurações | Paula Chiaradia" };

export default async function ConfiguracoesPage() {
  const me = await requireArea("configuracoes");
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authList }, { data: integrations }, { data: lastEvents }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, role, active").order("created_at"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("integrations").select("key, name, status, last_event_at"),
    admin
      .from("webhook_events")
      .select("event, status, error, received_at")
      .eq("source", "hotmart")
      .order("received_at", { ascending: false })
      .limit(5),
  ]);

  const lastSignIn = new Map(authList?.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: isRole(p.role) ? p.role : "visualizador",
    active: p.active,
    last_sign_in_at: lastSignIn.get(p.id) ?? null,
  }));

  const h = await headers();
  const webhookUrl = `https://${h.get("host")}/api/webhooks/hotmart`;
  const hotmart = integrations?.find((i) => i.key === "hotmart");
  const hottokSet = !!process.env.HOTMART_HOTTOK;

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Usuários, perfis de acesso e integrações." />

      <ChartCard
        title="Convidar usuário"
        subtitle="Gera um link de acesso para enviar pelo WhatsApp ou e-mail. A pessoa cria a própria senha ao abrir."
      >
        <InviteForm />
      </ChartCard>

      <ChartCard title="Usuários" subtitle="Altere o perfil na lista. Usuários desativados perdem o acesso na hora.">
        <UserList users={users} meId={me.id} />
      </ChartCard>

      <ChartCard title="Hotmart" subtitle="Endereço para cadastrar em Hotmart → Ferramentas → Webhook (versão 2.0.0).">
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2.5">
            <code className="min-w-0 flex-1 truncate text-xs">{webhookUrl}</code>
            <CopyButton text={webhookUrl} />
          </div>
          <ul className="grid gap-2 sm:grid-cols-3">
            <li className="rounded-lg bg-background px-3 py-2">
              <p className="text-xs text-muted">Hottok configurado</p>
              <p className="font-medium">{hottokSet ? "Sim" : "Ainda não"}</p>
            </li>
            <li className="rounded-lg bg-background px-3 py-2">
              <p className="text-xs text-muted">Situação</p>
              <p className="font-medium">{hotmart?.status === "conectado" ? "Recebendo vendas" : "Aguardando primeiro evento"}</p>
            </li>
            <li className="rounded-lg bg-background px-3 py-2">
              <p className="text-xs text-muted">Último evento</p>
              <p className="font-medium">{formatDate(hotmart?.last_event_at ?? null)}</p>
            </li>
          </ul>
          {!!lastEvents?.length && (
            <div>
              <p className="mb-1 text-xs text-muted">Últimos eventos recebidos</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {lastEvents.map((e, i) => (
                  <li key={i} className="flex justify-between gap-3 px-3 py-2">
                    <span>{e.event}</span>
                    <span className={e.status === "erro" ? "text-danger" : "text-muted"}>
                      {e.status}
                      {e.error ? ` · ${e.error}` : ""} · {new Date(e.received_at).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
