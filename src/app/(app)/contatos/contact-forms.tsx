"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { UF_NAMES } from "@/lib/brazil";
import { parseCsv, rowsToContacts } from "@/lib/csv";
import { deleteContact, importContacts, saveContact, type ImportResult } from "./actions";

export type ContactFormValues = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  instagram_username: string | null;
  tags: string[];
  notes: string | null;
};

const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(600px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/30"
    >
      <div className="max-h-[85dvh] overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-sand">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function ContactButton({ contact, label }: { contact?: ContactFormValues; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          contact
            ? "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-sand"
            : "flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/85"
        }
      >
        {contact ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {label ?? (contact ? "Editar" : "Novo contato")}
      </button>
      {open && <ContactDialog contact={contact} onClose={() => setOpen(false)} />}
    </>
  );
}

function ContactDialog({ contact, onClose }: { contact?: ContactFormValues; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveContact, undefined);
  useEffect(() => {
    if (state?.ok) {
      onClose();
      if (!contact && state.id) router.push(`/contatos/${state.id}`);
    }
  }, [state, onClose, contact, router]);

  return (
    <Modal title={contact ? "Editar contato" : "Novo contato"} onClose={onClose}>
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        {contact && <input type="hidden" name="id" value={contact.id} />}
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-muted">Nome</span>
          <input name="name" defaultValue={contact?.name ?? ""} className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">E-mail</span>
          <input name="email" type="email" defaultValue={contact?.email ?? ""} className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">WhatsApp / telefone</span>
          <input name="phone" inputMode="tel" defaultValue={contact?.phone ?? ""} className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Cidade</span>
          <input name="city" defaultValue={contact?.city ?? ""} className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Estado</span>
          <select name="state" defaultValue={contact?.state ?? ""} className={field}>
            <option value="">—</option>
            {Object.entries(UF_NAMES).map(([uf, name]) => (
              <option key={uf} value={uf}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Instagram</span>
          <input name="instagram_username" placeholder="@usuario" defaultValue={contact?.instagram_username ?? ""} className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Etiquetas (separe por vírgula)</span>
          <input name="tags" placeholder="lojista, vip" defaultValue={contact?.tags.join(", ") ?? ""} className={field} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-muted">Observações</span>
          <textarea name="notes" rows={3} defaultValue={contact?.notes ?? ""} className={field} />
        </label>
        {state?.error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
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
      </form>
    </Modal>
  );
}

export function DeleteContactButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      onClick={async () => {
        if (!confirm("Excluir este contato? As compras continuam registradas em Vendas.")) return;
        setPending(true);
        await deleteContact(id);
        router.push("/contatos");
      }}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
    >
      <Trash2 className="size-4" />
      Excluir
    </button>
  );
}

export function ImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm hover:bg-sand"
      >
        <FileUp className="size-4" />
        Importar planilha
      </button>
      {open && <ImportDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [records, setRecords] = useState<Record<string, string>[] | null>(null);
  const [mapped, setMapped] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult>();

  async function onFile(file: File) {
    setError(undefined);
    setResult(undefined);
    const text = await file.text();
    const { records, mapped } = rowsToContacts(parseCsv(text));
    if (!mapped.some((m) => ["name", "email", "phone"].includes(m))) {
      setError("Não encontrei colunas de nome, e-mail ou telefone no cabeçalho da planilha.");
      return;
    }
    setRecords(records);
    setMapped(mapped);
  }

  async function run() {
    if (!records) return;
    setPending(true);
    const total: ImportResult = { created: 0, updated: 0, skipped: 0 };
    for (let i = 0; i < records.length; i += 1000) {
      const r = await importContacts(records.slice(i, i + 1000));
      total.created += r.created;
      total.updated += r.updated;
      total.skipped += r.skipped;
      if (r.error) {
        total.error = r.error;
        break;
      }
    }
    setPending(false);
    setResult(total);
    router.refresh();
  }

  const LABELS: Record<string, string> = {
    name: "Nome",
    email: "E-mail",
    phone: "Telefone",
    city: "Cidade",
    state: "Estado",
    instagram_username: "Instagram",
    tags: "Etiquetas",
    notes: "Observações",
  };

  return (
    <Modal title="Importar planilha" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          Salve a planilha como <strong>CSV</strong> (Excel: Arquivo → Salvar como → CSV). A primeira linha deve ter os
          nomes das colunas, por exemplo: Nome, E-mail, Telefone, Cidade, Estado, Instagram, Etiquetas. Contatos que já
          existem (mesmo e-mail ou telefone) são completados, sem apagar nada.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sand file:px-3 file:py-2"
        />
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-danger">{error}</p>}
        {records && !result && (
          <div className="rounded-lg bg-background p-3">
            <p>
              <strong>{records.length}</strong> linhas encontradas. Colunas reconhecidas:{" "}
              {mapped.map((m) => LABELS[m]).join(", ")}.
            </p>
          </div>
        )}
        {result && (
          <p className={`rounded-lg px-3 py-2 ${result.error ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}`}>
            {result.error ? `${result.error} ` : ""}
            {result.created} novos, {result.updated} atualizados, {result.skipped} {result.skipped === 1 ? "linha ignorada" : "linhas ignoradas"} (vazias ou repetidas).
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-sand">
            {result ? "Fechar" : "Cancelar"}
          </button>
          {!result && (
            <button
              disabled={!records || pending}
              onClick={run}
              className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 font-medium text-background hover:bg-foreground/85 disabled:opacity-50"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Importar
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
