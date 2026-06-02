import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "9LABS — Painel de Agendamento",
  description: "Painel interno da agência para agendar posts nas redes sociais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {/* Barra de navegação do topo */}
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              9LABS
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/" className="text-zinc-700 hover:text-black hover:underline">
                Início
              </Link>
              <Link
                href="/clientes"
                className="text-zinc-700 hover:text-black hover:underline"
              >
                Clientes
              </Link>
              <span className="text-zinc-400">Mídias (em breve)</span>
              <span className="text-zinc-400">Calendário (em breve)</span>
              <span className="text-zinc-400">Relatório (em breve)</span>
            </div>
          </nav>
        </header>

        {/* Conteúdo de cada página entra aqui */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
