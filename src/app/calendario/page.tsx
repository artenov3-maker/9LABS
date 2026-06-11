"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [escopoTodos, setEscopoTodos] = useState(false);
  const [posts, setPosts] = useState<PostCal[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Se não há cliente ativo, mostra todos.
  const verTodos = escopoTodos || !clienteAtivo;

  const carregar = useCallback(async () => {
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
  }, [clienteAtivo, verTodos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Excluir um post pelo calendário.
  async function excluir(postId: string) {
    if (!window.confirm("Excluir esta publicação?")) return;
    await supabase.from("posts_agendados").delete().eq("id", postId);
    await carregar();
  }

  // Duplicar: cria uma cópia (rascunho) e abre para editar.
  async function duplicar(postId: string) {
    const { data: orig } = await supabase
      .from("posts_agendados")
      .select(
        "cliente_id, midia_id, legenda, data_agendada, posts_contas(conta_social_id, tipo_conteudo)",
      )
      .eq("id", postId)
      .single();
    if (!orig) return;

    const o = orig as unknown as {
      cliente_id: string;
      midia_id: string | null;
      legenda: string | null;
      data_agendada: string;
      posts_contas: { conta_social_id: string; tipo_conteudo: string | null }[];
    };

    const { data: novo, error } = await supabase
      .from("posts_agendados")
      .insert({
        cliente_id: o.cliente_id,
        midia_id: o.midia_id,
        legenda: o.legenda,
        data_agendada: o.data_agendada,
        status: "rascunho",
      })
      .select("id")
      .single();
    if (error || !novo) return;

    if (o.posts_contas.length > 0) {
      await supabase.from("posts_contas").insert(
        o.posts_contas.map((pc) => ({
          post_id: novo.id,
          conta_social_id: pc.conta_social_id,
          tipo_conteudo: pc.tipo_conteudo ?? "feed",
        })),
      );
    }
    router.push(`/posts/${novo.id}`);
  }

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
        <CalendarioMensal posts={posts} onExcluir={excluir} onDuplicar={duplicar} />
      )}
    </div>
  );
}
