"use client";

import { useActionState } from "react";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { CopyButton } from "../vendas/links/link-builder";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import { inviteUser, newAccessLink, updateUser, type UserActionState } from "./actions";

export type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  active: boolean;
  last_sign_in_at: string | null;
};

const field =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteUser, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_12rem_auto] md:items-end">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Nome</span>
          <input name="name" required className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">E-mail</span>
          <input name="email" type="email" required className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Perfil</span>
          <select name="role" defaultValue="atendimento" className={field}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Convidar
        </button>
      </div>
      <LinkResult state={state} />
    </form>
  );
}

function LinkResult({ state }: { state: UserActionState }) {
  if (state?.error) return <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (!state?.link) return null;
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
      <p className="mb-2">{state.message}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-xs">{state.link}</code>
        <CopyButton text={state.link} />
      </div>
    </div>
  );
}

export function UserList({ users, meId }: { users: UserRow[]; meId: string }) {
  return (
    <ul className="divide-y divide-border">
      {users.map((u) => (
        <UserItem key={u.id} user={u} isMe={u.id === meId} />
      ))}
    </ul>
  );
}

function UserItem({ user, isMe }: { user: UserRow; isMe: boolean }) {
  const [state, action, pending] = useActionState(newAccessLink, undefined);
  return (
    <li className="py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {user.full_name ?? user.email}
            {isMe && <span className="ml-2 text-xs font-normal text-muted">(você)</span>}
            {!user.active && <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">Desativado</span>}
          </p>
          <p className="truncate text-sm text-muted">
            {user.email} ·{" "}
            {user.last_sign_in_at
              ? `último acesso em ${new Date(user.last_sign_in_at).toLocaleDateString("pt-BR")}`
              : "ainda não entrou"}
          </p>
        </div>

        {isMe ? (
          <span className="text-sm text-muted">{ROLE_LABELS[user.role]}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <form action={updateUser}>
              <input type="hidden" name="id" value={user.id} />
              <select
                name="role"
                defaultValue={user.role}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                aria-label="Perfil de acesso"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </form>
            <form action={action}>
              <input type="hidden" name="email" value={user.email ?? ""} />
              <button
                disabled={pending || !user.active}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-sand disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
                Gerar link de acesso
              </button>
            </form>
            <form action={updateUser}>
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="active" value={String(!user.active)} />
              <button
                onClick={(e) => {
                  if (user.active && !confirm(`Desativar ${user.full_name ?? user.email}? O acesso é bloqueado na hora.`))
                    e.preventDefault();
                }}
                className={`rounded-lg px-2.5 py-1.5 text-sm ${
                  user.active ? "text-danger hover:bg-danger/10" : "text-accent hover:bg-accent/10"
                }`}
              >
                {user.active ? "Desativar" : "Reativar"}
              </button>
            </form>
          </div>
        )}
      </div>
      {state && (
        <div className="mt-3">
          <LinkResult state={state} />
        </div>
      )}
    </li>
  );
}
