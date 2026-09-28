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

export type UploadedFile = { path: string; name: string; size: number; mime: string | null };

/** Comentário com anexos (os arquivos já foram enviados pelo navegador para task-files/<tarefa>/...). */
export async function addComment(taskId: string, body: string, files: UploadedFile[] = []): Promise<{ error?: string }> {
  const user = await requireArea("tarefas");
  const text = body.trim();
  if (!text && !files.length) return { error: "Escreva um comentário ou anexe um arquivo." };
  if (text.length > 4000) return { error: "Comentário muito longo." };
  if (files.length > 20) return { error: "Envie no máximo 20 arquivos por vez." };
  if (files.some((f) => !f.path.startsWith(`${taskId}/`) || f.path.includes(".."))) return { error: "Arquivo inválido." };

  const supabase = await createClient();
  let commentId: string | null = null;
  if (text) {
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ task_id: taskId, body: text, author_id: user.id })
      .select("id")
      .single();
    if (error || !data) return { error: "Não foi possível comentar." };
    commentId = data.id;
  }
  if (files.length) {
    const { error } = await supabase.from("task_attachments").insert(
      files.map((f) => ({
        task_id: taskId,
        comment_id: commentId,
        uploader_id: user.id,
        name: f.name.slice(0, 255),
        path: f.path,
        size: Math.max(0, Math.round(f.size)),
        mime: f.mime,
      })),
    );
    if (error) return { error: "O comentário foi salvo, mas os anexos não puderam ser registrados." };
  }
  revalidatePath("/tarefas");
  return {};
}

export async function deleteComment(id: string) {
  await requireArea("tarefas");
  const supabase = await createClient();
  await supabase.from("task_comments").delete().eq("id", id);
  revalidatePath("/tarefas");
}

export async function deleteAttachment(id: string): Promise<{ error?: string }> {
  await requireArea("tarefas");
  const supabase = await createClient();
  const { data: file } = await supabase.from("task_attachments").select("path").eq("id", id).maybeSingle();
  if (!file) return { error: "Anexo não encontrado." };
  const { data: removed, error } = await supabase.from("task_attachments").delete().eq("id", id).select("id");
  if (error || !removed?.length) return { error: "Só quem enviou o arquivo, o administrador ou o gestor podem removê-lo." };
  await supabase.storage.from("task-files").remove([file.path]);
  revalidatePath("/tarefas");
  return {};
}

export type Attachment = {
  id: string;
  comment_id: string | null;
  uploader_id: string | null;
  name: string;
  path: string;
  size: number;
  mime: string | null;
  created_at: string;
};
export type Activity = {
  id: number;
  action: string;
  from_value: string | null;
  to_value: string | null;
  actor_id: string | null;
  created_at: string;
};
export type TaskThread = {
  comments: { id: string; body: string; author_id: string | null; created_at: string }[];
  attachments: Attachment[];
};

export async function getTaskThread(taskId: string): Promise<TaskThread> {
  await requireArea("tarefas");
  const supabase = await createClient();
  const [{ data: comments }, { data: attachments }] = await Promise.all([
    supabase.from("task_comments").select("id, body, author_id, created_at").eq("task_id", taskId).order("created_at"),
    supabase
      .from("task_attachments")
      .select("id, comment_id, uploader_id, name, path, size, mime, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
  ]);
  return { comments: comments ?? [], attachments: (attachments ?? []) as Attachment[] };
}

/** Histórico em páginas (mais recentes primeiro). */
export async function getTaskActivity(taskId: string, offset = 0, limit = 30): Promise<{ items: Activity[]; total: number }> {
  await requireArea("tarefas");
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("task_activity")
    .select("id, action, from_value, to_value, actor_id, created_at", { count: "exact" })
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  return { items: (data ?? []) as Activity[], total: count ?? 0 };
}
