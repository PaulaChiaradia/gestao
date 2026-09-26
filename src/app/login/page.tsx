import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar | Paula Chiaradia" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, erro } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.4fr_1fr]">
      <div className="relative h-56 sm:h-72 lg:h-auto">
        <Image
          src="/brand/login.jpg"
          alt="Paula Chiaradia — Imagem & Estilo"
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover object-[50%_20%]"
        />
      </div>

      <section className="flex items-center justify-center bg-background px-6 py-10 sm:px-12">
        <div className="w-full min-w-0 max-w-sm">
          <h1 className="font-display text-2xl tracking-wide">Bem-vinda de volta</h1>
          <p className="mb-8 mt-1 text-sm text-muted">Acesse o painel de gestão, atendimento e indicadores.</p>
          <LoginForm next={typeof next === "string" ? next : "/"} linkError={erro === "link"} />
        </div>
      </section>
    </main>
  );
}
