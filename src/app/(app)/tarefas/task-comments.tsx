"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Download,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  Paperclip,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import type { Task, TeamMember } from "@/lib/tasks";
import { addComment, deleteAttachment, deleteComment, getTaskThread, type Attachment, type TaskThread, type UploadedFile } from "./actions";
import type { Me } from "./task-dialog";

const BUCKET = "task-files";
const MAX_BYTES = 25 * 1024 * 1024;

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

const ext = (name: string) => (name.includes(".") ? name.split(".").pop()!.toUpperCase().slice(0, 5) : "ARQ");
const isImage = (a: { mime: string | null; name: string }) =>
  (a.mime ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|svg)$/i.test(a.name);

function kindOf(a: { mime: string | null; name: string }) {
  const n = a.name.toLowerCase();
  const m = a.mime ?? "";
  if (isImage(a)) return "imagem";
  if (m.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/.test(n)) return "video";
  if (/\.(xlsx?|csv|ods)$/.test(n) || m.includes("spreadsheet") || m.includes("excel")) return "planilha";
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return "compactado";
  if (/\.(pdf|docx?|odt|txt|rtf|pptx?)$/.test(n) || m.includes("pdf") || m.includes("word") || m.startsWith("text/")) return "documento";
  return "outro";
}

/** Ícone do tipo de arquivo (imagem, planilha, documento…). */
function FileTypeIcon({ file, className }: { file: { mime: string | null; name: string }; className?: string }) {
  switch (kindOf(file)) {
    case "imagem":
      return <FileImage className={className} />;
    case "video":
      return <FileVideo className={className} />;
    case "planilha":
      return <FileSpreadsheet className={className} />;
    case "compactado":
      return <FileArchive className={className} />;
    case "documento":
      return <FileText className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}

/** Nome seguro para o caminho no armazenamento (o nome original fica salvo no banco). */
function safeName(name: string) {
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
  return clean.slice(-80) || "arquivo";
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export function CommentsTab({ task, team, me }: { task: Task; team: TeamMember[]; me: Me }) {
  const [thread, setThread] = useState<TaskThread | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const member = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);
  const endRef = useRef<HTMLDivElement>(null);

  // Carrega ao abrir e quando alguém comenta/anexa (tempo real atualiza os contadores da tarefa)
  useEffect(() => {
    let active = true;
    getTaskThread(task.id).then((t) => active && setThread(t));
    return () => {
      active = false;
    };
  }, [task.id, task.comments, task.attachments, version]);

  // Miniaturas das imagens: links temporários (a pasta é privada)
  useEffect(() => {
    const paths = (thread?.attachments ?? []).filter(isImage).map((a) => a.path).filter((p) => !thumbs[p]);
    if (!paths.length) return;
    let active = true;
    createClient()
      .storage.from(BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!active || !data) return;
        setThumbs((t) => ({ ...t, ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string])) }));
      });
    return () => {
      active = false;
    };
  }, [thread, thumbs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.comments.length]);

  const byComment = useMemo(() => {
    const map = new Map<string, Attachment[]>();
    for (const a of thread?.attachments ?? []) {
      if (!a.comment_id) continue;
      map.set(a.comment_id, [...(map.get(a.comment_id) ?? []), a]);
    }
    return map;
  }, [thread]);

  const refresh = () => setVersion((v) => v + 1);
  const canDelete = (uploader: string | null) => me.canDeleteAll || uploader === me.id;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {thread === null ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </p>
        ) : (
          <>
            {thread.attachments.length > 0 && (
              <section className="mb-6">
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Arquivos da tarefa · {thread.attachments.length}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {thread.attachments.map((a) => (
                    <AttachmentTile
                      key={a.id}
                      a={a}
                      thumb={thumbs[a.path]}
                      uploader={a.uploader_id ? member.get(a.uploader_id)?.name : undefined}
                      canDelete={canDelete(a.uploader_id)}
                      onDeleted={refresh}
                    />
                  ))}
                </div>
              </section>
            )}

            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Conversa</h3>
            {thread.comments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                Nenhum comentário ainda. Escreva abaixo ou arraste arquivos para cá.
              </p>
            ) : (
              <ul className="space-y-4">
                {thread.comments.map((c) => {
                  const author = c.author_id ? member.get(c.author_id) : undefined;
                  const files = byComment.get(c.id) ?? [];
                  return (
                    <li key={c.id} className="group flex gap-3">
                      <Avatar name={author?.name ?? "?"} url={author?.avatarUrl} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">
                          <span className="font-medium text-foreground">{author?.name ?? "Usuário removido"}</span> · {when(c.created_at)}
                          {c.author_id === me.id && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Apagar este comentário?")) return;
                                await deleteComment(c.id);
                                refresh();
                              }}
                              className="ml-2 opacity-0 transition hover:text-danger group-hover:opacity-100"
                            >
                              apagar
                            </button>
                          )}
                        </p>
                        <div className="mt-1 inline-block max-w-full rounded-2xl rounded-tl-sm border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm">
                          <p className="whitespace-pre-line break-words">{c.body}</p>
                          {files.length > 0 && (
                            <div className="mt-2 grid gap-1.5">
                              {files.map((a) => (
                                <AttachmentTile
                                  key={a.id}
                                  a={a}
                                  thumb={thumbs[a.path]}
                                  compact
                                  canDelete={canDelete(a.uploader_id)}
                                  onDeleted={refresh}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>
      <Composer taskId={task.id} onSent={refresh} />
    </div>
  );
}

function AttachmentTile({
  a,
  thumb,
  uploader,
  compact,
  canDelete,
  onDeleted,
}: {
  a: Attachment;
  thumb?: string;
  uploader?: string;
  compact?: boolean;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string>();

  // Abre imagens e PDFs no navegador; os demais tipos baixam com o nome original
  async function open(download: boolean) {
    const { data } = await createClient()
      .storage.from(BUCKET)
      .createSignedUrl(a.path, 120, download ? { download: a.name } : undefined);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }
  const viewable = isImage(a) || /\.pdf$/i.test(a.name) || a.mime === "application/pdf";

  return (
    <div className={`group/file flex items-center gap-3 rounded-xl border border-border bg-surface ${compact ? "p-1.5 pr-2" : "p-2 pr-3"}`}>
      <button
        type="button"
        onClick={() => open(!viewable)}
        title={viewable ? "Abrir" : "Baixar"}
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand ${compact ? "size-9" : "size-12"}`}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- link temporário do armazenamento privado
          <img src={thumb} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center">
            <FileTypeIcon file={a} className={`${compact ? "size-4" : "size-5"} text-accent`} />
            {!compact && <span className="mt-0.5 text-[9px] font-semibold tracking-wide text-muted">{ext(a.name)}</span>}
          </span>
        )}
      </button>
      <button type="button" onClick={() => open(!viewable)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium hover:underline">{a.name}</p>
        <p className="truncate text-xs text-muted">
          {formatSize(a.size)}
          {uploader && ` · ${uploader.split(" ")[0]}`}
          {!compact && ` · ${when(a.created_at)}`}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" onClick={() => open(true)} aria-label={`Baixar ${a.name}`} title="Baixar" className="rounded-md p-1.5 text-muted hover:bg-sand hover:text-foreground">
          <Download className="size-4" />
        </button>
        {canDelete && (
          <button
            type="button"
            disabled={busy}
            aria-label={`Remover ${a.name}`}
            title="Remover"
            onClick={() => {
              if (!confirm(`Remover o arquivo "${a.name}"?`)) return;
              start(async () => {
                const res = await deleteAttachment(a.id);
                if (res.error) setError(res.error);
                else onDeleted();
              });
            }}
            className="rounded-md p-1.5 text-muted opacity-0 transition hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover/file:opacity-100"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

type Pending = { id: string; file: File };

function Composer({ taskId, onSent }: { taskId: string; onSent: () => void }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const tooBig = incoming.filter((f) => f.size > MAX_BYTES);
    setError(tooBig.length ? `Arquivo acima de 25 MB: ${tooBig.map((f) => f.name).join(", ")}` : undefined);
    setFiles((cur) => [...cur, ...incoming.filter((f) => f.size <= MAX_BYTES).map((file) => ({ id: crypto.randomUUID(), file }))].slice(0, 20));
  }

  async function send() {
    if (sending || (!text.trim() && !files.length)) return;
    setSending(true);
    setError(undefined);
    const supabase = createClient();
    const uploaded: UploadedFile[] = [];
    for (const { file } of files) {
      const path = `${taskId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) {
        setError(`Não foi possível enviar "${file.name}": ${upErr.message}`);
        if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded.map((u) => u.path));
        setSending(false);
        return;
      }
      uploaded.push({ path, name: file.name, size: file.size, mime: file.type || null });
    }
    const res = await addComment(taskId, text, uploaded);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setText("");
    setFiles([]);
    onSent();
  }

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      className={`relative border-t border-border bg-surface px-6 py-4 transition ${dragging ? "bg-accent/5" : ""}`}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-surface/90 text-sm text-accent">
          <UploadCloud className="size-5" /> Solte os arquivos para anexar
        </div>
      )}
      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {files.map(({ id, file }) => {
            return (
              <li key={id} className="flex max-w-60 items-center gap-1.5 rounded-lg border border-border bg-background py-1 pl-2 pr-1 text-xs">
                <FileTypeIcon file={{ mime: file.type, name: file.name }} className="size-3.5 shrink-0 text-accent" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-muted">{formatSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles((f) => f.filter((x) => x.id !== id))}
                  aria-label={`Tirar ${file.name}`}
                  disabled={sending}
                  className="rounded p-0.5 text-muted hover:text-danger"
                >
                  <X className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={sending}
          aria-label="Anexar arquivos"
          title="Anexar arquivos (imagens, PDF, Excel, Word…)"
          className="rounded-lg border border-border p-2.5 text-muted hover:bg-sand hover:text-foreground"
        >
          <Paperclip className="size-4" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          onPaste={(e) => e.clipboardData.files.length && addFiles(e.clipboardData.files)}
          rows={2}
          placeholder="Escreva um comentário… (Ctrl+Enter envia · arraste ou cole arquivos)"
          className="min-h-[44px] flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || (!text.trim() && !files.length)}
          aria-label="Enviar"
          className="flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2.5 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          <span className="hidden sm:inline">{sending ? (files.length ? "Enviando arquivos…" : "Enviando…") : "Enviar"}</span>
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
