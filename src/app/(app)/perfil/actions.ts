"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "avatars";

async function me() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=acesso");
  return user;
}

/** Apaga as fotos antigas da pasta do usuário, mantendo só a atual. */
async function cleanupFolder(userId: string, keep?: string) {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).list(userId);
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await admin.storage.from(BUCKET).remove(old);
}

/** Registra a foto já enviada pelo navegador para avatars/<id>/<arquivo>. */
export async function setAvatar(path: string): Promise<{ error?: string }> {
  const user = await me();
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) return { error: "Arquivo inválido." };

  const admin = createAdminClient();
  const { data: file } = await admin.storage.from(BUCKET).list(user.id, { search: path.slice(user.id.length + 1) });
  if (!file?.length) return { error: "A foto não foi encontrada. Envie de novo." };

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await admin.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar a foto." };

  await cleanupFolder(user.id, path);
  revalidatePath("/", "layout");
  return {};
}

export async function removeAvatar() {
  const user = await me();
  const admin = createAdminClient();
  await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  await cleanupFolder(user.id);
  revalidatePath("/", "layout");
}

export async function updateName(_: { error?: string; ok?: boolean } | undefined, fd: FormData) {
  const user = await me();
  const name = String(fd.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { error: "Informe um nome entre 2 e 80 caracteres." };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ full_name: name }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
