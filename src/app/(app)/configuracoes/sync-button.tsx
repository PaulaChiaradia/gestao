"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { syncHotmartNow } from "./actions";

export function SyncButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ error?: string; message?: string }>();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await syncHotmartNow()))}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-sand disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Sincronizar agora
      </button>
      {result?.message && <span className="text-sm text-accent">{result.message}</span>}
      {result?.error && <span className="text-sm text-danger">{result.error}</span>}
    </div>
  );
}
