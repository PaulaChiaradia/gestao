"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { buildTrackedUrl, channelLabel, CHANNELS, slugify } from "@/lib/tracking";

export type LinkState = { error?: string; url?: string } | undefined;

const CAN_EDIT = ["admin", "gestor", "marketing"] as const;

export async function createLink(_: LinkState, formData: FormData): Promise<LinkState> {
  const user = await requireArea("links");
  if (!CAN_EDIT.includes(user.role as (typeof CAN_EDIT)[number])) return { error: "Seu perfil só pode visualizar links." };

  const productId = String(formData.get("product") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const campaign = String(formData.get("campaign") ?? "");
  const target = formData.get("target") === "checkout" ? "checkout" : "pagina";

  if (!CHANNELS.some((c) => c.value === channel)) return { error: "Escolha o canal." };

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("hotmart_products")
    .select("id, name, short_name, checkout_code, default_offer_code, sales_page_url")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { error: "Escolha o produto." };

  const url = buildTrackedUrl(product, target, channel, campaign);
  if (!url) return { error: "Este produto não tem página de vendas cadastrada. Use o link do checkout." };

  const sck = slugify(campaign) || null;
  const label = [product.short_name || product.name, channelLabel(channel), sck].filter(Boolean).join(" · ");

  const { error } = await supabase
    .from("tracked_links")
    .insert({ product_id: product.id, channel, campaign: sck, label, target, url });
  if (error) return { error: "Não foi possível salvar o link." };

  revalidatePath("/vendas/links");
  return { url };
}

export async function deleteLink(formData: FormData) {
  const user = await requireArea("links");
  if (!canAccess(user.role, "links") || user.role === "visualizador") return;
  const supabase = await createClient();
  await supabase.from("tracked_links").delete().eq("id", String(formData.get("id")));
  revalidatePath("/vendas/links");
}
