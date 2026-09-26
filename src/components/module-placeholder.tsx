import { Hourglass } from "lucide-react";
import { PageHeader } from "./page-header";

type Props = {
  title: string;
  description: string;
  stage: string;
  features: string[];
  requirements?: string[];
};

/** Tela provisória dos módulos que ainda dependem de integração. */
export function ModulePlaceholder({ title, description, stage, features, requirements }: Props) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-sand px-3 py-1 text-xs font-medium">
          <Hourglass className="size-3.5 text-accent" />
          {stage}
        </span>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-3 font-medium">O que este módulo vai mostrar</h2>
            <ul className="space-y-2 text-sm text-muted">
              {features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {requirements && (
            <div>
              <h2 className="mb-3 font-medium">O que falta para ativar</h2>
              <ul className="space-y-2 text-sm text-muted">
                {requirements.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full border border-muted" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
