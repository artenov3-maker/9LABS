"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useClienteAtivo } from "@/context/ClienteAtivo";
import CalendarioMensal, { type PostCal } from "@/components/CalendarioMensal";

const SIGLA: Record<string, string> = {
  instagram: "IG",
  facebook: "f",
  tiktok: "TT",
};

export default function CalendarioPage() {
  const { clienteAtivo } = useClienteAtivo();
  const [escopoTodos, setEscopoTodos] = useState(false);
  const [posts, setPosts] = useState<PostCal[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Se não há cliente ativo, mostra todos.
  const verTodos = escopoTodos || !clienteAtivo;

  useEffect(() => {
    (async () => {
      setCarregando(true);
      let query = supabase
        .from("posts_agendados")
        .select(
          "id, data_agendada, status, legenda, clientes(nome), posts_contas(contas_sociais(plataforma))",
        )
        .order("data_agendada", { ascending: true });

      if (!verTodos && clienteAtivo) {
        query = query.eq("cliente_id", clienteAtivo.id);
      }

      const { data } = await query;
      const lista: PostCal[] = (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        data_agendada: p.data_agendada as string,
        status: p.status as PostCal["status"],
        legenda: (p.legenda as string) ?? null,
        clientes: (p.clientes as { nome: string } | null) ?? null,
        redes: ((p.posts_contas as { contas_sociais: { plataforma: string } | null }[]) ?? [])
          .map((pc) => (pc.contas_sociais ? SIGLA[pc.contas_sociais.plataforma] : ""))
          .filter(Boolean),
      }));
      setPosts(lista);
      setCarregando(false);
    })();
  }, [clienteAtivo, verTodos]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="micro-label">Calendário</div>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight">
            {verTodos ? "Todos os clientes" : clienteAtivo?.nome}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Alternador de escopo */}
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
          <Link
            href="/agendar"
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft"
          >
            + Agendar post
          </Link>
        </div>
      </header>

      {carregando ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <CalendarioMensal posts={posts} />
      )}
    </div>
  );
}
