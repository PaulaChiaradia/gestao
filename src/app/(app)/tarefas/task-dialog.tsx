"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import {
  CATEGORIES,
  formatDue,
  PRIORITIES,
  statusLabel,
  TASK_COLUMNS,
  type ChecklistItem,
  type Task,
  type TeamMember,
} from "@/lib/tasks";
import { addComment, deleteComment, deleteTask, getTaskThread, saveTask, toggleChecklistItem, type TaskThread } from "./actions";

const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export function TaskDialog({
  task,
  team,
  me,
  onClose,
}: {
  task: Task | null;
  team: TeamMember[];
  me: { id: string; canDeleteAll: boolean };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveTask, undefined);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist ?? []);
  const [newItem, setNewItem] = useState("");
  const [thread, setThread] = useState<TaskThread | null>(null);
  const [deleting, startDelete] = useTransition();
  const [, startToggle] = useTransition();
  const [deleteError, setDeleteError] = useState<string>();
  const member = new Map(team.map((m) => [m.id, m]));
  const nameOf = (id: string | null) => (id ? (member.get(id)?.name ?? "Usuário removido") : "Sistema");

  useEffect(() => ref.current?.showModal(), []);
  useEffect(() => {
    if (state?.ok && !task) onClose(); // nova tarefa: fecha e o cartão aparece em "Em planejamento"
  }, [state, task, onClose]);

  const taskId = task?.id;
  const loadThread = useCallback(async () => {
    if (taskId) setThread(await getTaskThread(taskId));
  }, [taskId]);
  // Recarrega comentários e histórico ao abrir e quando o quadro atualiza (tempo real)
  const commentCount = task?.comments;
  const status = task?.status;
  useEffect(() => {
    if (!taskId) return;
    let active = true;
    getTaskThread(taskId).then((t) => active && setThread(t));
    return () => {
      active = false;
    };
  }, [taskId, commentCount, status]);

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((c) => [...c, { text, done: false }]);
    setNewItem("");
  }

  const canDelete = task && (me.canDeleteAll || task.created_by === me.id);
  const activeTeam = team.filter((m) => m.active !== false || m.id === task?.assignee_id);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(900px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/30"
    >
      <div className="max-h-[88dvh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <span className="text-sm text-muted">
            {task ? `Tarefa · ${statusLabel(task.status)}` : "Nova tarefa · entra em “Em planejamento”"}
          </span>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-sand">
            <X className="size-5" />
          </button>
        </div>

        <div className={`grid gap-6 p-6 ${task ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
          <form action={action} className="space-y-4">
            {task && <input type="hidden" name="id" value={task.id} />}
            <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />

            <label className="block text-sm">
              <span className="mb-1 block text-muted">Nome da tarefa *</span>
              <input name="title" required autoFocus={!task} defaultValue={task?.title} maxLength={200} className={`${field} text-base font-medium`} />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Responsável</span>
                <select name="assignee_id" defaultValue={task ? (task.assignee_id ?? "") : me.id} className={field}>
                  <option value="">Sem responsável</option>
                  {activeTeam.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.id === me.id ? " (eu)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Prazo</span>
                <input name="due_date" type="date" defaultValue={task?.due_date ?? ""} className={field} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Prioridade</span>
                <select name="priority" defaultValue={task?.priority ?? "media"} className={field}>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Categoria</span>
                <select name="category" defaultValue={task?.category ?? ""} className={field}>
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {task && (
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted">Coluna</span>
                  <select name="status" defaultValue={task.status} className={field}>
                    {TASK_COLUMNS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">Descrição</span>
              <textarea name="description" rows={4} defaultValue={task?.description ?? ""} placeholder="O que precisa ser feito, links, detalhes…" className={field} />
            </label>

            {/* Subtarefas */}
            <div className="text-sm">
              <span className="mb-1 block text-muted">
                Subtarefas{checklist.length > 0 && ` · ${checklist.filter((i) => i.done).length}/${checklist.length}`}
              </span>
              <ul className="space-y-1">
                {checklist.map((item, i) => (
                  <li key={i} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-background">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => {
                        setChecklist((c) => c.map((x, j) => (j === i ? { ...x, done: !x.done } : x)));
                        // tarefa existente: grava na hora (e desfaz na tela se falhar)
                        if (task)
                          startToggle(async () => {
                            const res = await toggleChecklistItem(task.id, i);
                            if (res?.error) {
                              setChecklist((c) => c.map((x, j) => (j === i ? { ...x, done: !x.done } : x)));
                              setDeleteError(res.error);
                            }
                          });
                      }}
                      className="size-4 accent-[var(--accent)]"
                      aria-label={`Concluir: ${item.text}`}
                    />
                    <span className={`flex-1 ${item.done ? "text-muted line-through" : ""}`}>{item.text}</span>
                    <button
                      type="button"
                      onClick={() => setChecklist((c) => c.filter((_, j) => j !== i))}
                      aria-label="Remover subtarefa"
                      className="rounded p-1 text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-1 flex gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="Adicionar subtarefa e apertar Enter"
                  className={field}
                />
                <button type="button" onClick={addItem} aria-label="Adicionar subtarefa" className="rounded-lg border border-border px-2.5 hover:bg-sand">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {!task && (
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Comentário</span>
                <textarea name="comment" rows={2} placeholder="Observação inicial para a equipe (opcional)" className={field} />
              </label>
            )}

            {state?.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
            {deleteError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{deleteError}</p>}
            {state?.ok && task && <p className="text-sm text-accent">Alterações salvas.</p>}

            <div className="flex items-center justify-between gap-3 pt-1">
              {canDelete ? (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    if (!confirm("Excluir esta tarefa? Comentários e histórico também serão apagados.")) return;
                    startDelete(async () => {
                      const res = await deleteTask(task!.id);
                      if (res.error) setDeleteError(res.error);
                      else onClose();
                    });
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-sand">
                  {task ? "Fechar" : "Cancelar"}
                </button>
                <button
                  disabled={pending}
                  className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {task ? "Salvar alterações" : "Criar tarefa"}
                </button>
              </div>
            </div>
          </form>

          {task && (
            <aside className="space-y-5 lg:border-l lg:border-border lg:pl-6">
              <Comments taskId={task.id} thread={thread} team={member} me={me.id} onChange={loadThread} />
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Histórico</h3>
                <ul className="space-y-1.5 text-xs text-muted">
                  {thread?.activity.map((a) => (
                    <li key={a.id}>
                      <span className="text-foreground">{nameOf(a.actor_id)}</span>{" "}
                      {a.action === "criou" && "criou a tarefa"}
                      {a.action === "moveu" && `moveu de ${statusLabel(a.from_value ?? "")} para ${statusLabel(a.to_value ?? "")}`}
                      {a.action === "atribuiu" && `definiu o responsável: ${a.to_value ? nameOf(a.to_value) : "ninguém"}`}
                      {a.action === "prazo" && `mudou o prazo para ${formatDue(a.to_value) ?? "sem prazo"}`}
                      <span className="block">{when(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </div>
    </dialog>
  );
}

function Comments({
  taskId,
  thread,
  team,
  me,
  onChange,
}: {
  taskId: string;
  thread: TaskThread | null;
  team: Map<string, TeamMember>;
  me: string;
  onChange: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function send() {
    if (!text.trim()) return;
    start(async () => {
      const res = await addComment(taskId, text);
      if (res.error) setError(res.error);
      else {
        setText("");
        setError(undefined);
        onChange();
      }
    });
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Comentários</h3>
      {thread === null ? (
        <p className="text-xs text-muted">Carregando…</p>
      ) : (
        <ul className="mb-3 space-y-3">
          {thread.comments.map((c) => {
            const author = c.author_id ? team.get(c.author_id) : undefined;
            return (
              <li key={c.id} className="group flex gap-2 text-sm">
                <Avatar name={author?.name ?? "?"} url={author?.avatarUrl} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    <span className="font-medium text-foreground">{author?.name ?? "Usuário removido"}</span> · {when(c.created_at)}
                    {c.author_id === me && (
                      <button
                        type="button"
                        onClick={() => start(async () => (await deleteComment(c.id), onChange()))}
                        className="ml-2 text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                      >
                        apagar
                      </button>
                    )}
                  </p>
                  <p className="whitespace-pre-line break-words">{c.body}</p>
                </div>
              </li>
            );
          })}
          {!thread.comments.length && <li className="text-xs text-muted">Nenhum comentário ainda.</li>}
        </ul>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          rows={2}
          placeholder="Escrever comentário (Ctrl+Enter envia)"
          className={field}
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || !text.trim()}
          aria-label="Enviar comentário"
          className="self-end rounded-lg bg-foreground p-2.5 text-background hover:bg-foreground/85 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
