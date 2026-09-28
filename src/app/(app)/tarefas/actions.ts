"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { CATEGORIES, PRIORITIES, TASK_COLUMNS, type ChecklistItem, type TaskStatus } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { error?: string; ok?: boolean; id?: string } | undefined;

const clean = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
};

export async function saveTask(_: SaveResult, fd: FormData): Promise<SaveResult> {
  await requireArea("tarefas");
  const title = clean(fd, "title");
  if (!title) return { error: "Dê um nome à tarefa." };
  if (title.length > 200) return { error: "Nome muito longo (máximo 200 caracteres)." };

  const priority = clean(fd, "priority");
  const category = clean(fd, "category");
  let checklist: ChecklistItem[] = [];
  try {
    const parsed = JSON.parse(String(fd.get("checklist") ?? "[]"));
    if (Array.isArray(parsed)) {
      checklist = parsed
        .filter((i) => i && typeof i.text === "string" && i.text.trim())
        .slice(0, 50)
        .map((i) => ({ text: String(i.text).trim().slice(0, 300), done: !!i.done }));
    }
  } catch {
    return { error: "Lista de subtarefas inválida." };
  }

  const row = {
    title,
    description: clean(fd, "description"),
    priority: PRIORITIES.some((p) => p.value === priority) ? priority : "media",
    category: category && (CATEGORIES as readonly string[]).includes(category) ? category : null,
    assignee_id: clean(fd, "assignee_id"),
    due_date: clean(fd, "due_date"),
    checklist,
  };

  const supabase = await createClient();
  const id = clean(fd, "id");
  if (id) {
    const status = clean(fd, "status");
    const { error } = await supabase
      .from("tasks")
      .update({ ...row, ...(TASK_COLUMNS.some((c) => c.value === status) ? { status } : {}) })
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar a tarefa." };
    revalidatePath("/tarefas");
    return { ok: true, id };
  }

  // Nova tarefa sempre começa em "Em planejamento"
  const { data, error } = await supabase.from("tasks").insert({ ...row, status: "planejamento" }).select("id").single();
  if (error || !data) return { error: "Não foi possível criar a tarefa." };
  const comment = clean(fd, "comment");
  if (comment) await supabase.from("task_comments").insert({ task_id: data.id, body: comment });
  revalidatePath("/tarefas");
  return { ok: true, id: data.id };
}

export async function moveTask(id: string, status: TaskStatus) {
  await requireArea("tarefas");
  if (!TASK_COLUMNS.some((c) => c.value === status)) return;
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", id);
  revalidatePath("/tarefas");
}

export async function toggleChecklistItem(id: string, index: number): Promise<{ error?: string }> {
  await requireArea("tarefas");
  const supabase = await createClient();
  const { data, error: readError } = await supabase.from("tasks").select("checklist").eq("id", id).single();
  if (readError) return { error: "Não foi possível ler a tarefa." };
  const list = (data?.checklist ?? []) as ChecklistItem[];
  if (!list[index]) return { error: "Subtarefa não encontrada. Recarregue a página." };
  list[index] = { ...list[index], done: !list[index].done };
  const { error } = await supabase.from("tasks").update({ checklist: list }).eq("id", id);
  if (error) return { error: `Não foi possível marcar a subtarefa: ${error.message}` };
  revalidatePath("/tarefas");
  return {};
}

export async function deleteTask(id: string): Promise<{ error?: string }> {
  await requireArea("tarefas");
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "Só quem criou a tarefa, o administrador ou o gestor podem excluí-la." };
  revalidatePath("/tarefas");
  return {};
}

export async function addComment(taskId: string, body: string): Promise<{ error?: string }> {
  const user = await requireArea("tarefas");
  const text = body.trim();
  if (!text) return { error: "Escreva o comentário." };
  if (text.length > 4000) return { error: "Comentário muito longo." };
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").insert({ task_id: taskId, body: text, author_id: user.id });
  if (error) return { error: "Não foi possível comentar." };
  revalidatePath("/tarefas");
  return {};
}

export async function deleteComment(id: string) {
  await requireArea("tarefas");
  const supabase = await createClient();
  await supabase.from("task_comments").delete().eq("id", id);
  revalidatePath("/tarefas");
}

export type TaskThread = {
  comments: { id: string; body: string; author_id: string | null; created_at: string }[];
  activity: { id: number; action: string; from_value: string | null; to_value: string | null; actor_id: string | null; created_at: string }[];
};

export async function getTaskThread(taskId: string): Promise<TaskThread> {
  await requireArea("tarefas");
  const supabase = await createClient();
  const [{ data: comments }, { data: activity }] = await Promise.all([
    supabase.from("task_comments").select("id, body, author_id, created_at").eq("task_id", taskId).order("created_at"),
    supabase
      .from("task_activity")
      .select("id, action, from_value, to_value, actor_id, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return { comments: comments ?? [], activity: activity ?? [] };
}
