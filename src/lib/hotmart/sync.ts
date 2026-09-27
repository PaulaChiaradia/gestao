import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { importWindow, syncProducts } from "./import";

/** Revisa as vendas recentes na API (corrige status, reembolsos e conversão de moeda que o webhook não traz). */
export async function syncRecent(db: SupabaseClient, days = 45) {
  const productMap = await syncProducts(db);
  const end = Date.now();
  const stats = await importWindow(db, productMap, end - days * 86_400_000, end);
  const now = new Date().toISOString();
  await db.from("integrations").update({ status: "conectado", last_sync_at: now, updated_at: now }).eq("key", "hotmart");
  return stats;
}
