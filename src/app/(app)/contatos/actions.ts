"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { normalizePhone, normalizeUF } from "@/lib/brazil";
import { createClient } from "@/lib/supabase/server";

export type ContactState = { error?: string; ok?: boolean; id?: string } | undefined;

const clean = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s || null;
};
const parseTags = (v: unknown) =>
  String(v ?? "")
    .split(/[,;|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

function toRow(input: Record<string, unknown>) {
  const instagram = clean(input.instagram_username)?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "") ?? null;
  return {
    name: clean(input.name),
    email: clean(input.email)?.toLowerCase() ?? null,
    phone: normalizePhone(clean(input.phone)),
    city: clean(input.city),
    state: normalizeUF(clean(input.state)),
    instagram_username: instagram,
    notes: clean(input.notes),
  };
}

export async function saveContact(_: ContactState, fd: FormData): Promise<ContactState> {
  await requireArea("contatos");
  const row = { ...toRow(Object.fromEntries(fd)), tags: parseTags(fd.get("tags")) };
  if (!row.name && !row.email && !row.phone) return { error: "Informe ao menos nome, e-mail ou telefone." };

  const supabase = await createClient();
  const id = clean(fd.get("id"));
  const res = id
    ? await supabase.from("contacts").update(row).eq("id", id).select("id").single()
    : await supabase.from("contacts").insert({ ...row, first_source: "manual" }).select("id").single();

  if (res.error?.code === "23505") return { error: "Já existe um contato com este e-mail." };
  if (res.error) return { error: "Não foi possível salvar." };
  revalidatePath("/contatos");
  return { ok: true, id: res.data.id };
}

export async function deleteContact(id: string) {
  await requireArea("contatos");
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/contatos");
}

export type ImportResult = { created: number; updated: number; skipped: number; error?: string };

/** Importa linhas já lidas da planilha: casa por e-mail (ou telefone) e só preenche campos vazios. */
export async function importContacts(rows: Record<string, string>[]): Promise<ImportResult> {
  await requireArea("contatos");
  if (rows.length > 5000) return { created: 0, updated: 0, skipped: rows.length, error: "Máximo de 5.000 linhas por vez." };

  const supabase = await createClient();
  const prepared = rows.map((r) => ({ ...toRow(r), tags: parseTags(r.tags) })).filter((r) => r.name || r.email || r.phone);
  let skipped = rows.length - prepared.length;

  const emails = [...new Set(prepared.map((r) => r.email).filter(Boolean))] as string[];
  const phones = [...new Set(prepared.map((r) => r.phone).filter(Boolean))] as string[];
  const existing = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await supabase.from("contacts").select("*").in("email", emails.slice(i, i + 200));
    data?.forEach((c) => existing.set(`e:${c.email}`, c));
  }
  for (let i = 0; i < phones.length; i += 200) {
    const { data } = await supabase.from("contacts").select("*").in("phone", phones.slice(i, i + 200));
    data?.forEach((c) => existing.set(`p:${c.phone}`, c));
  }

  const inserts: typeof prepared = [];
  let updated = 0;
  const seen = new Set<string>();
  for (const r of prepared) {
    const key = r.email ? `e:${r.email}` : `p:${r.phone}`;
    if (seen.has(key)) {
      skipped++; // linha repetida na própria planilha
      continue;
    }
    seen.add(key);
    const found = existing.get(key) ?? (r.phone ? existing.get(`p:${r.phone}`) : undefined);
    if (!found) {
      inserts.push(r);
      continue;
    }
    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(r).filter(([k, v]) => k !== "tags" && v && !found[k]),
    );
    const tags = [...new Set([...((found.tags as string[]) ?? []), ...r.tags])];
    await supabase.from("contacts").update({ ...patch, tags }).eq("id", found.id as string);
    updated++;
  }

  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await supabase
      .from("contacts")
      .insert(inserts.slice(i, i + 500).map((r) => ({ ...r, first_source: "importacao" })));
    if (error) return { created: i, updated, skipped, error: "Falha ao gravar parte da planilha." };
  }

  revalidatePath("/contatos");
  return { created: inserts.length, updated, skipped };
}
