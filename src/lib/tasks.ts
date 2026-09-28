export const TASK_COLUMNS = [
  { value: "planejamento", label: "Em planejamento" },
  { value: "andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
] as const;
export type TaskStatus = (typeof TASK_COLUMNS)[number]["value"];

export const PRIORITIES = [
  { value: "urgente", label: "Urgente", tone: "bg-danger/10 text-danger" },
  { value: "alta", label: "Alta", tone: "bg-[#fdf1dc] text-[#8a5a00]" },
  { value: "media", label: "Média", tone: "bg-sand text-muted" },
  { value: "baixa", label: "Baixa", tone: "bg-background text-muted" },
] as const;
export type Priority = (typeof PRIORITIES)[number]["value"];

export const CATEGORIES = ["Vendas", "Marketing", "Conteúdo", "Atendimento", "Palestras", "Administrativo", "Outro"] as const;

export type ChecklistItem = { text: string; done: boolean };

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  category: string | null;
  assignee_id: string | null;
  due_date: string | null;
  checklist: ChecklistItem[];
  created_by: string | null;
  status_changed_at: string;
  completed_at: string | null;
  created_at: string;
  comments: number;
};

export type TeamMember = { id: string; name: string; avatarUrl: string | null; active?: boolean };

export const statusLabel = (s: string) => TASK_COLUMNS.find((c) => c.value === s)?.label ?? s;
export const priorityOf = (p: string) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[2];

/** Hoje (AAAA-MM-DD) no fuso de São Paulo, para comparar prazos. */
export function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Situação do prazo de uma tarefa aberta. */
export function dueState(task: Pick<Task, "due_date" | "status">): "atrasada" | "hoje" | "proxima" | null {
  if (!task.due_date || task.status === "concluido" || task.status === "cancelado") return null;
  const today = todayISO();
  if (task.due_date < today) return "atrasada";
  if (task.due_date === today) return "hoje";
  const inTwoDays = new Date(Date.now() + 2 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return task.due_date <= inTwoDays ? "proxima" : null;
}

export const formatDue = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : null);
