import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=acesso");

  return (
    <div className="min-h-dvh">
      <Sidebar role={user.role} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-4 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-8">
          <Link
            href="/perfil"
            title="Meu perfil"
            className="-my-1 flex items-center gap-3 rounded-full py-1 pl-3 pr-1 transition hover:bg-sand"
          >
            <span className="text-right leading-tight">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-muted">{ROLE_LABELS[user.role]}</span>
            </span>
            <Avatar name={user.name} url={user.avatarUrl} />
          </Link>
          <form action={signOut}>
            <button className="rounded-md p-2 text-muted hover:bg-sand hover:text-foreground" title="Sair" aria-label="Sair">
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
