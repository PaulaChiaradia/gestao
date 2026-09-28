"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, RotateCcw, Send, Trash2, UserRound, X } from "lucide-react";
import { deleteKnowledge, saveKnowledge, saveSettings, testBot } from "./actions";

const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

type Settings = {
  enabled: boolean;
  assistant_name: string;
  tone: string;
  greeting: string | null;
  business_hours: string | null;
  pricing_policy: string;
  qualify_questions: string | null;
  handoff_rules: string | null;
  model: string;
  effort: string;
};

export function SettingsForm({ settings, models }: { settings: Settings; models: readonly { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm sm:col-span-2">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-4 accent-[var(--accent)]" />
        <span>
          <strong>Robô ligado</strong>
          <span className="block text-muted">
            Quando o WhatsApp e o Instagram estiverem conectados, o robô responde automaticamente. Desligado, as mensagens
            vão direto para a equipe.
          </span>
        </span>
      </label>
      <Field label="Nome do assistente">
        <input name="assistant_name" defaultValue={settings.assistant_name} className={field} />
      </Field>
      <Field label="Preços que o robô pode informar">
        <select name="pricing_policy" defaultValue={settings.pricing_policy} className={field}>
          <option value="produtos">Só de cursos e ebooks</option>
          <option value="todos">Todos os que estão na base</option>
          <option value="nenhum">Nenhum</option>
        </select>
      </Field>
      <Field label="Tom de voz" className="sm:col-span-2">
        <textarea name="tone" rows={3} defaultValue={settings.tone} className={field} />
      </Field>
      <Field label="Saudação" className="sm:col-span-2">
        <input name="greeting" defaultValue={settings.greeting ?? ""} className={field} />
      </Field>
      <Field label="Horário de atendimento da equipe" className="sm:col-span-2">
        <input name="business_hours" defaultValue={settings.business_hours ?? ""} className={field} />
      </Field>
      <Field label="Perguntas para qualificar pedidos de palestra" className="sm:col-span-2">
        <textarea name="qualify_questions" rows={6} defaultValue={settings.qualify_questions ?? ""} className={field} />
      </Field>
      <Field label="Quando passar a conversa para a equipe" className="sm:col-span-2">
        <textarea name="handoff_rules" rows={5} defaultValue={settings.handoff_rules ?? ""} className={field} />
      </Field>
      <Field label="Modelo de IA">
        <select name="model" defaultValue={settings.model} className={field}>
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nível de raciocínio">
        <select name="effort" defaultValue={settings.effort} className={field}>
          <option value="low">Baixo (respostas rápidas — recomendado)</option>
          <option value="medium">Médio</option>
          <option value="high">Alto (mais lento e mais caro)</option>
        </select>
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvar configurações
        </button>
        {state?.ok && <span className="text-sm text-accent">Salvo.</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

export type Knowledge = {
  id: string;
  category: string;
  title: string;
  content: string;
  active: boolean;
  needs_review: boolean;
  review_note: string | null;
};

export function KnowledgeList({ items }: { items: Knowledge[] }) {
  const [editing, setEditing] = useState<Knowledge | "new" | null>(null);
  const pendingReview = items.filter((i) => i.needs_review).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {pendingReview > 0 ? (
          <p className="flex items-center gap-2 text-sm text-[#8a5a00]">
            <AlertTriangle className="size-4" />
            {pendingReview} {pendingReview === 1 ? "item precisa" : "itens precisam"} de revisão antes de ligar o robô
          </p>
        ) : (
          <span />
        )}
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-sand"
        >
          <Plus className="size-4" />
          Novo item
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((k) => (
          <li
            key={k.id}
            className={`rounded-xl border p-4 ${k.needs_review ? "border-[#e8c46b] bg-[#fdf6e3]" : "border-border bg-background"} ${
              k.active ? "" : "opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {k.category}
                  {!k.active && " · desativado"}
                </p>
                <p className="font-medium">{k.title}</p>
              </div>
              <button
                onClick={() => setEditing(k)}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-sand"
              >
                <Pencil className="size-3.5" />
                {k.needs_review ? "Revisar" : "Editar"}
              </button>
            </div>
            {k.needs_review && k.review_note && (
              <p className="mt-2 flex gap-2 text-sm text-[#8a5a00]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {k.review_note}
              </p>
            )}
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted">{k.content}</p>
          </li>
        ))}
      </ul>
      {editing && (
        <KnowledgeDialog
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function KnowledgeDialog({ item, onClose }: { item: Knowledge | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveKnowledge, undefined);
  const [deleting, startDelete] = useTransition();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(680px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/30"
    >
      <form action={action} className="max-h-[85dvh] space-y-4 overflow-y-auto p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide">{item ? "Editar item" : "Novo item"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-sand">
            <X className="size-5" />
          </button>
        </div>
        {item?.needs_review && item.review_note && (
          <p className="flex gap-2 rounded-lg bg-[#fdf6e3] p-3 text-sm text-[#8a5a00]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {item.review_note} Ao salvar, o item fica marcado como revisado.
          </p>
        )}
        {item && <input type="hidden" name="id" value={item.id} />}
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <Field label="Categoria">
            <input name="category" defaultValue={item?.category ?? ""} placeholder="Produtos" className={field} />
          </Field>
          <Field label="Título">
            <input name="title" required defaultValue={item?.title ?? ""} className={field} />
          </Field>
        </div>
        <Field label="Conteúdo (o que o robô deve saber)">
          <textarea name="content" required rows={12} defaultValue={item?.content ?? ""} className={field} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="size-4 accent-[var(--accent)]" />
          Usar este item nas respostas
        </label>
        {state?.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
        <div className="flex items-center justify-between">
          {item ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (!confirm("Excluir este item da base?")) return;
                startDelete(async () => {
                  await deleteKnowledge(item.id);
                  onClose();
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
          <button
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </dialog>
  );
}

type Msg = { role: "user" | "assistant"; content: string; handoff?: boolean };

export function TestChat({ ready }: { ready: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending]);

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(undefined);
    startTransition(async () => {
      const res = await testBot(next.map(({ role, content }) => ({ role, content })));
      if (res.ok) setMessages([...next, { role: "assistant", content: res.text, handoff: res.handoff }]);
      else setError(res.error);
    });
  }

  return (
    <div className="flex h-[560px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-[#efeae2] p-3">
        {!messages.length && (
          <p className="mt-8 px-4 text-center text-sm text-muted">
            {ready
              ? "Escreva como se fosse um cliente. Ex.: “Oi, quanto custa o curso?” ou “Quero uma palestra para minha equipe”."
              : "Configure a chave da API da Anthropic para testar o robô."}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm shadow-sm ${
                m.role === "user" ? "bg-[#d9fdd3]" : "bg-surface"
              }`}
            >
              {m.content}
              {m.handoff && (
                <span className="mt-2 flex items-center gap-1.5 border-t border-border pt-1.5 text-xs text-accent">
                  <UserRound className="size-3.5" />
                  Encaminhado para a equipe
                </span>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-muted shadow-sm">
              <Loader2 className="size-3.5 animate-spin" />
              digitando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {error && <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setError(undefined);
          }}
          title="Recomeçar conversa"
          aria-label="Recomeçar conversa"
          className="rounded-lg border border-border p-2.5 text-muted hover:bg-sand"
        >
          <RotateCcw className="size-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!ready}
          placeholder="Mensagem do cliente…"
          className={`${field} flex-1`}
        />
        <button
          disabled={!ready || pending || !input.trim()}
          aria-label="Enviar"
          className="rounded-lg bg-foreground p-2.5 text-background hover:bg-foreground/85 disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
