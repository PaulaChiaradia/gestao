"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { buildTrackedUrl, CHANNELS, type LinkProduct } from "@/lib/tracking";
import { createLink } from "./actions";

const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export function LinkBuilder({ products }: { products: LinkProduct[] }) {
  const [state, action, pending] = useActionState(createLink, undefined);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [channel, setChannel] = useState<string>(CHANNELS[0].value);
  const [campaign, setCampaign] = useState("");
  const [target, setTarget] = useState<"pagina" | "checkout">("pagina");

  const product = products.find((p) => p.id === productId);
  const preview = useMemo(
    () => (product ? buildTrackedUrl(product, target, channel, campaign) : null),
    [product, target, channel, campaign],
  );

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Produto</span>
        <select name="product" value={productId} onChange={(e) => setProductId(e.target.value)} className={field}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Onde o link vai ser usado</span>
        <select name="channel" value={channel} onChange={(e) => setChannel(e.target.value)} className={field}>
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Campanha (opcional)</span>
        <input
          name="campaign"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder="Ex.: Desafio Verão 2026"
          className={field}
        />
      </label>

      <fieldset className="text-sm">
        <legend className="mb-1.5 font-medium">Destino</legend>
        <div className="flex gap-2">
          {(
            [
              ["pagina", "Página de vendas"],
              ["checkout", "Direto no checkout"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-center ${
                target === value ? "border-foreground bg-foreground text-background" : "border-border bg-surface"
              }`}
            >
              <input
                type="radio"
                name="target"
                value={value}
                checked={target === value}
                onChange={() => setTarget(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="md:col-span-2">
        <p className="mb-1.5 text-sm font-medium">Link gerado</p>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate text-xs">{preview ?? "Produto sem página de vendas: use o checkout"}</code>
          {preview && <CopyButton text={preview} />}
        </div>
        {channel === "meta-ads" && (
          <p className="mt-2 text-xs text-muted">
            Dica: nos anúncios, use a campanha <code>{"{{campaign.name}}"}</code> diretamente no link do Gerenciador de
            Anúncios para registrar o nome de cada campanha automaticamente.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 md:col-span-2">
        <button
          disabled={pending || !preview}
          className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvar link
        </button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.url && <p className="text-sm text-accent">Link salvo na lista abaixo.</p>}
      </div>
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-sand"
    >
      {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
