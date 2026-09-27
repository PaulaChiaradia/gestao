"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { BOT_MODELS, generateReply, type BotReply, type BotSettings, type ChatTurn } from "@/lib/bot";
import { createClient } from "@/lib/supabase/server";

export type FormResult = { error?: string; ok?: boolean } | undefined;

const clean = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;

export async function saveSettings(_: FormResult, fd: FormData): Promise<FormResult> {
  const user = await requireArea("bot");
  const model = clean(fd, "model");
  const effort = clean(fd, "effort");
  const pricing = clean(fd, "pricing_policy");
  const row = {
    enabled: fd.get("enabled") === "on",
    assistant_name: clean(fd, "assistant_name") ?? "Assistente da Paula Chiaradia",
    tone: clean(fd, "tone") ?? "",
    greeting: clean(fd, "greeting"),
    business_hours: clean(fd, "business_hours"),
    pricing_policy: ["todos", "produtos", "nenhum"].includes(pricing ?? "") ? pricing : "produtos",
    qualify_questions: clean(fd, "qualify_questions"),
    handoff_rules: clean(fd, "handoff_rules"),
    model: BOT_MODELS.some((m) => m.value === model) ? model : "claude-opus-5",
    effort: ["low", "medium", "high"].includes(effort ?? "") ? effort : "low",
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (!row.tone) return { error: "Descreva o tom de voz." };

  const supabase = await createClient();
  const { error } = await supabase.from("bot_settings").update(row).eq("id", 1);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/bot");
  return { ok: true };
}

export async function saveKnowledge(_: FormResult, fd: FormData): Promise<FormResult> {
  const user = await requireArea("bot");
  const row = {
    category: clean(fd, "category") ?? "Geral",
    title: clean(fd, "title"),
    content: clean(fd, "content"),
    active: fd.get("active") === "on",
    // Ao salvar, a pessoa confirma que revisou o conteúdo
    needs_review: false,
    review_note: null,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (!row.title || !row.content) return { error: "Preencha título e conteúdo." };

  const supabase = await createClient();
  const id = clean(fd, "id");
  const { error } = id
    ? await supabase.from("bot_knowledge").update(row).eq("id", id)
    : await supabase.from("bot_knowledge").insert({ ...row, sort: 100 });
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/bot");
  return { ok: true };
}

export async function deleteKnowledge(id: string) {
  await requireArea("bot");
  const supabase = await createClient();
  await supabase.from("bot_knowledge").delete().eq("id", id);
  revalidatePath("/bot");
}

export type TestResult = ({ ok: true } & BotReply) | { ok: false; error: string };

/** Conversa de teste: usa as configurações e a base salvas, sem enviar nada a clientes. */
export async function testBot(history: ChatTurn[]): Promise<TestResult> {
  await requireArea("bot");
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "Chave da API da Anthropic ainda não configurada." };

  const turns = history
    .slice(-30)
    .filter((t) => (t.role === "user" || t.role === "assistant") && t.content.trim())
    .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }));
  if (turns.at(-1)?.role !== "user") return { ok: false, error: "Envie uma mensagem." };

  const supabase = await createClient();
  const [{ data: settings }, { data: knowledge }] = await Promise.all([
    supabase.from("bot_settings").select("*").eq("id", 1).single(),
    supabase.from("bot_knowledge").select("category, title, content").eq("active", true).order("sort"),
  ]);
  if (!settings) return { ok: false, error: "Configurações do robô não encontradas." };

  try {
    const reply = await generateReply(settings as BotSettings, knowledge ?? [], turns);
    return { ok: true, ...reply };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "Chave da API da Anthropic inválida." };
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "Limite de uso atingido. Tente em instantes." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: `Erro da API (${err.status ?? "rede"}). Tente de novo.` };
    throw err;
  }
}
