import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-dvh">
      <Sidebar role={user.role} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-4 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-8">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground">
            {initials}
          </span>
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
