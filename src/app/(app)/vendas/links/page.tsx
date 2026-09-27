import { Trash2 } from "lucide-react";
import { ChartCard } from "@/components/charts/stat-tile";
import { PageHeader } from "@/components/page-header";
import { requireArea } from "@/lib/auth";
import { formatDate, formatInt } from "@/lib/format";
import { PAID_STATUSES } from "@/lib/hotmart/sales";
import { canAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { channelLabel } from "@/lib/tracking";
import { deleteLink } from "./actions";
import { CopyButton, LinkBuilder } from "./link-builder";

export const metadata = { title: "Links rastreados | Paula Chiaradia" };

export default async function LinksPage() {
  const user = await requireArea("links");
  const canEdit = user.role !== "visualizador";
  const canSeeSales = canAccess(user.role, "vendas");
  const supabase = await createClient();

  const [{ data: products }, { data: links }, { data: sales }] = await Promise.all([
    supabase
      .from("hotmart_products")
      .select("id, name, checkout_code, default_offer_code, sales_page_url")
      .eq("active", true)
      .order("name"),
    supabase
      .from("tracked_links")
      .select("id, label, channel, campaign, target, url, created_at")
      .order("created_at", { ascending: false }),
    canSeeSales
      ? supabase.from("hotmart_sales").select("src, sck").in("status", PAID_STATUSES).not("src", "is", null)
      : Promise.resolve({ data: [] as { src: string; sck: string | null }[] }),
  ]);

  // Vendas atribuídas a cada combinação canal + campanha
  const salesBy = new Map<string, number>();
  for (const s of sales ?? []) {
    const key = `${s.src}|${s.sck ?? ""}`;
    salesBy.set(key, (salesBy.get(key) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Links rastreados"
        description="Gere links com a origem marcada para saber de onde vem cada venda na Hotmart."
      />

      {canEdit && (
        <ChartCard title="Novo link" subtitle="Use um link diferente para cada lugar onde ele for divulgado.">
          <LinkBuilder products={products ?? []} />
        </ChartCard>
      )}

      <ChartCard title="Links salvos">
        {links?.length ? (
          <ul className="divide-y divide-border">
            {links.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className="truncate text-xs text-muted">
                    {channelLabel(l.channel)} · {l.target === "pagina" ? "página de vendas" : "checkout"} · criado em{" "}
                    {formatDate(l.created_at)}
                  </p>
                  <code className="mt-1 block truncate text-xs text-muted">{l.url}</code>
                </div>
                {canSeeSales && (
                  <span className="shrink-0 text-sm tabular-nums">
                    {formatInt(salesBy.get(`${l.channel}|${l.campaign ?? ""}`) ?? 0)} vendas
                  </span>
                )}
                <div className="flex shrink-0 gap-2">
                  <CopyButton text={l.url} />
                  {canEdit && (
                    <form action={deleteLink}>
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        className="rounded-md border border-border p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="Excluir link"
                        title="Excluir link"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Nenhum link salvo ainda.</p>
        )}
      </ChartCard>

      <div className="rounded-2xl border border-border bg-sand/50 p-5 text-sm text-muted">
        <p className="mb-1 font-medium text-foreground">Como usar</p>
        <p>
          Troque os links atuais do Linktree, da bio e dos stories por links gerados aqui. Cada venda feita a partir
          deles chega com a origem registrada e aparece em <strong>Vendas → Origem das vendas</strong>. Links antigos,
          sem origem, continuam funcionando, mas as vendas entram como &quot;Sem origem registrada&quot;.
        </p>
      </div>
    </div>
  );
}
