"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { CalendarDays, Loader2, MapPin, Plus, Trash2, Users, X } from "lucide-react";
import { UF_NAMES } from "@/lib/brazil";
import { formatBRL, formatInt } from "@/lib/format";
import { FORMATS, KINDS, labelOf, SOURCES, STAGES, type Opportunity, type Stage } from "@/lib/pipeline";
import { deleteOpportunity, moveOpportunity, saveOpportunity } from "./actions";

const fmtDate = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : null);

export function Board({ items, canDelete }: { items: Opportunity[]; canDelete: boolean }) {
  const [optimistic, applyMove] = useOptimistic(items, (state, move: { id: string; stage: Stage }) =>
    state.map((o) => (o.id === move.id ? { ...o, stage: move.stage } : o)),
  );
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [editing, setEditing] = useState<Opportunity | "new" | null>(null);

  function move(id: string, stage: Stage) {
    startTransition(async () => {
      applyMove({ id, stage });
      await moveOpportunity(id, stage);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/85"
        >
          <Plus className="size-4" />
          Nova oportunidade
        </button>
      </div>

      <div className="-mx-4 grid auto-cols-[minmax(12.5rem,1fr)] grid-flow-col gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        {STAGES.map((stage) => {
          const cards = optimistic.filter((o) => o.stage === stage.value);
          const total = cards.reduce((s, o) => s + Number(o.value ?? 0), 0);
          return (
            <section
              key={stage.value}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage.value);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, stage.value);
              }}
              className={`flex min-w-0 flex-col rounded-2xl border p-3 transition ${
                dragOver === stage.value ? "border-accent bg-accent/5" : "border-border bg-sand/40"
              }`}
            >
              <header className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-medium">
                  {stage.label} <span className="font-normal text-muted">· {cards.length}</span>
                </h2>
                {total > 0 && <span className="text-xs tabular-nums text-muted">{formatBRL(total)}</span>}
              </header>

              <ul className="min-h-24 flex-1 space-y-2">
                {cards.map((o) => (
                  <li
                    key={o.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
                    onClick={() => setEditing(o)}
                    className="cursor-pointer rounded-xl border border-border bg-surface p-3 text-sm shadow-sm transition hover:border-accent/50"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted">{labelOf(KINDS, o.kind)}</p>
                    <p className="mt-0.5 font-medium leading-snug">{o.title}</p>
                    {o.company && <p className="text-muted">{o.company}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      {(o.city || o.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {[o.city, o.state].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {o.event_date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {fmtDate(o.event_date)}
                        </span>
                      )}
                      {o.audience ? (
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {formatInt(o.audience)}
                        </span>
                      ) : null}
                    </div>
                    {o.value ? <p className="mt-2 font-medium tabular-nums">{formatBRL(Number(o.value))}</p> : null}
                  </li>
                ))}
                {!cards.length && (
                  <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                    Arraste cartões para cá
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {editing && (
        <OpportunityDialog
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          canDelete={canDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

function OpportunityDialog({
  item,
  canDelete,
  onClose,
}: {
  item: Opportunity | null;
  canDelete: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveOpportunity, undefined);
  const [stage, setStage] = useState<Stage>(item?.stage ?? "novo");
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const money = item?.value
    ? Number(item.value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/30"
    >
      <form action={action} className="max-h-[85dvh] overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide">{item ? "Editar oportunidade" : "Nova oportunidade"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-sand">
            <X className="size-5" />
          </button>
        </div>

        {item && <input type="hidden" name="id" value={item.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <input
              name="title"
              required
              defaultValue={item?.title}
              placeholder="Ex.: Palestra Associação Comercial de Campinas"
              className={field}
            />
          </Field>
          <Field label="Tipo">
            <Select name="kind" options={KINDS} defaultValue={item?.kind ?? "palestra"} />
          </Field>
          <Field label="Etapa">
            <select name="stage" value={stage} onChange={(e) => setStage(e.target.value as Stage)} className={field}>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          {stage === "perdido" && (
            <Field label="Motivo da perda" className="sm:col-span-2">
              <input name="lost_reason" defaultValue={item?.lost_reason ?? ""} placeholder="Ex.: orçamento, data" className={field} />
            </Field>
          )}

          <Field label="Empresa / instituição">
            <input name="company" defaultValue={item?.company ?? ""} className={field} />
          </Field>
          <Field label="Origem do contato">
            <Select name="source" options={SOURCES} defaultValue={item?.source ?? ""} empty="—" />
          </Field>
          <Field label="Nome do contato">
            <input name="contact_name" defaultValue={item?.contact_name ?? ""} className={field} />
          </Field>
          <Field label="WhatsApp / telefone">
            <input name="contact_phone" defaultValue={item?.contact_phone ?? ""} inputMode="tel" className={field} />
          </Field>
          <Field label="E-mail" className="sm:col-span-2">
            <input name="contact_email" type="email" defaultValue={item?.contact_email ?? ""} className={field} />
          </Field>

          <Field label="Cidade">
            <input name="city" defaultValue={item?.city ?? ""} className={field} />
          </Field>
          <Field label="Estado">
            <select name="state" defaultValue={item?.state ?? ""} className={field}>
              <option value="">—</option>
              {Object.entries(UF_NAMES).map(([uf, name]) => (
                <option key={uf} value={uf}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data do evento">
            <input name="event_date" type="date" defaultValue={item?.event_date ?? ""} className={field} />
          </Field>
          <Field label="Formato">
            <Select name="format" options={FORMATS} defaultValue={item?.format ?? ""} empty="—" />
          </Field>
          <Field label="Participantes">
            <input name="audience" type="number" min={0} defaultValue={item?.audience ?? ""} className={field} />
          </Field>
          <Field label="Valor (R$)">
            <input name="value" inputMode="decimal" defaultValue={money} placeholder="Ex.: 8.500,00" className={field} />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <textarea name="notes" rows={3} defaultValue={item?.notes ?? ""} className={field} />
          </Field>
        </div>

        {state?.error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          {item && canDelete ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (!confirm("Excluir esta oportunidade?")) return;
                startDelete(async () => {
                  await deleteOpportunity(item.id);
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
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-sand">
              Cancelar
            </button>
            <button
              disabled={pending}
              className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      </form>
    </dialog>
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

function Select({
  name,
  options,
  defaultValue,
  empty,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue: string;
  empty?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={field}>
      {empty && <option value="">{empty}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
