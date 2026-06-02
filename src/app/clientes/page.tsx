"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { monograma, useClienteAtivo } from "@/context/ClienteAtivo";

export default function ClientesPage() {
  const router = useRouter();
  const { clientes, recarregar, selecionarCliente, carregando } = useClienteAtivo();

  const [busca, setBusca] = useState("");
  const [contagemContas, setContagemContas] = useState<Record<string, number>>({});

  // Formulário de novo cliente.
  const [nome, setNome] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Conta quantas contas sociais cada cliente tem (uma consulta só).
  async function carregarContagens() {
    const { data } = await supabase.from("contas_sociais").select("cliente_id");
    const mapa: Record<string, number> = {};
    for (const linha of data ?? []) {
      mapa[linha.cliente_id] = (mapa[linha.cliente_id] ?? 0) + 1;
    }
    setContagemContas(mapa);
  }

  useEffect(() => {
    carregarContagens();
  }, [clientes]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nome.toLowerCase().includes(q));
  }, [clientes, busca]);

  async function adicionarCliente(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from("clientes").insert({
      nome: nome.trim(),
      observacoes: observacoes.trim() || null,
    });
    if (error) setErro(error.message);
    else {
      setNome("");
      setObservacoes("");
      await recarregar();
    }
    setSalvando(false);
  }

  // Escolher um cliente: vira o cliente ativo e vai para o Painel.
  function abrirCliente(id: string) {
    selecionarCliente(id);
    router.push("/");
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-light tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted">
            Escolha um cliente para trabalhar ou cadastre um novo.
          </p>
        </div>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-56 rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </header>

      {/* Novo cliente */}
      <form
        onSubmit={adicionarCliente}
        className="space-y-4 rounded-md border border-line bg-surface p-6"
      >
        <div className="micro-label">Novo cliente</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do cliente"
            className="rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <input
            type="text"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações (opcional)"
            className="rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
        {erro && <p className="text-sm text-st-falhou">Erro: {erro}</p>}
        <button
          type="submit"
          disabled={salvando || !nome.trim()}
          className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {salvando ? "Salvando..." : "Cadastrar cliente"}
        </button>
      </form>

      {/* Grade de clientes */}
      <section className="space-y-4">
        <div className="micro-label">
          {filtrados.length} cliente{filtrados.length === 1 ? "" : "s"}
        </div>

        {carregando ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            {clientes.length === 0
              ? "Nenhum cliente ainda. Cadastre o primeiro acima."
              : "Nenhum cliente encontrado para essa busca."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-md border border-line bg-surface p-5 transition hover:border-line-strong"
              >
                <button
                  onClick={() => abrirCliente(c.id)}
                  className="flex items-start gap-3 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-ink font-display text-lg text-surface">
                    {monograma(c.nome)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.nome}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {(contagemContas[c.id] ?? 0)} conta
                      {(contagemContas[c.id] ?? 0) === 1 ? "" : "s"} social
                      {(contagemContas[c.id] ?? 0) === 1 ? "" : "is"}
                      {!c.ativo && " · arquivado"}
                    </span>
                  </span>
                </button>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <button
                    onClick={() => abrirCliente(c.id)}
                    className="text-xs font-medium text-ink hover:underline"
                  >
                    Abrir →
                  </button>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-xs text-muted hover:text-ink hover:underline"
                  >
                    Configurar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
