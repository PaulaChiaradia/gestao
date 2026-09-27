import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AtSign, Mail, MapPin, MessageCircle } from "lucide-react";
import { ChartCard } from "@/components/charts/stat-tile";
import { requireArea } from "@/lib/auth";
import { UF_NAMES, type UF } from "@/lib/brazil";
import { formatBRL, formatDate, formatPhone } from "@/lib/format";
import { PAID_STATUSES } from "@/lib/hotmart/sales";
import { labelOf, STAGES } from "@/lib/pipeline";
import { canAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { ContactButton, DeleteContactButton, type ContactFormValues } from "../contact-forms";

export default async function ContatoPage({ params }: PageProps<"/contatos/[id]">) {
  const user = await requireArea("contatos");
  const { id } = await params;
  const supabase = await createClient();

  const { data: c } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const seesSales = canAccess(user.role, "vendas");
  const orFilters = [c.email && `contact_email.eq.${c.email}`, c.phone && `contact_phone.eq.${c.phone}`, `contact_id.eq.${c.id}`]
    .filter(Boolean)
    .join(",");

  const [{ data: sales }, { data: opps }] = await Promise.all([
    seesSales
      ? supabase
          .from("hotmart_sales")
          .select("transaction, status, price, order_date, product:hotmart_products(name, short_name)")
          .eq("contact_id", id)
          .order("order_date", { ascending: false })
      : Promise.resolve({ data: null }),
    supabase.from("opportunities").select("id, title, stage, value, event_date").or(orFilters).order("created_at", { ascending: false }),
  ]);

  const paidTotal = (sales ?? [])
    .filter((s) => PAID_STATUSES.includes(s.status))
    .reduce((sum, s) => sum + Number(s.price ?? 0), 0);
  const whatsapp = c.phone ? `https://wa.me/${c.phone}` : null;

  return (
    <div className="space-y-6">
      <Link href="/contatos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" />
        Contatos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide">{c.name ?? c.email ?? formatPhone(c.phone)}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                <Mail className="size-4" />
                {c.email}
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
                <MessageCircle className="size-4" />
                {formatPhone(c.phone)}
              </a>
            )}
            {c.instagram_username && (
              <a
                href={`https://instagram.com/${c.instagram_username}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <AtSign className="size-4" />
                {c.instagram_username}
              </a>
            )}
            {(c.city || c.state) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {[c.city, c.state && UF_NAMES[c.state as UF]].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          {!!c.tags?.length && (
            <div className="mt-3 flex flex-wrap gap-1">
              {(c.tags as string[]).map((t) => (
                <span key={t} className="rounded-full bg-sand px-2.5 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <ContactButton contact={c as ContactFormValues} />
          {(user.role === "admin" || user.role === "gestor") && <DeleteContactButton id={c.id} />}
        </div>
      </div>

      {c.notes && (
        <div className="whitespace-pre-line rounded-2xl border border-border bg-surface p-5 text-sm">{c.notes}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {seesSales && (
          <ChartCard title="Compras" subtitle={sales?.length ? `Total pago: ${formatBRL(paidTotal)}` : undefined}>
            {sales?.length ? (
              <ul className="divide-y divide-border text-sm">
                {sales.map((s) => {
                  const product = s.product as unknown as { name: string; short_name: string | null } | null;
                  return (
                    <li key={s.transaction} className="flex justify-between gap-3 py-2.5">
                      <span>
                        {product?.short_name ?? product?.name ?? "—"}
                        <span className="ml-2 text-xs text-muted">{formatDate(s.order_date)}</span>
                      </span>
                      <span className={`tabular-nums ${PAID_STATUSES.includes(s.status) ? "" : "text-muted line-through"}`}>
                        {formatBRL(Number(s.price ?? 0))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhuma compra registrada.</p>
            )}
          </ChartCard>
        )}

        <ChartCard title="Palestras e treinamentos">
          {opps?.length ? (
            <ul className="divide-y divide-border text-sm">
              {opps.map((o) => (
                <li key={o.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    {o.title}
                    <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-xs">{labelOf(STAGES, o.stage)}</span>
                  </span>
                  <span className="tabular-nums text-muted">{o.value ? formatBRL(Number(o.value)) : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhuma oportunidade ligada a este contato.</p>
          )}
        </ChartCard>

        <ChartCard title="Conversas" subtitle="WhatsApp, Instagram e e-mail">
          <p className="text-sm text-muted">O histórico de conversas aparece aqui quando o atendimento estiver conectado.</p>
        </ChartCard>
      </div>

      <p className="text-xs text-muted">Cadastrado em {formatDate(c.created_at)}</p>
    </div>
  );
}
