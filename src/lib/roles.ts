export const ROLES = ["admin", "gestor", "marketing", "atendimento", "visualizador"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  marketing: "Marketing",
  atendimento: "Atendimento",
  visualizador: "Visualizador",
};

export type Area =
  | "painel"
  | "vendas"
  | "anuncios"
  | "instagram"
  | "atendimento"
  | "pipeline"
  | "contatos"
  | "bot"
  | "configuracoes";

const ACCESS: Record<Area, Role[]> = {
  painel: ["admin", "gestor", "marketing", "atendimento", "visualizador"],
  vendas: ["admin", "gestor", "visualizador"],
  anuncios: ["admin", "gestor", "marketing", "visualizador"],
  instagram: ["admin", "gestor", "marketing", "visualizador"],
  atendimento: ["admin", "gestor", "atendimento"],
  pipeline: ["admin", "gestor", "atendimento"],
  contatos: ["admin", "gestor", "atendimento"],
  bot: ["admin", "gestor"],
  configuracoes: ["admin"],
};

export function canAccess(role: Role, area: Area) {
  return ACCESS[area].includes(role);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
