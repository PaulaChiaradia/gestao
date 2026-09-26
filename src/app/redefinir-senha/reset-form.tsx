"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export function ResetForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const password = String(formData.get("password"));
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== formData.get("confirm")) return setError("As senhas não conferem.");

    setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (error) return setError("Não foi possível alterar a senha. Solicite um novo link.");
    router.replace("/");
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input name="password" type="password" placeholder="Nova senha" autoComplete="new-password" required className={inputClass} />
      <input name="confirm" type="password" placeholder="Confirme a nova senha" autoComplete="new-password" required className={inputClass} />
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
      >
        Salvar senha
      </button>
    </form>
  );
}
