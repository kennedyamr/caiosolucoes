import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caio Soluções | Planos e atendimento pelo WhatsApp",
  description:
    "Conheça os planos da Caio Soluções, aproveite o preço especial no Pix e fale diretamente com nosso atendimento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
