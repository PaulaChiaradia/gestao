import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccess, isRole, type Area, type Role } from "@/lib/roles";

export type CurrentUser = { id: string; email: string; name: string; role: Role; avatarUrl: string | null };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active, avatar_url")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile && !profile.active) return null; // desativado em Configurações

  const email = data.user.email ?? "";
  return {
    id: data.user.id,
    email,
    name: profile?.full_name || email.split("@")[0],
    role: isRole(profile?.role) ? profile.role : "visualizador",
    avatarUrl: profile?.avatar_url ?? null,
  };
});

/** Garante que o usuário logado tem acesso à área; caso contrário volta ao painel. */
export async function requireArea(area: Area) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=acesso");
  if (!canAccess(user.role, area)) redirect("/");
  return user;
}
