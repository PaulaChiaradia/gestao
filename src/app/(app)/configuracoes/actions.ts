"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserActionState = { error?: string; link?: string; message?: string } | undefined;

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

/** Monta o link que abre a sessão e leva à tela de criar senha (não depende de e-mail). */
async function accessLink(type: "invite" | "recovery", email: string, fullName?: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink(
    type === "invite" ? { type, email, options: { data: { full_name: fullName } } } : { type, email },
  );
  if (error || !data.properties?.hashed_token) return { error: error?.message ?? "Falha ao gerar link" };
  const origin = await siteOrigin();
  const link = `${origin}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${type}&next=/redefinir-senha`;
  return { link, userId: data.user?.id };
}

export async function inviteUser(_: UserActionState, fd: FormData): Promise<UserActionState> {
  await requireArea("configuracoes");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim();
  const role = String(fd.get("role") ?? "");
  if (!email || !name) return { error: "Informe nome e e-mail." };
  if (!isRole(role)) return { error: "Escolha o perfil de acesso." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "Já existe um usuário com este e-mail. Use “Gerar link de acesso” na lista." };

  const result = await accessLink("invite", email, name);
  if ("error" in result && result.error) return { error: "Não foi possível criar o convite." };

  await admin.from("profiles").update({ role, full_name: name }).eq("id", result.userId!);
  revalidatePath("/configuracoes");
  return { link: result.link, message: `Convite criado para ${name}. Envie o link abaixo (vale por 24 horas, uso único).` };
}

export async function newAccessLink(_: UserActionState, fd: FormData): Promise<UserActionState> {
  await requireArea("configuracoes");
  const email = String(fd.get("email") ?? "");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("full_name, active").eq("email", email).maybeSingle();
  if (!profile) return { error: "Usuário não encontrado." };
  if (!profile.active) return { error: "Reative o usuário antes de gerar um link." };

  // Quem nunca entrou recebe novo convite; quem já entrou recebe link de redefinição de senha
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authUser = list?.users.find((u) => u.email === email);
  const result = await accessLink(authUser?.last_sign_in_at ? "recovery" : "invite", email);
  if ("error" in result && result.error) return { error: "Não foi possível gerar o link." };
  return { link: result.link, message: `Link de acesso para ${profile.full_name ?? email} (24 horas, uso único).` };
}

export async function updateUser(fd: FormData) {
  const me = await requireArea("configuracoes");
  const id = String(fd.get("id") ?? "");
  if (!id || id === me.id) return; // ninguém altera o próprio perfil ou se desativa

  const admin = createAdminClient();
  const role = fd.get("role");
  const active = fd.get("active");

  if (typeof role === "string" && isRole(role)) {
    await admin.from("profiles").update({ role }).eq("id", id);
  }
  if (active === "true" || active === "false") {
    const on = active === "true";
    await admin.from("profiles").update({ active: on }).eq("id", id);
    // Bloqueia também o login e encerra as sessões atuais
    await admin.auth.admin.updateUserById(id, { ban_duration: on ? "none" : "876000h" });
  }
  revalidatePath("/configuracoes");
}

export async function syncHotmartNow(): Promise<{ error?: string; message?: string }> {
  await requireArea("configuracoes");
  try {
    const { syncRecent } = await import("@/lib/hotmart/sync");
    const stats = await syncRecent(createAdminClient());
    revalidatePath("/", "layout");
    return { message: `${stats.sales} vendas dos últimos 45 dias revisadas.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao sincronizar." };
  }
}
