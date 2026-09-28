"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, CalendarDays, Loader2, Paperclip, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { formatDue, statusLabel, type Task, type TeamMember } from "@/lib/tasks";
import { getTaskActivity, type Activity } from "./actions";

const PAGE = 30;

const ICONS: Record<string, typeof Plus> = {
  criou: Plus,
  moveu: ArrowRight,
  atribuiu: UserRound,
  prazo: CalendarDays,
  editou: Pencil,
  anexou: Paperclip,
  "removeu anexo": Trash2,
};

function dayLabel(iso: string) {
  const d = new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  if (d === today) return "Hoje";
  if (d === yesterday) return "Ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

export function HistoryTab({ task, team }: { task: Task; team: TeamMember[] }) {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, startMore] = useTransition();
  const member = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);
  const nameOf = (id: string | null) => (id ? (member.get(id)?.name ?? "Usuário removido") : "Sistema");

  // Primeira página ao abrir e sempre que a tarefa muda (tempo real)
  useEffect(() => {
    let active = true;
    getTaskActivity(task.id, 0, PAGE).then((r) => {
      if (!active) return;
      setItems(r.items);
      setTotal(r.total);
    });
    return () => {
      active = false;
    };
  }, [task.id, task.status, task.assignee_id, task.due_date, task.title, task.priority, task.category, task.attachments]);

  function describe(a: Activity) {
    switch (a.action) {
      case "criou":
        return <>criou a tarefa</>;
      case "moveu":
        return (
          <>
            moveu de <Chip>{statusLabel(a.from_value ?? "")}</Chip> para <Chip>{statusLabel(a.to_value ?? "")}</Chip>
          </>
        );
      case "atribuiu":
        return <>definiu o responsável: <strong className="font-medium text-foreground">{a.to_value ? nameOf(a.to_value) : "ninguém"}</strong></>;
      case "prazo":
        return (
          <>
            mudou o vencimento {a.from_value && <>de {formatDue(a.from_value)} </>}para{" "}
            <strong className="font-medium text-foreground">{formatDue(a.to_value) ?? "sem prazo"}</strong>
          </>
        );
      case "editou":
        return <>editou {a.to_value}</>;
      case "anexou":
        return <>anexou <strong className="font-medium text-foreground">{a.to_value}</strong></>;
      case "removeu anexo":
        return <>removeu o anexo <span className="line-through">{a.from_value}</span></>;
      default:
        return <>{a.action}</>;
    }
  }

  if (items === null) {
    return (
      <p className="flex items-center gap-2 px-6 py-5 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </p>
    );
  }

  // Agrupa por dia, mantendo a ordem (mais recente primeiro)
  const groups: { day: string; items: Activity[] }[] = [];
  for (const a of items) {
    const day = dayLabel(a.created_at);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1)!.items.push(a);
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {groups.map((g) => (
        <section key={g.day} className="mb-5">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{g.day}</h3>
          <ol className="relative space-y-4 border-l border-border pl-6">
            {g.items.map((a) => {
              const Icon = ICONS[a.action] ?? Pencil;
              const actor = a.actor_id ? member.get(a.actor_id) : undefined;
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[37px] flex size-6 items-center justify-center rounded-full border border-border bg-surface">
                    <Icon className="size-3 text-accent" />
                  </span>
                  <div className="flex items-start gap-2 text-sm">
                    <Avatar name={actor?.name ?? nameOf(a.actor_id)} url={actor?.avatarUrl} size={20} />
                    <p className="text-muted">
                      <strong className="font-medium text-foreground">{nameOf(a.actor_id)}</strong> {describe(a)}
                      <span className="ml-2 text-xs tabular-nums">
                        {new Date(a.created_at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {items.length < total && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() =>
            startMore(async () => {
              const r = await getTaskActivity(task.id, items.length, PAGE);
              setItems((cur) => [...(cur ?? []), ...r.items]);
              setTotal(r.total);
            })
          }
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-sand"
        >
          {loadingMore && <Loader2 className="size-4 animate-spin" />}
          Carregar mais ({total - items.length})
        </button>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="mx-0.5 rounded-full bg-sand px-2 py-0.5 text-xs text-foreground">{children}</span>;
}
