"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { requestPasswordReset, signIn } from "./actions";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[15px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export function LoginForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [loginState, loginAction, loggingIn] = useActionState(signIn, undefined);
  const [resetState, resetAction, resetting] = useActionState(requestPasswordReset, undefined);

  if (mode === "reset") {
    return (
      <form action={resetAction} className="space-y-4">
        <p className="text-sm text-muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
        <Field label="E-mail">
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
        </Field>
        {resetState?.error && <Alert tone="error">{resetState.error}</Alert>}
        {resetState?.message && <Alert tone="ok">{resetState.message}</Alert>}
        <SubmitButton pending={resetting}>Enviar link</SubmitButton>
        <button type="button" onClick={() => setMode("login")} className="w-full text-sm text-muted hover:text-foreground">
          Voltar para o login
        </button>
      </form>
    );
  }

  return (
    <form action={loginAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail">
        <input name="email" type="email" autoComplete="email" required autoFocus className={inputClass} />
      </Field>
      <Field
        label="Senha"
        extra={
          <button type="button" onClick={() => setMode("reset")} className="text-xs font-normal text-muted hover:text-accent">
            Esqueci minha senha
          </button>
        }
      >
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {linkError && !loginState && <Alert tone="error">O link expirou ou é inválido. Solicite um novo.</Alert>}
      {loginState?.error && <Alert tone="error">{loginState.error}</Alert>}
      <SubmitButton pending={loggingIn}>Entrar</SubmitButton>
    </form>
  );
}

function Field({ label, extra, children }: { label: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between text-sm font-medium">
        {label}
        {extra}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-[15px] font-medium text-background transition hover:bg-foreground/85 disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

function Alert({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${tone === "error" ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}`}
    >
      {children}
    </p>
  );
}
