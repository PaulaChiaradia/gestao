"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckSquare, MessageSquare, Paperclip, Plus, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  dueRelative,
  dueState,
  formatDue,
  priorityOf,
  TASK_COLUMNS,

  type Task,
  type TaskStatus,
  type TeamMember,
} from "@/lib/tasks";
import { moveTask } from "./actions";
import { TaskDialog } from "./task-dialog";

const CLOSED_LIMIT = 25; // Concluído/Cancelado mostram as mais recentes

export function TaskBoard({
  tasks,
  team,
  me,
}: {
  tasks: Task[];
  team: TeamMember[];
  me: { id: string; canDeleteAll: boolean };
}) {
  const router = useRouter();
  const [optimistic, applyMove] = useOptimistic(tasks, (state, m: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === m.id ? { ...t, status: m.status } : t)),
  );
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [who, setWho] = useState<string>("todos");
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [sevenDaysAgo] = useState(() => Date.now() - 7 * 86_400_000);

  const member = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);

  // Tempo real: quando alguém cria, move ou comenta, o quadro de todos atualiza
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const refresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 300);
    };
    (async () => {
      // O canal precisa do login do usuário: sem ele, as regras de acesso bloqueiam os eventos
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel("quadro-tarefas")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" }, refresh)
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const filtered = optimistic.filter((t) => {
    if (who === "minhas" && t.assignee_id !== me.id) return false;
    if (who === "sem" && t.assignee_id) return false;
    if (who !== "todos" && who !== "minhas" && who !== "sem" && t.assignee_id !== who) return false;
    if (category && t.category !== category) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Resumo da equipe (sem filtros)
  const open = optimistic.filter((t) => t.status === "planejamento" || t.status === "andamento");
  const overdue = open.filter((t) => dueState(t) === "atrasada");
  const weekAgo = sevenDaysAgo;
  const doneWeek = optimistic.filter((t) => t.status === "concluido" && t.completed_at && Date.parse(t.completed_at) >= weekAgo);
  const mine = open.filter((t) => t.assignee_id === me.id);

  function move(id: string, status: TaskStatus) {
    startTransition(async () => {
      applyMove({ id, status });
      await moveTask(id, status);
    });
  }

  const tile = (label: string, value: number, hint: string, onClick?: () => void, alert = false) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-surface p-4 text-left transition hover:border-accent/40 ${alert && value ? "border-danger/30" : "border-border"}`}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold leading-tight ${alert && value ? "text-danger" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </button>
  );

  return (
    <>
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tile("Em andamento", optimistic.filter((t) => t.status === "andamento").length, "tarefas sendo feitas agora")}
        {tile("Atrasadas", overdue.length, "prazo vencido e ainda abertas", undefined, true)}
        {tile("Concluídas na semana", doneWeek.length, "últimos 7 dias")}
        {tile("Minhas tarefas abertas", mine.length, "clique para filtrar", () => setWho("minhas"))}
      </section>

      {/* Filtros: uma linha acima do quadro */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-surface p-0.5">
          {[
            ["todos", "Todas"],
            ["minhas", "Minhas"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setWho(v)}
              className={`rounded-md px-3 py-1.5 text-sm ${who === v ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <select
          aria-label="Responsável"
          value={["todos", "minhas"].includes(who) ? "" : who}
          onChange={(e) => setWho(e.target.value || "todos")}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          <option value="sem">Sem responsável</option>
          {team
            .filter((m) => m.active !== false)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarefa"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/85"
        >
          <Plus className="size-4" />
          Nova tarefa
        </button>
      </div>

      <div className="-mx-4 grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        {TASK_COLUMNS.map((col) => {
          const closed = col.value === "concluido" || col.value === "cancelado";
          let cards = filtered.filter((t) => t.status === col.value);
          if (closed) cards = [...cards].sort((a, b) => b.status_changed_at.localeCompare(a.status_changed_at));
          const hidden = closed && !showAllClosed ? Math.max(0, cards.length - CLOSED_LIMIT) : 0;
          if (hidden) cards = cards.slice(0, CLOSED_LIMIT);
          return (
            <section
              key={col.value}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.value);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, col.value);
              }}
              className={`flex min-w-0 flex-col rounded-2xl border p-3 transition ${
                dragOver === col.value ? "border-accent bg-accent/5" : "border-border bg-sand/40"
              }`}
            >
              <header className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-medium">
                  {col.label} <span className="font-normal text-muted">· {filtered.filter((t) => t.status === col.value).length}</span>
                </h2>
              </header>
              <ul className="min-h-24 flex-1 space-y-2">
                {cards.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    assignee={t.assignee_id ? member.get(t.assignee_id) : undefined}
                    onOpen={() => setEditing(t)}
                  />
                ))}
                {!cards.length && (
                  <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                    {col.value === "planejamento" ? "Crie uma tarefa em “Nova tarefa”" : "Arraste cartões para cá"}
                  </li>
                )}
              </ul>
              {hidden > 0 && (
                <button type="button" onClick={() => setShowAllClosed(true)} className="mt-2 text-xs text-muted hover:text-foreground">
                  Mostrar mais {hidden}
                </button>
              )}
            </section>
          );
        })}
      </div>

      {editing && (
        <TaskDialog
          key={editing === "new" ? "new" : editing.id}
          task={editing === "new" ? null : (optimistic.find((t) => t.id === editing.id) ?? editing)}
          team={team}
          me={me}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function TaskCard({ task, assignee, onOpen }: { task: Task; assignee?: TeamMember; onOpen: () => void }) {
  const due = dueState(task);
  const prio = priorityOf(task.priority);
  const done = task.checklist.filter((i) => i.done).length;
  const closed = task.status === "concluido" || task.status === "cancelado";
  const relative = dueRelative(task);

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      tabIndex={0}
      role="button"
      aria-label={`Abrir tarefa ${task.title}`}
      className={`cursor-pointer rounded-xl border bg-surface p-3 text-sm shadow-sm outline-none transition hover:border-accent/50 focus-visible:border-accent ${
        due === "atrasada" ? "border-danger/40" : "border-border"
      } ${closed ? "opacity-75" : ""}`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        {task.priority !== "media" && <span className={`rounded-full px-2 py-0.5 text-[11px] ${prio.tone}`}>{prio.label}</span>}
        {task.category && <span className="text-[11px] uppercase tracking-wide text-muted">{task.category}</span>}
      </div>
      <p className={`font-medium leading-snug ${task.status === "cancelado" ? "line-through" : ""}`}>{task.title}</p>

      {/* Vencimento: data em que a tarefa deve estar concluída */}
      {task.due_date && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Vencimento</p>
          <p
            className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs ${
              due === "atrasada" ? "font-medium text-danger" : due === "hoje" || due === "proxima" ? "text-[#8a5a00]" : "text-foreground"
            }`}
          >
            {due === "atrasada" ? <AlertTriangle className="size-3.5" /> : <CalendarDays className="size-3.5" />}
            <span className="tabular-nums">{formatDue(task.due_date)}</span>
            {relative && <span className={due ? "" : "text-muted"}>· {relative}</span>}
          </p>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {task.checklist.length > 0 && (
            <span className="flex items-center gap-1" title="Subtarefas concluídas">
              <CheckSquare className="size-3" />
              {done}/{task.checklist.length}
            </span>
          )}
          {task.comments > 0 && (
            <span className="flex items-center gap-1" title="Comentários">
              <MessageSquare className="size-3" />
              {task.comments}
            </span>
          )}
          {task.attachments > 0 && (
            <span className="flex items-center gap-1" title="Anexos">
              <Paperclip className="size-3" />
              {task.attachments}
            </span>
          )}
          {!task.checklist.length && !task.comments && !task.attachments && <span>{priorityOf(task.priority).label}</span>}
        </div>
        {assignee ? (
          <span className="flex items-center gap-1.5 text-xs text-muted" title={`Responsável: ${assignee.name}`}>
            <span className="max-w-24 truncate">{assignee.name.split(" ")[0]}</span>
            <Avatar name={assignee.name} url={assignee.avatarUrl} size={24} />
          </span>
        ) : (
          <span className="text-[11px] text-muted">sem responsável</span>
        )}
      </div>
    </li>
  );
}

