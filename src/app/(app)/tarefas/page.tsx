import { PageHeader } from "@/components/page-header";
import { requireArea } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Task, TeamMember } from "@/lib/tasks";
import { TaskBoard } from "./task-board";

export const metadata = { title: "Tarefas | Paula Chiaradia" };

export default async function TarefasPage() {
  const user = await requireArea("tarefas");
  const supabase = await createClient();

  const [{ data: tasks }, { data: people }] = await Promise.all([
    supabase.from("tasks").select("*, task_comments(count), task_attachments(count)").order("due_date", { ascending: true, nullsFirst: false }).order("created_at"),
    supabase.from("profiles").select("id, full_name, email, avatar_url, active").order("full_name"),
  ]);

  const team: TeamMember[] = (people ?? []).map((p) => ({
    id: p.id,
    name: p.full_name || p.email?.split("@")[0] || "Sem nome",
    avatarUrl: p.avatar_url,
    active: p.active,
  }));

  const list: Task[] = (tasks ?? []).map((t) => ({
    ...t,
    checklist: t.checklist ?? [],
    comments: (t.task_comments as { count: number }[] | undefined)?.[0]?.count ?? 0,
    attachments: (t.task_attachments as { count: number }[] | undefined)?.[0]?.count ?? 0,
  }));

  return (
    <>
      <PageHeader title="Tarefas" description="Quadro da equipe: o que está planejado, em andamento e concluído." />
      <TaskBoard
        tasks={list}
        team={team}
        me={{ id: user.id, canDeleteAll: user.role === "admin" || user.role === "gestor" }}
      />
    </>
  );
}
