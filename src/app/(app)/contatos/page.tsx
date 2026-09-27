import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireArea } from "@/lib/auth";
import { UF_NAMES } from "@/lib/brazil";
import { formatInt, formatPhone } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ContactButton, ImportButton } from "./contact-forms";

export const metadata = { title: "Contatos | Paula Chiaradia" };

const PAGE = 50;
const SOURCE_LABEL: Record<string, string> = {
  hotmart: "Hotmart",
  manual: "Cadastro manual",
  importacao: "Planilha",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
};


export default async function ContatosPage({ searchParams }: PageProps<"/contatos">) {
  await requireArea("contatos");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const uf = typeof sp.uf === "string" && sp.uf in UF_NAMES ? sp.uf : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const page = Math.max(1, Number(sp.pagina) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("id, name, email, phone, city, state, tags, first_source, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) {
    // Remove caracteres que têm significado no filtro da API
    const term = q.replace(/[,()%*\\]/g, " ").trim();
    const digits = term.replace(/\D/g, "");
    const ors = [`name.ilike.%${term}%`, `email.ilike.%${term}%`, `city.ilike.%${term}%`, `instagram_username.ilike.%${term}%`];
    if (digits.length >= 4) ors.push(`phone.ilike.%${digits}%`);
    query = query.or(ors.join(","));
  }
  if (uf) query = query.eq("state", uf);
  if (tag) query = query.contains("tags", [tag]);
  const { data: contacts, count } = await query;

  const { data: tagRows } = await supabase.from("contacts").select("tags").not("tags", "eq", "{}").limit(1000);
  const allTags = [...new Set((tagRows ?? []).flatMap((r) => r.tags as string[]))].sort();

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const s = new URLSearchParams({ ...(q && { q }), ...(uf && { uf }), ...(tag && { tag }), pagina: String(p) });
    return `/contatos?${s}`;
  };

  return (
    <>
      <PageHeader title="Contatos" description="Uma ficha por pessoa, reunindo compras, conversas e oportunidades." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome, e-mail, telefone, cidade ou @"
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <select name="uf" defaultValue={uf} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
            <option value="">Todos os estados</option>
            {Object.entries(UF_NAMES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select name="tag" defaultValue={tag} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
              <option value="">Todas as etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <button className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm hover:bg-sand">Filtrar</button>
        </form>
        <ImportButton />
        <ContactButton />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-border">
                <th className="px-5 py-3 font-normal">Nome</th>
                <th className="px-3 py-3 font-normal">Contato</th>
                <th className="px-3 py-3 font-normal">Local</th>
                <th className="px-3 py-3 font-normal">Etiquetas</th>
                <th className="px-5 py-3 font-normal">Origem</th>
              </tr>
            </thead>
            <tbody>
              {contacts?.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-5 py-3">
                    <Link href={`/contatos/${c.id}`} className="font-medium hover:text-accent">
                      {c.name ?? c.email ?? formatPhone(c.phone)}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    <div>{c.email}</div>
                    <div className="tabular-nums">{formatPhone(c.phone)}</div>
                  </td>
                  <td className="px-3 py-3 text-muted">{[c.city, c.state].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags as string[]).map((t) => (
                        <span key={t} className="rounded-full bg-sand px-2 py-0.5 text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">{SOURCE_LABEL[c.first_source ?? ""] ?? c.first_source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!contacts?.length && (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {q || uf || tag
              ? "Nenhum contato encontrado com esses filtros."
              : "Nenhum contato ainda. Eles entram automaticamente com as vendas da Hotmart e as conversas, ou por cadastro e importação."}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>{formatInt(total)} contatos</span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={qs(page - 1)} className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:bg-sand">
                Anterior
              </Link>
            )}
            <span>
              Página {page} de {pages}
            </span>
            {page < pages && (
              <Link href={qs(page + 1)} className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:bg-sand">
                Próxima
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
