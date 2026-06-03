"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useClienteAtivo, monograma } from "@/context/ClienteAtivo";
import { supabase } from "@/lib/supabase";

type Plataforma = "instagram" | "facebook" | "tiktok";
type ContaSocial = {
  id: string;
  plataforma: Plataforma;
  usuario_handle: string | null;
};
type Midia = {
  id: string;
  tipo: "imagem" | "video";
  nome_arquivo: string | null;
  url_publica: string;
};

const REDES: Record<Plataforma, { nome: string; sigla: string }> = {
  instagram: { nome: "Instagram", sigla: "IG" },
  facebook: { nome: "Facebook", sigla: "f" },
  tiktok: { nome: "TikTok", sigla: "TT" },
};

// Rótulo numerado de cada etapa.
function Etapa({ n, titulo }: { n: number; titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line font-display text-sm">
        {n}
      </span>
      <span className="micro-label">{titulo}</span>
    </div>
  );
}

export default function AgendarPage() {
  const { clienteAtivo, carregando: carregandoCtx } = useClienteAtivo();

  const [contas, setContas] = useState<ContaSocial[]>([]);
  const [midias, setMidias] = useState<Midia[]>([]);

  const [canais, setCanais] = useState<string[]>([]);
  const [midiaId, setMidiaId] = useState("");
  const [legenda, setLegenda] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Carrega contas e mídias do cliente ativo.
  useEffect(() => {
    if (!clienteAtivo) {
      setContas([]);
      setMidias([]);
      return;
    }
    (async () => {
      const { data: c } = await supabase
        .from("contas_sociais")
        .select("id, plataforma, usuario_handle")
        .eq("cliente_id", clienteAtivo.id);
      setContas((c as ContaSocial[]) ?? []);

      const { data: m } = await supabase
        .from("midias")
        .select("id, tipo, nome_arquivo, url_publica")
        .or(`cliente_id.eq.${clienteAtivo.id},cliente_id.is.null`)
        .order("created_at", { ascending: false });
      setMidias((m as Midia[]) ?? []);
      // limpa seleções ao trocar de cliente
      setCanais([]);
      setMidiaId("");
    })();
  }, [clienteAtivo]);

  function alternarCanal(id: string) {
    setCanais((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  const midiaSelecionada = useMemo(
    () => midias.find((m) => m.id === midiaId) ?? null,
    [midias, midiaId],
  );

  // Conta usada no preview (a primeira selecionada).
  const contaPreview = useMemo(
    () => contas.find((c) => canais.includes(c.id)) ?? null,
    [contas, canais],
  );
  const plataformaPreview: Plataforma = contaPreview?.plataforma ?? "instagram";
  const handlePreview =
    contaPreview?.usuario_handle ?? clienteAtivo?.nome ?? "cliente";

  async function salvar(status: "rascunho" | "agendado") {
    if (!clienteAtivo) return;
    if (!data || !hora) {
      setErro("Escolha a data e o horário.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setSucesso(null);

    const dataHoraISO = new Date(`${data}T${hora}`).toISOString();

    const { data: novo, error } = await supabase
      .from("posts_agendados")
      .insert({
        cliente_id: clienteAtivo.id,
        midia_id: midiaId || null,
        legenda: legenda.trim() || null,
        data_agendada: dataHoraISO,
        status,
      })
      .select("id")
      .single();

    if (error || !novo) {
      setErro(error?.message ?? "Falha ao salvar.");
      setSalvando(false);
      return;
    }

    if (canais.length > 0) {
      await supabase.from("posts_contas").insert(
        canais.map((contaId) => ({ post_id: novo.id, conta_social_id: contaId })),
      );
    }

    setSucesso(
      status === "rascunho" ? "Rascunho salvo." : "Publicação agendada!",
    );
    setLegenda("");
    setMidiaId("");
    setCanais([]);
    setData("");
    setHora("");
    setSalvando(false);
  }

  // Sem cliente selecionado.
  if (!carregandoCtx && !clienteAtivo) {
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

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Formulário em etapas */}
        <div className="space-y-8 rounded-md border border-line bg-surface p-6">
          {/* 1 Cliente */}
          <section className="space-y-3">
            <Etapa n={1} titulo="Cliente" />
            <div className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink text-[10px] font-semibold text-surface">
                {clienteAtivo ? monograma(clienteAtivo.nome) : "?"}
              </span>
              {clienteAtivo?.nome}
            </div>
          </section>

          {/* 2 Canais */}
          <section className="space-y-3">
            <Etapa n={2} titulo="Canais" />
            {contas.length === 0 ? (
              <p className="text-sm text-muted">
                Este cliente não tem contas sociais.{" "}
                <Link
                  href={`/clientes/${clienteAtivo?.id}`}
                  className="text-ink hover:underline"
                >
                  Adicionar contas
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {contas.map((conta) => {
                  const sel = canais.includes(conta.id);
                  return (
                    <button
                      key={conta.id}
                      onClick={() => alternarCanal(conta.id)}
                      className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition ${
                        sel
                          ? "border-ink bg-ink text-surface"
                          : "border-line hover:border-line-strong"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-semibold ${
                          sel ? "bg-surface text-ink" : "bg-ink text-surface"
                        }`}
                      >
                        {REDES[conta.plataforma].sigla}
                      </span>
                      {REDES[conta.plataforma].nome}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3 Texto */}
          <section className="space-y-3">
            <Etapa n={3} titulo="Texto do post" />
            <textarea
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Escreva a legenda..."
              className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <div className="flex justify-between">
              <span className="micro-label">
                {(legenda.match(/#/g) ?? []).length} hashtags
              </span>
              <span className="micro-label">{legenda.length} / 2000</span>
            </div>
          </section>

          {/* 4 Mídia */}
          <section className="space-y-3">
            <Etapa n={4} titulo={`Mídia${midiaSelecionada ? " · 1 selecionada" : ""}`} />
            <div className="grid grid-cols-4 gap-3">
              {midias.slice(0, 7).map((m) => {
                const sel = m.id === midiaId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMidiaId(sel ? "" : m.id)}
                    className={`relative aspect-square overflow-hidden rounded-sm border bg-paper ${
                      sel ? "border-ink ring-1 ring-ink" : "border-line"
                    }`}
                    title={m.nome_arquivo ?? ""}
                  >
                    {m.tipo === "imagem" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url_publica}
                        alt={m.nome_arquivo ?? ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-muted">
                        🎬
                      </span>
                    )}
                  </button>
                );
              })}
              <Link
                href="/midias"
                className="flex aspect-square items-center justify-center rounded-sm border border-dashed border-line text-xs text-muted hover:border-line-strong"
              >
                + enviar
              </Link>
            </div>
          </section>

          {/* 5 Data e horário */}
          <section className="space-y-3">
            <Etapa n={5} titulo="Data e horário" />
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </div>
          </section>

          {/* Mensagens + ações */}
          {erro && <p className="text-sm text-st-falhou">Erro: {erro}</p>}
          {sucesso && <p className="text-sm text-st-publicado">{sucesso}</p>}

          <div className="flex items-center justify-end gap-4 border-t border-line pt-5">
            <button
              onClick={() => salvar("rascunho")}
              disabled={salvando}
              className="text-sm text-ink-soft hover:underline disabled:opacity-40"
            >
              Salvar rascunho
            </button>
            <button
              onClick={() => salvar("agendado")}
              disabled={salvando}
              className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Agendar publicação"}
            </button>
          </div>
        </div>

        {/* Preview do feed */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <span className="micro-label">Pré-visualização</span>
            <span className="micro-label">{REDES[plataformaPreview].nome}</span>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-surface shadow-[0_14px_34px_-22px_rgba(20,18,12,.4)]">
            <div className="flex items-center gap-2 p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-surface">
                {clienteAtivo ? monograma(clienteAtivo.nome) : "?"}
              </span>
              <span className="text-sm font-semibold">{handlePreview}</span>
            </div>
            <div className="aspect-square bg-paper">
              {midiaSelecionada ? (
                midiaSelecionada.tipo === "imagem" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={midiaSelecionada.url_publica}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={midiaSelecionada.url_publica}
                    controls
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted">
                  Selecione uma mídia
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="text-sm">
                {legenda || (
                  <span className="text-muted">A legenda aparece aqui...</span>
                )}
              </p>
              <div className="flex gap-4 text-xs text-muted">
                <span>♡ Curtir</span>
                <span>○ Comentar</span>
                <span>↗ Compartilhar</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
