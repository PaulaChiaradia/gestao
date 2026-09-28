"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Loader2, MessageCircle, ShieldCheck, X } from "lucide-react";
import { formatBRL, formatDate, formatInt, formatPhone } from "@/lib/format";
import {
  COMMISSION_SOURCE_LABEL,
  label,
  LOCALE_LABEL,
  PAID,
  PAYMENT_METHOD_LABEL,
  PAYMENT_MODE_LABEL,
  REFUNDED,
  STATUS_LABEL,
} from "@/lib/hotmart/labels";
import { CopyButton } from "./links/link-builder";
import { getSaleDetail, type SaleDetail } from "./actions";

export type SaleListRow = {
  transaction: string;
  order_date: string | null;
  buyer_name: string | null;
  productName: string;
  city: string | null;
  state: string | null;
  status: string;
  price: number | null;
};

export function StatusPill({ status }: { status: string }) {
  const tone = PAID.includes(status)
    ? "bg-accent/10 text-accent"
    : REFUNDED.includes(status)
      ? "bg-danger/10 text-danger"
      : "bg-sand text-muted";
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${tone}`}>{label(STATUS_LABEL, status)}</span>;
}

/** Tabela de transações: cada linha abre a ficha completa da venda. */
export function SalesTable({ rows }: { rows: SaleListRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">Nenhuma transação no período.</p>;
  return (
    <>
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-5 py-2 font-normal sm:px-6">Data</th>
              <th className="px-3 py-2 font-normal">Comprador</th>
              <th className="px-3 py-2 font-normal">Produto</th>
              <th className="px-3 py-2 font-normal">Local</th>
              <th className="px-3 py-2 font-normal">Situação</th>
              <th className="px-5 py-2 text-right font-normal sm:px-6">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.transaction}
                tabIndex={0}
                role="button"
                aria-label={`Ver detalhes da venda de ${r.buyer_name ?? r.transaction}`}
                onClick={() => setOpen(r.transaction)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(r.transaction))}
                className="cursor-pointer border-b border-border outline-none transition last:border-0 hover:bg-background focus-visible:bg-sand"
              >
                <td className="px-5 py-2.5 tabular-nums sm:px-6">{formatDate(r.order_date)}</td>
                <td className="px-3 py-2.5">{r.buyer_name ?? "—"}</td>
                <td className="px-3 py-2.5">{r.productName}</td>
                <td className="px-3 py-2.5 text-muted">{[r.city, r.state].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-2.5">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums sm:px-6">{formatBRL(Number(r.price ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Clique em uma venda para ver todos os detalhes.</p>
      {open && <SaleDialog transaction={open} onClose={() => setOpen(null)} />}
    </>
  );
}

const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";

function SaleDialog({ transaction, onClose }: { transaction: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<SaleDetail | null | undefined>(undefined);
  const [current, setCurrent] = useState(transaction);
  const [pending, start] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    start(async () => setDetail(await getSaleDetail(current)));
  }, [current]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(860px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/30"
    >
      <div className="max-h-[88dvh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <span className="text-sm text-muted">Detalhes da venda</span>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-sand">
            <X className="size-5" />
          </button>
        </div>

        {detail === undefined || (pending && detail?.transaction !== current) ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : detail === null ? (
          <p className="py-24 text-center text-sm text-muted">Venda não encontrada.</p>
        ) : (
          <SaleContent d={detail} onSelect={setCurrent} />
        )}
      </div>
    </dialog>
  );
}

function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted">{l}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border p-4 ${className}`}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

function SaleContent({ d, onSelect }: { d: SaleDetail; onSelect: (tx: string) => void }) {
  const foreign = d.currency && d.currency !== "BRL";
  const inWarranty = d.warrantyExpireDate && new Date(d.warrantyExpireDate) > new Date() && PAID.includes(d.status);

  // Divisão do valor: taxa Hotmart + cada participante (a própria parte por último, em destaque)
  const split = [
    ...(d.hotmartFeeBrl != null
      ? [{ key: "fee", label: `Taxa Hotmart${d.hotmartFeePercentage ? ` (${d.hotmartFeePercentage}% + fixo)` : ""}`, value: d.hotmartFeeBrl, mine: false }]
      : []),
    ...d.split
      .filter((c) => !c.mine)
      .map((c, i) => ({
        key: `c${i}`,
        label: `${label(COMMISSION_SOURCE_LABEL, c.source)}${c.name ? ` · ${c.name}` : ""}`,
        value: c.value_brl ?? 0,
        mine: false,
      })),
    ...d.split.filter((c) => c.mine).map((c) => ({ key: "mine", label: "Sua parte", value: c.value_brl ?? 0, mine: true })),
  ];
  const base = Math.max(d.grossBrl, 1);

  return (
    <div className="space-y-5 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">{d.productName}</p>
          <h2 className="mt-1 font-display text-2xl tracking-wide">{d.buyer.name ?? "Comprador sem nome"}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <StatusPill status={d.status} />
            <span>{dateTime(d.orderDate)}</span>
            <span className="flex items-center gap-1">
              · <code className="text-xs">{d.transaction}</code>
              <CopyButton text={d.transaction} />
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums">{formatBRL(d.grossBrl)}</p>
          <p className="text-sm text-muted">
            {d.commissionBrl != null ? `sua parte: ${formatBRL(d.commissionBrl)}` : "valor da venda"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Comprador">
          <dl className="divide-y divide-border">
            {d.buyer.email && (
              <Field label="E-mail">
                <a href={`mailto:${d.buyer.email}`} className="break-all hover:text-accent">
                  {d.buyer.email}
                </a>
              </Field>
            )}
            {d.buyer.phone && (
              <Field label="Celular">
                <a
                  href={`https://wa.me/${d.buyer.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-accent"
                >
                  <MessageCircle className="size-3.5" />
                  {formatPhone(d.buyer.phone)}
                </a>
              </Field>
            )}
            <Field label="Região">{d.buyer.region ?? d.buyer.state ?? "—"}</Field>
            {(d.buyer.city || d.buyer.zipcode) && (
              <Field label="Cidade / CEP">{[d.buyer.city, d.buyer.state, d.buyer.zipcode].filter(Boolean).join(" · ")}</Field>
            )}
            <Field label="País">{d.buyer.country ?? "—"}</Field>
            <Field label="Idioma">{label(LOCALE_LABEL, d.buyer.locale)}</Field>
          </dl>
          {d.buyer.contactId && (
            <Link
              href={`/contatos/${d.buyer.contactId}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              Abrir ficha do contato <ExternalLink className="size-3.5" />
            </Link>
          )}
        </Section>

        <Section title="Pagamento">
          <dl className="divide-y divide-border">
            <Field label="Forma">{label(PAYMENT_METHOD_LABEL, d.paymentMethod ?? d.paymentType)}</Field>
            <Field label="Parcelas">{d.installments ? `${d.installments}x` : "—"}</Field>
            <Field label="Oferta">
              {d.offerCode ?? "—"}
              {d.offerPaymentMode && <span className="text-muted"> · {label(PAYMENT_MODE_LABEL, d.offerPaymentMode)}</span>}
            </Field>
            {d.couponCode && <Field label="Cupom">{d.couponCode}</Field>}
            {(d.isSubscription || d.recurrencyNumber) && (
              <Field label="Assinatura">{d.recurrencyNumber ? `${d.recurrencyNumber}ª cobrança` : "Sim"}</Field>
            )}
            <Field label="Pedido">{dateTime(d.orderDate)}</Field>
            <Field label="Aprovação">{dateTime(d.approvedDate)}</Field>
            {foreign && (
              <Field label="Moeda da compra">
                {d.priceOriginal?.toLocaleString("pt-BR")} {d.currency}
                {d.conversionRate && d.conversionRate !== 1 && (
                  <span className="text-muted"> · 1 BRL = {d.conversionRate.toLocaleString("pt-BR")} {d.currency}</span>
                )}
              </Field>
            )}
          </dl>
        </Section>
      </div>

      <Section title="Para onde foi o valor">
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span>Valor da venda (sem juros)</span>
            <span className="font-medium tabular-nums">{formatBRL(d.grossBrl)}</span>
          </div>
          {split.map((s) => (
            <div key={s.key}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className={s.mine ? "font-semibold" : "text-muted"}>{s.label}</span>
                <span className={`tabular-nums ${s.mine ? "font-semibold" : ""}`}>
                  {formatBRL(s.value)}
                  <span className="ml-2 text-xs font-normal text-muted">{Math.round((s.value / base) * 100)}%</span>
                </span>
              </div>
              <div className="h-2 rounded-r-[4px]">
                <div
                  className="h-full rounded-r-[4px] bg-[var(--series-1)]"
                  style={{ width: `${Math.min(100, (s.value / base) * 100)}%`, opacity: s.mine ? 1 : 0.45 }}
                />
              </div>
            </div>
          ))}
          {!!d.installmentFeeBrl && d.installmentFeeBrl > 0 && (
            <p className="border-t border-border pt-2.5 text-sm text-muted">
              O comprador pagou ainda <strong className="font-medium text-foreground">{formatBRL(d.installmentFeeBrl)}</strong>{" "}
              de juros do parcelamento (total pago: {formatBRL(d.totalPaidBrl ?? d.grossBrl + d.installmentFeeBrl)}). Esse
              valor fica com a Hotmart e não entra no faturamento.
            </p>
          )}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Origem da venda">
          {d.origin.src || d.origin.sck || d.origin.externalCode ? (
            <dl className="divide-y divide-border">
              {d.origin.linkLabel && <Field label="Link">{d.origin.linkLabel}</Field>}
              {d.origin.src && <Field label="src">{d.origin.src}</Field>}
              {d.origin.sck && <Field label="sck">{d.origin.sck}</Field>}
              {d.origin.externalCode && <Field label="xcod">{d.origin.externalCode}</Field>}
            </dl>
          ) : (
            <p className="text-sm text-muted">
              Sem origem registrada. Vendas feitas pelos{" "}
              <Link href="/vendas/links" className="text-accent hover:underline">
                links rastreados
              </Link>{" "}
              mostram aqui de onde veio a compra.
            </p>
          )}
        </Section>

        <Section title="Garantia">
          {d.warrantyExpireDate ? (
            <div className="flex items-start gap-3 text-sm">
              <ShieldCheck className={`mt-0.5 size-5 ${inWarranty ? "text-[#8a5a00]" : "text-accent"}`} />
              <p>
                {inWarranty ? "Em garantia até " : "Garantia encerrada em "}
                <strong className="font-medium">{formatDate(d.warrantyExpireDate)}</strong>
                <span className="block text-muted">
                  {inWarranty ? "Ainda pode haver pedido de reembolso." : "Venda consolidada: não cabe mais reembolso pela garantia."}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {REFUNDED.includes(d.status) ? `Reembolsada${d.refundedAt ? ` em ${formatDate(d.refundedAt)}` : ""}.` : "Sem prazo de garantia informado."}
            </p>
          )}
        </Section>
      </div>

      <Section title="Histórico deste comprador">
        <p className="mb-3 text-sm">
          <strong className="font-medium">{formatInt(d.historyPaidCount)}</strong>{" "}
          {d.historyPaidCount === 1 ? "compra aprovada" : "compras aprovadas"} ·{" "}
          <strong className="font-medium">{formatBRL(d.historyPaidTotal)}</strong> no total
          {d.historyPaidCount > 1 && <span className="text-muted"> · cliente recorrente</span>}
        </p>
        <ul className="divide-y divide-border text-sm">
          {d.history.map((h) => (
            <li key={h.transaction}>
              <button
                type="button"
                disabled={h.transaction === d.transaction}
                onClick={() => onSelect(h.transaction)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-background disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="min-w-0">
                  <span className={h.transaction === d.transaction ? "font-medium" : ""}>{h.product}</span>
                  <span className="ml-2 text-xs text-muted">{formatDate(h.date)}</span>
                  {h.transaction === d.transaction && <span className="ml-2 text-xs text-accent">esta venda</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <StatusPill status={h.status} />
                  <span className="w-24 text-right tabular-nums">{formatBRL(h.value)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
