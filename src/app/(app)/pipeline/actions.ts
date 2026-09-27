"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { normalizePhone, normalizeUF } from "@/lib/brazil";
import { FORMATS, KINDS, SOURCES, STAGES, type Stage } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error?: string; ok?: boolean } | undefined;

const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
};
const oneOf = (list: readonly { value: string }[], v: string | null) => (list.some((i) => i.value === v) ? v : null);

export async function saveOpportunity(_: SaveState, fd: FormData): Promise<SaveState> {
  await requireArea("pipeline");

  const title = text(fd, "title");
  if (!title) return { error: "Dê um título à oportunidade (ex.: Palestra Associação Comercial de Campinas)." };

  const valueRaw = text(fd, "value");
  const value = valueRaw ? Number(valueRaw.replace(/\./g, "").replace(",", ".")) : null;
  if (value !== null && Number.isNaN(value)) return { error: "Valor inválido." };
  const audienceRaw = text(fd, "audience");
  const audience = audienceRaw ? parseInt(audienceRaw, 10) : null;

  const stage = (oneOf(STAGES, text(fd, "stage")) ?? "novo") as Stage;
  const row = {
    title,
    kind: oneOf(KINDS, text(fd, "kind")) ?? "palestra",
    stage,
    contact_name: text(fd, "contact_name"),
    contact_phone: normalizePhone(text(fd, "contact_phone")),
    contact_email: text(fd, "contact_email")?.toLowerCase() ?? null,
    company: text(fd, "company"),
    city: text(fd, "city"),
    state: normalizeUF(text(fd, "state")),
    event_date: text(fd, "event_date"),
    audience: Number.isNaN(audience) ? null : audience,
    format: oneOf(FORMATS, text(fd, "format")),
    value,
    source: oneOf(SOURCES, text(fd, "source")),
    notes: text(fd, "notes"),
    lost_reason: stage === "perdido" ? text(fd, "lost_reason") : null,
  };

  const supabase = await createClient();
  const id = text(fd, "id");
  const { error } = id
    ? await supabase.from("opportunities").update(row).eq("id", id)
    : await supabase.from("opportunities").insert(row);
  if (error) return { error: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/pipeline");
  return { ok: true };
}

export async function moveOpportunity(id: string, stage: Stage) {
  await requireArea("pipeline");
  if (!STAGES.some((s) => s.value === stage)) return;
  const supabase = await createClient();
  await supabase.from("opportunities").update({ stage }).eq("id", id);
  revalidatePath("/pipeline");
}

export async function deleteOpportunity(id: string) {
  await requireArea("pipeline");
  const supabase = await createClient();
  await supabase.from("opportunities").delete().eq("id", id);
  revalidatePath("/pipeline");
}
