export const STAGES = [
  { value: "novo", label: "Novo contato" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta", label: "Proposta enviada" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
] as const;
export type Stage = (typeof STAGES)[number]["value"];
export const OPEN_STAGES: Stage[] = ["novo", "qualificado", "proposta"];

export const KINDS = [
  { value: "palestra", label: "Palestra" },
  { value: "treinamento", label: "Treinamento" },
  { value: "consultoria", label: "Consultoria" },
  { value: "mentoria", label: "Mentoria" },
  { value: "outro", label: "Outro" },
] as const;

export const FORMATS = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "hibrido", label: "Híbrido" },
] as const;

export const SOURCES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "E-mail" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "robo", label: "Robô de atendimento" },
  { value: "outro", label: "Outro" },
] as const;

export type Opportunity = {
  id: string;
  title: string;
  kind: string;
  stage: Stage;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  event_date: string | null;
  audience: number | null;
  format: string | null;
  value: number | null;
  source: string | null;
  notes: string | null;
  lost_reason: string | null;
  stage_changed_at: string;
  created_at: string;
};

export const labelOf = (list: readonly { value: string; label: string }[], value: string | null) =>
  list.find((i) => i.value === value)?.label ?? value ?? "";
