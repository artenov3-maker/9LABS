"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { monograma, useClienteAtivo } from "@/context/ClienteAtivo";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/agendar", label: "Agendar Post" },
  { href: "/calendario", label: "Calendário" },
  { href: "/midias", label: "Mídia" },
  { href: "/relatorio", label: "Relatórios" },
];

export default function Nav() {
  const pathname = usePathname();
  const { clientes, clienteAtivo, selecionarCliente } = useClienteAtivo();
  const [aberto, setAberto] = useState(false);

  function ativo(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3">
        {/* Marca */}
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          9LABS<span className="text-muted">///</span>
        </Link>

        {/* Itens principais */}
        <div className="flex flex-1 flex-wrap items-center gap-6 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`border-b-2 pb-0.5 transition ${
                ativo(l.href)
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Seletor de cliente */}
        <div className="relative">
          <button
            onClick={() => setAberto((a) => !a)}
            className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-1.5 text-sm hover:border-line-strong"
          >
            {clienteAtivo ? (
              <>
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-ink text-[10px] font-semibold text-surface">
                  {monograma(clienteAtivo.nome)}
                </span>
                <span className="max-w-[140px] truncate">{clienteAtivo.nome}</span>
              </>
            ) : (
              <span className="text-muted">Selecionar cliente</span>
            )}
            <span className="text-muted">▾</span>
          </button>

          {aberto && (
            <>
              {/* Fundo invisível para fechar ao clicar fora */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setAberto(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-60 rounded-md border border-line bg-surface py-1 shadow-[0_14px_34px_-22px_rgba(20,18,12,.4)]">
                <div className="micro-label px-3 py-1">Clientes</div>
                <div className="max-h-64 overflow-y-auto">
                  {clientes.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted">
                      Nenhum cliente ainda.
                    </p>
                  ) : (
                    clientes.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          selecionarCliente(c.id);
                          setAberto(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper ${
                          c.id === clienteAtivo?.id ? "text-ink" : "text-ink-soft"
                        }`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-ink text-[10px] font-semibold text-surface">
                          {monograma(c.nome)}
                        </span>
                        <span className="flex-1 truncate">{c.nome}</span>
                        {c.id === clienteAtivo?.id && (
                          <span className="text-xs text-muted">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <div className="my-1 border-t border-line" />
                <Link
                  href="/clientes"
                  onClick={() => setAberto(false)}
                  className="block px-3 py-2 text-sm text-ink-soft hover:bg-paper"
                >
                  Gerenciar clientes →
                </Link>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
