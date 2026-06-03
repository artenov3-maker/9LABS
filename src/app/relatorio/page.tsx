"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useClienteAtivo } from "@/context/ClienteAtivo";

type Status = "rascunho" | "agendado" | "publicado" | "falhou";

type Post = {
  id: string;
  legenda: string | null;
  data_agendada: string;
  status: Status;
  clientes: { nome: string } | null;
  posts_contas: { contas_sociais: { plataforma: string } | null }[];
};

const SIGLA: Record<string, string> = { instagram: "IG", facebook: "f", tiktok: "TT" };
const STATUS_LISTA: { chave: Status; rotulo: string; cor: string }[] = [
  { chave: "rascunho", rotulo: "Rascunho", cor: "var(--color-st-rascunho)" },
  { chave: "agendado", rotulo: "Agendado", cor: "var(--color-st-agendado)" },
  { chave: "publicado", rotulo: "Publicado", cor: "var(--color-st-publicado)" },
  { chave: "falhou", rotulo: "Falhou", cor: "var(--color-st-falhou)" },
];

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RelatorioPage() {
  const { clienteAtivo } = useClienteAtivo();
  const [escopoTodos, setEscopoTodos] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | Status>("todos");

  const verTodos = escopoTodos || !clienteAtivo;

  useEffect(() => {
    (async () => {
      setCarregando(true);
      let query = supabase
        .from("posts_agendados")
        .select(
          "id, legenda, data_agendada, status, clientes(nome), posts_contas(contas_sociais(plataforma))",
        )
        .order("data_agendada", { ascending: false });
      if (!verTodos && clienteAtivo) query = query.eq("cliente_id", clienteAtivo.id);
      const { data } = await query;
      setPosts((data as unknown as Post[]) ?? []);
      setCarregando(false);
    })();
  }, [clienteAtivo, verTodos]);

  const contagem = useMemo(() => {
    const c: Record<Status, number> = { rascunho: 0, agendado: 0, publicado: 0, falhou: 0 };
    for (const p of posts) c[p.status]++;
    return c;
  }, [posts]);

  const filtrados = useMemo(
    () => (filtroStatus === "todos" ? posts : posts.filter((p) => p.status === filtroStatus)),
    [posts, filtroStatus],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="micro-label">Relatórios</div>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight">
            {verTodos ? "Todos os clientes" : clienteAtivo?.nome}
          </h1>
        </div>
        {clienteAtivo && (
          <div className="flex rounded-sm border border-line text-sm">
            <button
              onClick={() => setEscopoTodos(false)}
              className={`px-3 py-1.5 ${!escopoTodos ? "bg-ink text-surface" : "text-muted"}`}
            >
              Este cliente
            </button>
            <button
              onClick={() => setEscopoTodos(true)}
              className={`px-3 py-1.5 ${escopoTodos ? "bg-ink text-surface" : "text-muted"}`}
            >
              Todos
            </button>
          </div>
        )}
      </header>

      {/* Resumo por status (clicável para filtrar) */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_LISTA.map((s) => (
          <button
            key={s.chave}
            onClick={() => setFiltroStatus(filtroStatus === s.chave ? "todos" : s.chave)}
            className={`rounded-md border bg-surface p-5 text-left transition ${
              filtroStatus === s.chave ? "border-ink" : "border-line hover:border-line-strong"
            }`}
          >
            <div className="font-display text-3xl font-light">{contagem[s.chave]}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.cor }}
              />
              <span className="micro-label">{s.rotulo}</span>
            </div>
          </button>
        ))}
      </section>

      {filtroStatus !== "todos" && (
        <button
          onClick={() => setFiltroStatus("todos")}
          className="text-sm text-muted hover:text-ink hover:underline"
        >
          Limpar filtro de status
        </button>
      )}

      {/* Tabela */}
      {carregando ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-16 text-center text-sm text-muted">
          Nenhuma publicação para os filtros escolhidos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line">
              <tr>
                {verTodos && <th className="micro-label px-4 py-3">Cliente</th>}
                <th className="micro-label px-4 py-3">Data/Hora</th>
                <th className="micro-label px-4 py-3">Redes</th>
                <th className="micro-label px-4 py-3">Legenda</th>
                <th className="micro-label px-4 py-3">Status</th>
                <th className="micro-label px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtrados.map((p) => {
                const s = STATUS_LISTA.find((x) => x.chave === p.status)!;
                return (
                  <tr key={p.id}>
                    {verTodos && (
                      <td className="px-4 py-3 font-medium">{p.clientes?.nome ?? "—"}</td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatarData(p.data_agendada)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.posts_contas
                        .map((pc) => (pc.contas_sociais ? SIGLA[pc.contas_sociais.plataforma] : ""))
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      <span className="line-clamp-1 max-w-xs">{p.legenda ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.cor }}
                        />
                        <span className="micro-label">{s.rotulo}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/posts/${p.id}`} className="text-xs text-ink hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
