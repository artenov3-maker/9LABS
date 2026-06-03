"use client";

import Link from "next/link";
import { useClienteAtivo } from "@/context/ClienteAtivo";
import EditorPost from "@/components/EditorPost";

export default function AgendarPage() {
  const { clienteAtivo, carregando } = useClienteAtivo();

  if (!carregando && !clienteAtivo) {
    return (
      <div className="rounded-md border border-dashed border-line bg-surface px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-light">Agendar Post</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Escolha um cliente primeiro para agendar uma publicação.
        </p>
        <Link
          href="/clientes"
          className="mt-6 inline-block rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-surface hover:bg-ink-soft"
        >
          Escolher cliente
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="micro-label">Agendar Post</div>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight">
            Nova publicação
          </h1>
        </div>
        <Link href="/calendario" className="text-sm text-muted hover:text-ink">
          Ver calendário →
        </Link>
      </header>

      {clienteAtivo && (
        <EditorPost clienteId={clienteAtivo.id} clienteNome={clienteAtivo.nome} />
      )}
    </div>
  );
}
