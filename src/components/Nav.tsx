"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/clientes", label: "Clientes" },
  { href: "/calendario", label: "Calendário" },
  { href: "/relatorio", label: "Relatório" },
];

export default function Nav() {
  const pathname = usePathname();

  // O link fica "ativo" quando estamos na página dele.
  function ativo(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        {/* Logotipo 9LABS */}
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          <span className="text-red-600">9</span>
          <span className="text-zinc-900">LABS</span>
        </Link>

        {/* Links principais */}
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                ativo(l.href)
                  ? "bg-red-50 text-red-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
