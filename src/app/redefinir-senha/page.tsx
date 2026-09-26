import Image from "next/image";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Nova senha | Paula Chiaradia" };

export default function RedefinirSenhaPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Image
          src="/brand/logo-mark.png"
          alt="Paula Chiaradia"
          width={900}
          height={205}
          className="mx-auto mb-10 w-56"
        />
        <h1 className="mb-6 font-display text-2xl tracking-wide">Criar nova senha</h1>
        <ResetForm />
      </div>
    </main>
  );
}
