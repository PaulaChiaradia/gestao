"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import {
  CATEGORIES,
  dueRelative,
  dueState,
  formatDue,
  PRIORITIES,
  priorityOf,
  TASK_COLUMNS,
  type ChecklistItem,
  type Task,
  type TaskStatus,
  type TeamMember,
} from "@/lib/tasks";
import { deleteTask, getTaskActivity, moveTask, saveTask, toggleChecklistItem } from "./actions";
import { CommentsTab } from "./task-comments";
import { HistoryTab } from "./task-history";

export const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export type Me = { id: string; canDeleteAll: boolean };
type Tab = "detalhes" | "comentarios" | "historico";

export function TaskDialog({
  task,
  team,
  me,
  onClose,
}: {
  task: Task | null;
  team: TeamMember[];
  me: Me;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(880px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/30"
    >
      {task ? (
        <TaskView task={task} team={team} me={me} onClose={onClose} />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border px-6 py-3.5">
            <div>
              <p className="font-medium">Nova tarefa</p>
              <p className="text-xs text-muted">Entra automaticamente em “Em planejamento”</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1.5 text-muted hover:bg-sand hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>
          <div className="max-h-[80dvh] overflow-y-auto p-6">
            <TaskForm task={null} team={team} me={me} onDone={onClose} onCancel={onClose} />
          </div>
        </>
      )}
    </dialog>
  );
}

const metaLabel = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

/** Tarefa existente: cabeçalho fixo com o essencial + três abas de altura fixa. */
function TaskView({ task, team, me, onClose }: { task: Task; team: TeamMember[]; me: Me; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("detalhes");
  const [historyTotal, setHistoryTotal] = useState<number | null>(null);
  const [, startMove] = useTransition();
  const member = new Map(team.map((m) => [m.id, m]));
  const assignee = task.assignee_id ? member.get(task.assignee_id) : undefined;
  const creator = task.created_by ? member.get(task.created_by) : undefined;
  const due = dueState(task);
  const relative = dueRelative(task);
  const prio = priorityOf(task.priority);

  // Total do histórico para o contador da aba (atualiza quando a tarefa muda em tempo real)
  useEffect(() => {
    let active = true;
    getTaskActivity(task.id, 0, 1).then((r) => active && setHistoryTotal(r.total));
    return () => {
      active = false;
    };
  }, [task.id, task.status, task.assignee_id, task.due_date, task.attachments, task.title]);

  const tabs: { value: Tab; label: string; count?: number | null }[] = [
    { value: "detalhes", label: "Detalhes" },
    { value: "comentarios", label: "Comentários e anexos", count: task.comments + task.attachments },
    { value: "historico", label: "Histórico", count: historyTotal },
  ];

  return (
    <div className="flex h-[min(820px,90dvh)] flex-col">
      <header className="border-b border-border px-6 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {task.category ?? "Tarefa"}
              {creator && (
                <span className="ml-2 font-normal normal-case tracking-normal">
                  · criada por {creator.name.split(" ")[0]} em {new Date(task.created_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </p>
            <h2 className={`mt-1 font-display text-2xl leading-tight tracking-wide ${task.status === "cancelado" ? "line-through" : ""}`}>
              {task.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 rounded-md p-1.5 text-muted hover:bg-sand hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className={metaLabel}>Coluna</dt>
            <dd className="mt-1">
              <select
                aria-label="Mover para a coluna"
                value={task.status}
                onChange={(e) => startMove(() => moveTask(task.id, e.target.value as TaskStatus))}
                className="-ml-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-medium hover:border-border focus:border-accent"
              >
                {TASK_COLUMNS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className={metaLabel}>Responsável</dt>
            <dd className="mt-1 flex items-center gap-2">
              {assignee ? (
                <>
                  <Avatar name={assignee.name} url={assignee.avatarUrl} size={22} />
                  <span className="truncate">{assignee.name}</span>
                </>
              ) : (
                <span className="text-muted">Sem responsável</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={metaLabel}>Vencimento</dt>
            <dd
              className={`mt-1 ${due === "atrasada" ? "font-medium text-danger" : due === "hoje" || due === "proxima" ? "text-[#8a5a00]" : ""}`}
            >
              {task.due_date ? (
                <>
                  <span className="tabular-nums">{formatDue(task.due_date)}</span>
                  {relative && <span className="block text-xs">{relative}</span>}
                </>
              ) : (
                <span className="text-muted">Sem prazo</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={metaLabel}>Prioridade</dt>
            <dd className="mt-1">
              <span className={`rounded-full px-2 py-0.5 text-xs ${prio.tone}`}>{prio.label}</span>
            </dd>
          </div>
        </dl>

        <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition ${
                tab === t.value ? "border-foreground font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="rounded-full bg-sand px-1.5 py-0.5 text-[11px] font-normal tabular-nums text-muted">{t.count}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Só o conteúdo da aba rola: a janela não cresce com o volume de comentários ou histórico */}
      <div className="min-h-0 flex-1 bg-background/40">
        {tab === "detalhes" && (
          <div className="h-full overflow-y-auto p-6">
            <TaskForm task={task} team={team} me={me} onDone={() => {}} onCancel={onClose} onDeleted={onClose} />
          </div>
        )}
        {tab === "comentarios" && <CommentsTab task={task} team={team} me={me} />}
        {tab === "historico" && <HistoryTab task={task} team={team} />}
      </div>
    </div>
  );
}

/** Formulário de criação/edição (nome, responsável, vencimento, prioridade, categoria, descrição, subtarefas). */
function TaskForm({
  task,
  team,
  me,
  onDone,
  onCancel,
  onDeleted,
}: {
  task: Task | null;
  team: TeamMember[];
  me: Me;
  onDone: () => void;
  onCancel: () => void;
  onDeleted?: () => void;
}) {
  const [state, action, pending] = useActionState(saveTask, undefined);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist ?? []);
  const [newItem, setNewItem] = useState("");
  const [deleting, startDelete] = useTransition();
  const [, startToggle] = useTransition();
  const [error, setError] = useState<string>();
  const activeTeam = team.filter((m) => m.active !== false || m.id === task?.assignee_id);
  const canDelete = task && (me.canDeleteAll || task.created_by === me.id);
  const doneCount = checklist.filter((i) => i.done).length;

  useEffect(() => {
    if (state?.ok && !task) onDone();
  }, [state, task, onDone]);

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((c) => [...c, { text, done: false }]);
    setNewItem("");
  }

  return (
    <form action={action} className="space-y-4">
      {task && <input type="hidden" name="id" value={task.id} />}
      <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />

      <label className="block text-sm">
        <span className="mb-1 block text-muted">Nome da tarefa *</span>
        <input name="title" required autoFocus={!task} defaultValue={task?.title} maxLength={200} className={`${field} text-base`} />
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
          <span className="mb-1 block text-muted">Vencimento (data para concluir)</span>
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
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-muted">Descrição</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={task?.description ?? ""}
          placeholder="O que precisa ser feito, links, detalhes…"
          className={field}
        />
      </label>

      <div className="text-sm">
        <span className="mb-1 block text-muted">
          Subtarefas{checklist.length > 0 && ` · ${doneCount}/${checklist.length} concluídas`}
        </span>
        {checklist.length > 0 && (
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-[var(--series-1)] transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
        )}
        <ul className="space-y-0.5">
          {checklist.map((item, i) => (
            <li key={i} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface">
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
                        setError(res.error);
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
          <span className="mt-1 block text-xs text-muted">Arquivos podem ser anexados depois, na aba Comentários e anexos.</span>
        </label>
      )}

      {(state?.error || error) && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state?.error ?? error}</p>}
      {state?.ok && task && <p className="text-sm text-accent">Alterações salvas.</p>}

      <div className="flex items-center justify-between gap-3 pt-1">
        {canDelete ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm("Excluir esta tarefa? Comentários, anexos e histórico também serão apagados.")) return;
              startDelete(async () => {
                const res = await deleteTask(task!.id);
                if (res.error) setError(res.error);
                else onDeleted?.();
              });
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
          >
            <Trash2 className="size-4" />
            Excluir tarefa
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm hover:bg-sand">
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
  );
}
