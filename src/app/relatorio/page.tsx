"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = { id: string; nome: string };
type ContaSocial = {
  id: string;
  plataforma: "instagram" | "facebook" | "tiktok";
};
type Status = "rascunho" | "agendado" | "publicado" | "falhou";

type PostAgendado = {
  id: string;
  cliente_id: string;
  legenda: string | null;
  data_agendada: string;
  status: Status;
  clientes: { nome: string } | null;
  midias: { tipo: string; nome_arquivo: string | null } | null;
  posts_contas: { contas_sociais: ContaSocial | null }[];
};

const REDES: Record<ContaSocial["plataforma"], string> = {
  instagram: "📸",
  facebook: "👍",
  tiktok: "🎵",
};

const STATUS_LISTA: Status[] = ["rascunho", "agendado", "publicado", "falhou"];
const STATUS_CORES: Record<Status, string> = {
  rascunho: "bg-zinc-100 text-zinc-600",
  agendado: "bg-blue-100 text-blue-700",
  publicado: "bg-green-100 text-green-700",
  falhou: "bg-red-100 text-red-700",
};

export default function RelatorioPage() {
  const [posts, setPosts] = useState<PostAgendado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros.
  const [filtroStatus, setFiltroStatus] = useState<"todos" | Status>("todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);

      const { data: dataClientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome", { ascending: true });
      setClientes(dataClientes ?? []);

      const { data, error } = await supabase
        .from("posts_agendados")
        .select(
          "id, cliente_id, legenda, data_agendada, status, clientes(nome), midias(tipo, nome_arquivo), posts_contas(contas_sociais(id, plataforma))",
        )
        .order("data_agendada", { ascending: false });

      if (error) setErro(error.message);
      else setPosts((data as unknown as PostAgendado[]) ?? []);

      setCarregando(false);
    })();
  }, []);

  // Contagem por status (para o resumo do topo).
  const contagem = useMemo(() => {
    const c: Record<Status, number> = {
      rascunho: 0,
      agendado: 0,
      publicado: 0,
      falhou: 0,
    };
    for (const p of posts) c[p.status]++;
    return c;
  }, [posts]);

  // Lista filtrada.
  const postsFiltrados = useMemo(() => {
    return posts.filter((p) => {
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
      if (filtroCliente !== "todos" && p.cliente_id !== filtroCliente) return false;
      return true;
    });
  }, [posts, filtroStatus, filtroCliente]);

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatório</h1>
        <p className="mt-1 text-zinc-600">
          Acompanhe todas as publicações por status e por cliente.
        </p>
      </div>

      {/* Resumo por status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_LISTA.map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(filtroStatus === s ? "todos" : s)}
            className={`rounded-lg border p-4 text-left transition hover:shadow-sm ${
              filtroStatus === s ? "border-zinc-900" : "border-zinc-200"
            }`}
          >
            <div className="text-2xl font-bold">{contagem[s]}</div>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CORES[s]}`}
            >
              {s}
            </span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as "todos" | Status)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          >
            <option value="todos">Todos</option>
            {STATUS_LISTA.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Cliente</label>
          <select
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          >
            <option value="todos">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        {(filtroStatus !== "todos" || filtroCliente !== "todos") && (
          <button
            onClick={() => {
              setFiltroStatus("todos");
              setFiltroCliente("todos");
            }}
            className="text-sm text-zinc-600 hover:text-black hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {erro && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Ocorreu um erro: {erro}
        </p>
      )}

      {/* Lista */}
      <div className="space-y-3">
        <h2 className="font-semibold">
          Publicações{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({postsFiltrados.length})
          </span>
        </h2>

        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : postsFiltrados.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma publicação para os filtros escolhidos.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Data/Hora</th>
                  <th className="px-4 py-3">Redes</th>
                  <th className="px-4 py-3">Legenda</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {postsFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">
                      {p.clientes?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                      {formatarData(p.data_agendada)}
                    </td>
                    <td className="px-4 py-3">
                      {p.posts_contas.length === 0
                        ? "—"
                        : p.posts_contas
                            .map((pc) =>
                              pc.contas_sociais
                                ? REDES[pc.contas_sociais.plataforma]
                                : "",
                            )
                            .join(" ")}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <span className="line-clamp-1 max-w-xs">
                        {p.legenda ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CORES[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
