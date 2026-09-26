import type { Metadata } from "next";
import { DM_Sans, Josefin_Sans } from "next/font/google";
import "./globals.css";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const display = Josefin_Sans({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gestão | Paula Chiaradia",
  description: "Plataforma de gestão, atendimento e indicadores — Paula Chiaradia Imagem & Estilo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
