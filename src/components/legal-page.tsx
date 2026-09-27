import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/company";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Image src="/brand/logo-mark.png" alt="Paula Chiaradia" width={900} height={205} className="w-44" />
          <nav className="flex gap-4 text-sm text-muted">
            <Link href="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-foreground">
              Termos
            </Link>
            <Link href="/exclusao-de-dados" className="hover:text-foreground">
              Exclusão de dados
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl tracking-wide">{title}</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {COMPANY.updatedAt}</p>
        <article className="legal mt-10 space-y-4 leading-relaxed">{children}</article>
      </main>
    </div>
  );
}

export function Controller() {
  return (
    <>
      <strong>{COMPANY.legalName ?? COMPANY.brand}</strong>
      {COMPANY.document && <>, inscrita no CNPJ {COMPANY.document}</>}
    </>
  );
}
