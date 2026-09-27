"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

// Tela exibida quando algo falha ao carregar uma página do sistema
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
      <AlertTriangle className="mx-auto size-8 text-danger" />
      <h1 className="mt-4 font-display text-2xl tracking-wide">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-sm text-muted">
        Tente de novo. Se o problema continuar, envie o código abaixo para o suporte do sistema.
      </p>
      {error.digest && <code className="mt-4 block rounded bg-sand px-2 py-1 text-xs">{error.digest}</code>}
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/85"
      >
        <RotateCcw className="size-4" />
        Tentar de novo
      </button>
    </div>
  );
}
