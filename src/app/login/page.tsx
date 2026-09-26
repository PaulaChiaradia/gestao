import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar | Paula Chiaradia" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, erro } = await searchParams;

  return (
    <main className="relative flex min-h-dvh items-end px-4 py-6 sm:items-center sm:px-[6vw]">
      <Image
        src="/brand/login.jpg"
        alt="Paula Chiaradia — Imagem & Estilo"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[50%_30%]"
      />

      <section className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-7 shadow-xl shadow-black/10 backdrop-blur-md sm:p-8">
        <h1 className="font-display text-2xl tracking-wide">Acesso ao sistema</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Gestão, atendimento e indicadores.</p>
        <LoginForm next={typeof next === "string" ? next : "/"} linkError={erro === "link"} />
      </section>
    </main>
  );
}
