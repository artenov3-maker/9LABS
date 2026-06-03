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
};

const STATUS: { chave: Status; rotulo: string; cor: string }[] = [
  { chave: "rascunho", rotulo: "Rascunho", cor: "var(--color-st-rascunho)" },
  { chave: "agendado", rotulo: "Agendado", cor: "var(--color-st-agendado)" },
  { chave: "publicado", rotulo: "Publicado", cor: "var(--color-st-publicado)" },
  { chave: "falhou", rotulo: "Falhou", cor: "var(--color-st-falhou)" },
];

const ATALHOS = [
  { href: "/agendar", titulo: "Agendar Post", desc: "Crie uma nova publicação." },
  { href: "/calendario", titulo: "Calendário", desc: "Veja o mês completo." },
  { href: "/midias", titulo: "Mídia", desc: "Fotos e vídeos do cliente." },
  { href: "/relatorio", titulo: "Relatórios", desc: "Acompanhe os status." },
];

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PainelPage() {
  const { clienteAtivo, carregando: carregandoCtx } = useClienteAtivo();
  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!clienteAtivo) {
      setPosts([]);
      return;
    }
    (async () => {
      setCarregando(true);
      const { data } = await supabase
        .from("posts_agendados")
        .select("id, legenda, data_agendada, status")
        .eq("cliente_id", clienteAtivo.id)
        .order("data_agendada", { ascending: true });
      setPosts((data as Post[]) ?? []);
      setCarregando(false);
    })();
  }, [clienteAtivo]);

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

  const proximos = useMemo(() => {
    const agora = Date.now();
    return posts
      .filter((p) => new Date(p.data_agendada).getTime() >= agora)
      .slice(0, 5);
  }, [posts]);

  // Sem cliente selecionado.
  if (!carregandoCtx && !clienteAtivo) {
    return (
      <div className="rounded-md border border-dashed border-line bg-surface px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-light">Bem-vindo à 9LABS</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Escolha um cliente para ver o painel, ou cadastre um novo.
        </p>
        <Link
          href="/clientes"
          className="mt-6 inline-block rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft"
        >
          Escolher cliente
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <div className="micro-label">Painel</div>
        <h1 className="mt-1 font-display text-4xl font-light tracking-tight">
          {clienteAtivo?.nome ?? "..."}
        </h1>
      </header>

      {/* Contadores por status */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS.map((s) => (
          <div key={s.chave} className="rounded-md border border-line bg-surface p-5">
            <div className="font-display text-3xl font-light">
              {contagem[s.chave]}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.cor }}
              />
              <span className="micro-label">{s.rotulo}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Próximos posts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="micro-label">Próximas publicações</div>
          <Link href="/agendar" className="text-sm text-ink hover:underline">
            + Agendar
          </Link>
        </div>

        {carregando ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : proximos.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            Nenhuma publicação futura. Que tal agendar uma?
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {proximos.map((p) => {
              const s = STATUS.find((x) => x.chave === p.status)!;
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {p.legenda ?? <span className="text-muted">(sem legenda)</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatarData(p.data_agendada)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.cor }}
                    />
                    <span className="micro-label">{s.rotulo}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Atalhos */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ATALHOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-md border border-line bg-surface p-5 transition hover:border-line-strong"
          >
            <h2 className="font-medium">{a.titulo}</h2>
            <p className="mt-1 text-xs text-muted">{a.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
