import {
  BarChart3,
  Bot,
  Contact,
  Camera,
  KanbanSquare,
  Link2,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  MessagesSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Area } from "./roles";

export type NavItem = { area: Area; href: string; label: string; icon: LucideIcon };

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Indicadores",
    items: [
      { area: "painel", href: "/", label: "Painel geral", icon: LayoutDashboard },
      { area: "vendas", href: "/vendas", label: "Vendas Hotmart", icon: BarChart3 },
      { area: "links", href: "/vendas/links", label: "Links rastreados", icon: Link2 },
      { area: "anuncios", href: "/anuncios", label: "Anúncios Meta", icon: Megaphone },
      { area: "instagram", href: "/instagram", label: "Instagram", icon: Camera },
    ],
  },
  {
    title: "Relacionamento",
    items: [
      { area: "atendimento", href: "/atendimento", label: "Atendimento", icon: MessagesSquare },
      { area: "pipeline", href: "/pipeline", label: "Palestras e treinamentos", icon: KanbanSquare },
      { area: "contatos", href: "/contatos", label: "Contatos", icon: Contact },
    ],
  },
  {
    title: "Equipe",
    items: [{ area: "tarefas", href: "/tarefas", label: "Tarefas", icon: ListTodo }],
  },
  {
    title: "Sistema",
    items: [
      { area: "bot", href: "/bot", label: "Robô de atendimento", icon: Bot },
      { area: "configuracoes", href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];
