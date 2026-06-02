"use client"; // Esta página roda no navegador (tem formulário e busca dados ao abrir).

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Formato de um cliente, igual às colunas da tabela "clientes" no banco.
type Cliente = {
  id: string;
  nome: string;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Campos do formulário de novo cliente.
  const [nome, setNome] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Busca a lista de clientes no banco (mais novos primeiro).
  async function carregarClientes() {
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErro(error.message);
    } else {
      setClientes(data ?? []);
    }
    setCarregando(false);
  }

  // Ao abrir a página, carrega os clientes uma vez.
  useEffect(() => {
    carregarClientes();
  }, []);

  // Cadastra um novo cliente.
  async function adicionarCliente(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return; // não salva sem nome

    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from("clientes").insert({
      nome: nome.trim(),
      observacoes: observacoes.trim() || null,
    });

    if (error) {
      setErro(error.message);
    } else {
      setNome("");
      setObservacoes("");
      await carregarClientes(); // atualiza a lista
    }
    setSalvando(false);
  }

  // Arquiva ou reativa um cliente (muda a coluna "ativo").
  async function alternarAtivo(cliente: Cliente) {
    setErro(null);
    const { error } = await supabase
      .from("clientes")
      .update({ ativo: !cliente.ativo })
      .eq("id", cliente.id);
    if (error) setErro(error.message);
    else await carregarClientes();
  }

  // Exclui um cliente (pede confirmação antes).
  async function excluirCliente(cliente: Cliente) {
    const ok = window.confirm(
      `Excluir o cliente "${cliente.nome}"? Isso também remove suas contas sociais e posts. Não dá para desfazer.`,
    );
    if (!ok) return;

    setErro(null);
    const { error } = await supabase.from("clientes").delete().eq("id", cliente.id);
    if (error) setErro(error.message);
    else await carregarClientes();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="mt-1 text-zinc-600">
          Cadastre os clientes da agência. Clique no nome para editar e gerenciar as
          contas sociais.
        </p>
      </div>

      {/* Formulário de novo cliente */}
      <form
        onSubmit={adicionarCliente}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <h2 className="font-semibold">Novo cliente</h2>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Nome do cliente <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Padaria do João"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Observações (opcional)
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Anotações livres sobre o cliente"
            rows={2}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={salvando || !nome.trim()}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Cadastrar cliente"}
        </button>
      </form>

      {/* Mensagem de erro, se houver */}
      {erro && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Ocorreu um erro: {erro}
        </p>
      )}

      {/* Lista de clientes */}
      <div className="space-y-3">
        <h2 className="font-semibold">
          Clientes cadastrados{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({clientes.length})
          </span>
        </h2>

        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : clientes.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhum cliente ainda. Cadastre o primeiro acima. 👆
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {clientes.map((cliente) => (
              <li
                key={cliente.id}
                className="flex flex-wrap items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {cliente.nome}
                  </Link>
                  {cliente.observacoes && (
                    <p className="mt-0.5 text-sm text-zinc-600">
                      {cliente.observacoes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      cliente.ativo
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {cliente.ativo ? "Ativo" : "Arquivado"}
                  </span>
                  <button
                    onClick={() => alternarAtivo(cliente)}
                    className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline"
                  >
                    {cliente.ativo ? "Arquivar" : "Reativar"}
                  </button>
                  <button
                    onClick={() => excluirCliente(cliente)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
