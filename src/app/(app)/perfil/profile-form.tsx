"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import { removeAvatar, setAvatar, updateName } from "./actions";

const SIZE = 512; // foto salva em 512×512, recortada no centro

/** Recorta a imagem em quadrado no centro e reduz para 512 px (WebP), direto no navegador. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(SIZE, side);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao converter a imagem"))), "image/webp", 0.88),
  );
}

export function PhotoForm({ userId, name, avatarUrl }: { userId: string; name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, startTransition] = useTransition();

  function onPick(file: File) {
    setError(undefined);
    if (!file.type.startsWith("image/")) return setError("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
    if (file.size > 15 * 1024 * 1024) return setError("A imagem é muito grande (máximo 15 MB).");

    startTransition(async () => {
      try {
        const blob = await toSquareWebp(file);
        setPreview(URL.createObjectURL(blob));
        const path = `${userId}/${Date.now()}.webp`;
        const { error: upErr } = await createClient()
          .storage.from("avatars")
          .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
        if (upErr) throw upErr;
        const res = await setAvatar(path);
        if (res.error) throw new Error(res.error);
        router.refresh();
      } catch (e) {
        setPreview(null);
        setError(e instanceof Error && e.message ? `Não foi possível enviar a foto: ${e.message}` : "Não foi possível enviar a foto.");
      }
    });
  }

  const shown = preview ?? avatarUrl;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) antes do envio
          <img src={shown} alt={name} className="size-28 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <Avatar name={name} size={112} />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="size-6 animate-spin text-white" />
          </span>
        )}
      </div>

      <div className="space-y-2 text-center sm:text-left">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
          >
            <Camera className="size-4" />
            {avatarUrl ? "Trocar foto" : "Enviar foto"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  await removeAvatar();
                  setPreview(null);
                  router.refresh();
                })
              }
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-60"
            >
              <Trash2 className="size-4" />
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-muted">A foto é recortada em quadrado a partir do centro. JPG, PNG ou WebP.</p>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateName, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="block min-w-64 flex-1 text-sm">
        <span className="mb-1 block text-muted">Nome exibido no sistema</span>
        <input
          name="name"
          defaultValue={name}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <button
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-sand disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Salvar nome
      </button>
      {state?.ok && <span className="text-sm text-accent">Salvo.</span>}
      {state?.error && <span className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
