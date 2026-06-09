"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { monograma } from "@/context/ClienteAtivo";

type Plataforma = "instagram" | "facebook" | "tiktok";
type Status = "rascunho" | "agendado" | "publicado" | "falhou";
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
const BUCKET = "midias";

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Converte ISO -> { data: "yyyy-mm-dd", hora: "hh:mm" } no horário local.
function separarDataHora(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    data: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    hora: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

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

export default function EditorPost({
  postId,
  clienteId: clienteIdProp,
  clienteNome: clienteNomeProp,
}: {
  postId?: string;
  clienteId?: string;
  clienteNome?: string;
}) {
  const router = useRouter();
  const editando = Boolean(postId);

  const [clienteId, setClienteId] = useState(clienteIdProp ?? "");
  const [clienteNome, setClienteNome] = useState(clienteNomeProp ?? "");
  const [contas, setContas] = useState<ContaSocial[]>([]);
  const [midias, setMidias] = useState<Midia[]>([]);

  const [canais, setCanais] = useState<string[]>([]);
  const [midiaId, setMidiaId] = useState("");
  const [legenda, setLegenda] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<null | "rascunho" | "agendado" | "editado">(
    null,
  );

  // Publicação via Zernio.
  const [publicandoZernio, setPublicandoZernio] = useState(false);
  const [zernioMsg, setZernioMsg] = useState<string | null>(null);
  const [zernioErro, setZernioErro] = useState(false);

  // Mídia: menu e modal de biblioteca.
  const [menuMidia, setMenuMidia] = useState(false);
  const [biblioteca, setBiblioteca] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  // Carrega contas + mídias de um cliente.
  const carregarDoCliente = useCallback(async (cid: string) => {
    const { data: c } = await supabase
      .from("contas_sociais")
      .select("id, plataforma, usuario_handle")
      .eq("cliente_id", cid);
    setContas((c as ContaSocial[]) ?? []);

    const { data: m } = await supabase
      .from("midias")
      .select("id, tipo, nome_arquivo, url_publica")
      .or(`cliente_id.eq.${cid},cliente_id.is.null`)
      .order("created_at", { ascending: false });
    setMidias((m as Midia[]) ?? []);
  }, []);

  // Setup inicial: edição (carrega o post) ou novo (usa o cliente recebido).
  useEffect(() => {
    (async () => {
      setCarregando(true);
      if (editando && postId) {
        const { data: post, error } = await supabase
          .from("posts_agendados")
          .select(
            "cliente_id, midia_id, legenda, data_agendada, status, clientes(nome), posts_contas(conta_social_id)",
          )
          .eq("id", postId)
          .single();
        if (error || !post) {
          setErro(error?.message ?? "Post não encontrado.");
          setCarregando(false);
          return;
        }
        const p = post as unknown as {
          cliente_id: string;
          midia_id: string | null;
          legenda: string | null;
          data_agendada: string;
          status: Status;
          clientes: { nome: string } | null;
          posts_contas: { conta_social_id: string }[];
        };
        setClienteId(p.cliente_id);
        setClienteNome(p.clientes?.nome ?? "");
        setMidiaId(p.midia_id ?? "");
        setLegenda(p.legenda ?? "");
        setCanais(p.posts_contas.map((x) => x.conta_social_id));
        const dh = separarDataHora(p.data_agendada);
        setData(dh.data);
        setHora(dh.hora);
        await carregarDoCliente(p.cliente_id);
      } else if (clienteIdProp) {
        setClienteId(clienteIdProp);
        setClienteNome(clienteNomeProp ?? "");
        await carregarDoCliente(clienteIdProp);
      }
      setCarregando(false);
    })();
  }, [postId, editando, clienteIdProp, clienteNomeProp, carregarDoCliente]);

  function alternarCanal(id: string) {
    setCanais((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  const midiaSelecionada = useMemo(
    () => midias.find((m) => m.id === midiaId) ?? null,
    [midias, midiaId],
  );
  const contaPreview = useMemo(
    () => contas.find((c) => canais.includes(c.id)) ?? null,
    [contas, canais],
  );
  const handlePreview = contaPreview?.usuario_handle ?? clienteNome ?? "cliente";

  // Upload inline (envia novo arquivo já associado ao cliente).
  async function enviarNovoArquivo(arquivo: File) {
    const ehImagem = arquivo.type.startsWith("image/");
    const ehVideo = arquivo.type.startsWith("video/");
    if (!ehImagem && !ehVideo) {
      setErro("Só imagens ou vídeos.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const caminho = `${clienteId}/${Date.now()}-${nomeSeguro(arquivo.name)}`;
    const { error: erroUp } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, arquivo);
    if (erroUp) {
      setErro(`Falha no upload: ${erroUp.message}`);
      setEnviando(false);
      return;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
    const { data: nova, error: erroIns } = await supabase
      .from("midias")
      .insert({
        cliente_id: clienteId,
        tipo: ehImagem ? "imagem" : "video",
        url_publica: pub.publicUrl,
        caminho_storage: caminho,
        nome_arquivo: arquivo.name,
      })
      .select("id, tipo, nome_arquivo, url_publica")
      .single();
    if (erroIns || !nova) {
      setErro(erroIns?.message ?? "Falha ao registrar a mídia.");
      setEnviando(false);
      return;
    }
    setMidias((lista) => [nova as Midia, ...lista]);
    setMidiaId((nova as Midia).id);
    setEnviando(false);
    setMenuMidia(false);
  }

  // Grava o post (cria ou atualiza) e devolve o id. Não mostra o modal de sucesso.
  async function gravarPost(status: Status): Promise<string | null> {
    if (!clienteId) return null;
    if (!data || !hora) {
      setErro("Escolha a data e o horário.");
      return null;
    }
    setSalvando(true);
    setErro(null);
    const dataHoraISO = new Date(`${data}T${hora}`).toISOString();
    const camposPost = {
      midia_id: midiaId || null,
      legenda: legenda.trim() || null,
      data_agendada: dataHoraISO,
      status,
    };

    let postIdFinal = postId ?? null;
    if (editando && postId) {
      const { error } = await supabase
        .from("posts_agendados")
        .update(camposPost)
        .eq("id", postId);
      if (error) {
        setErro(error.message);
        setSalvando(false);
        return null;
      }
      await supabase.from("posts_contas").delete().eq("post_id", postId);
    } else {
      const { data: novo, error } = await supabase
        .from("posts_agendados")
        .insert({ cliente_id: clienteId, ...camposPost })
        .select("id")
        .single();
      if (error || !novo) {
        setErro(error?.message ?? "Falha ao salvar.");
        setSalvando(false);
        return null;
      }
      postIdFinal = novo.id;
    }

    if (canais.length > 0 && postIdFinal) {
      await supabase
        .from("posts_contas")
        .insert(canais.map((c) => ({ post_id: postIdFinal, conta_social_id: c })));
    }
    setSalvando(false);
    return postIdFinal;
  }

  // Salvar local (rascunho/agendado) com a mensagem de sucesso.
  async function salvar(status: Status) {
    const id = await gravarPost(status);
    if (id) {
      setSucesso(
        editando ? "editado" : status === "rascunho" ? "rascunho" : "agendado",
      );
    }
  }

  // Publica de verdade pelo id do post; mostra mensagem amigável.
  // Envia o post à Zernio pelo id; devolve true se deu certo.
  async function publicarPorId(id: string): Promise<boolean> {
    setPublicandoZernio(true);
    setZernioMsg(null);
    setZernioErro(false);
    try {
      const resp = await fetch("/api/zernio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id }),
      });
      const dados = await resp.json();
      if (dados.ok) {
        setPublicandoZernio(false);
        return true;
      }
      setZernioErro(true);
      setZernioMsg(dados.motivo ?? "Não foi possível publicar.");
    } catch (e) {
      setZernioErro(true);
      setZernioMsg(`Erro de conexão: ${(e as Error).message}`);
    }
    setPublicandoZernio(false);
    return false;
  }

  // Botão no modo edição: publica e mostra confirmação na faixa verde.
  async function publicarZernio() {
    if (!postId) return;
    const ok = await publicarPorId(postId);
    if (ok) {
      setZernioErro(false);
      setZernioMsg("Agendado na rede via Zernio com sucesso!");
    }
  }

  // Botão "Agendar" (modo novo): grava e agenda na Zernio, com confirmação animada.
  async function agendarEPublicar() {
    const id = await gravarPost("agendado");
    if (!id) return;
    const ok = await publicarPorId(id);
    if (ok) setSucesso("agendado");
  }

  // Pergunta à Zernio o estado atual do post e atualiza o status no painel.
  async function atualizarStatus() {
    if (!postId) return;
    setPublicandoZernio(true);
    setZernioMsg(null);
    try {
      const resp = await fetch("/api/zernio/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const dados = await resp.json();
      setZernioMsg(
        dados.novo
          ? `Status atualizado para: ${dados.novo}.`
          : `Sem mudança de status. (Zernio: ${dados.statusZernio ?? "?"})`,
      );
    } catch (e) {
      setZernioMsg(`Erro: ${(e as Error).message}`);
    }
    setPublicandoZernio(false);
  }

  if (carregando) return <p className="text-sm text-muted">Carregando...</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Formulário */}
      <div className="space-y-8 rounded-md border border-line bg-surface p-6">
        {/* 1 Cliente */}
        <section className="space-y-3">
          <Etapa n={1} titulo="Cliente" />
          <div className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink text-[10px] font-semibold text-surface">
              {clienteNome ? monograma(clienteNome) : "?"}
            </span>
            {clienteNome}
          </div>
        </section>

        {/* 2 Canais */}
        <section className="space-y-3">
          <Etapa n={2} titulo="Canais" />
          {contas.length === 0 ? (
            <p className="text-sm text-muted">
              Sem contas sociais.{" "}
              <Link href={`/clientes/${clienteId}`} className="text-ink hover:underline">
                Adicionar
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

          <div className="flex items-center gap-3">
            {/* Miniatura da mídia escolhida */}
            {midiaSelecionada ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-sm border border-line bg-paper">
                {midiaSelecionada.tipo === "imagem" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={midiaSelecionada.url_publica}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    🎬
                  </span>
                )}
                <button
                  onClick={() => setMidiaId("")}
                  className="absolute right-0 top-0 bg-ink px-1 text-[10px] text-surface"
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-dashed border-line text-xs text-muted">
                sem mídia
              </div>
            )}

            {/* Botão com menu (enviar novo / biblioteca) */}
            <div className="relative">
              <button
                onClick={() => setMenuMidia((a) => !a)}
                disabled={enviando}
                className="rounded-sm border border-line px-4 py-2 text-sm hover:border-line-strong disabled:opacity-40"
              >
                {enviando ? "Enviando..." : midiaSelecionada ? "Trocar mídia ▾" : "+ Adicionar mídia ▾"}
              </button>

              {menuMidia && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuMidia(false)}
                  />
                  <div className="absolute left-0 z-20 mt-1 w-56 rounded-md border border-line bg-surface py-1 shadow-[0_14px_34px_-22px_rgba(20,18,12,.4)]">
                    <button
                      onClick={() => inputArquivoRef.current?.click()}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                    >
                      ⬆ Enviar novo arquivo
                    </button>
                    <button
                      onClick={() => {
                        setMenuMidia(false);
                        setBiblioteca(true);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                    >
                      🗂 Usar biblioteca de mídia
                    </button>
                  </div>
                </>
              )}

              <input
                ref={inputArquivoRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) enviarNovoArquivo(f);
                  e.target.value = "";
                }}
              />
            </div>
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

        {erro && (
          <div className="rounded-sm border border-st-falhou/40 bg-st-falhou/10 px-4 py-3 text-sm text-st-falhou">
            {erro}
          </div>
        )}
        {zernioMsg && (
          <div
            className={`rounded-sm px-4 py-3 text-sm ${
              zernioErro
                ? "border border-st-falhou/40 bg-st-falhou/10 text-st-falhou"
                : "border border-st-publicado/40 bg-st-publicado/10 text-st-publicado"
            }`}
          >
            {zernioErro ? "⚠ " : "✓ "}
            {zernioMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-4 border-t border-line pt-5">
          {editando && (
            <div className="mr-auto flex items-center gap-3">
              <button
                onClick={publicarZernio}
                disabled={publicandoZernio}
                className="rounded-sm border border-ink px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink hover:text-surface disabled:opacity-40"
                title="Salve as alterações antes, depois publique de verdade."
              >
                {publicandoZernio ? "Enviando..." : "Publicar via Zernio"}
              </button>
              <button
                onClick={atualizarStatus}
                disabled={publicandoZernio}
                className="text-sm text-muted hover:text-ink hover:underline disabled:opacity-40"
              >
                Atualizar status
              </button>
            </div>
          )}
          {!editando ? (
            <button
              onClick={agendarEPublicar}
              disabled={salvando || publicandoZernio}
              className="rounded-sm bg-ink px-6 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft disabled:opacity-40"
            >
              {salvando || publicandoZernio ? "Agendando..." : "Agendar"}
            </button>
          ) : (
            <button
              onClick={() => salvar("agendado")}
              disabled={salvando}
              className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </div>
      </div>

      {/* Preview realista do Instagram */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-2 flex items-center justify-between">
          <span className="micro-label">Pré-visualização</span>
          <span className="micro-label">Instagram · feed 4:5</span>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-[0_14px_34px_-22px_rgba(20,18,12,.4)]">
          {/* Cabeçalho IG */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-ink to-ink-soft text-xs font-semibold text-white">
              {clienteNome ? monograma(clienteNome) : "?"}
            </span>
            <span className="flex-1 text-sm font-semibold text-ink">
              {handlePreview}
            </span>
            <span className="text-ink">⋯</span>
          </div>
          {/* Mídia em 4:5 (proporção real do feed) */}
          <div className="aspect-[4/5] bg-paper">
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
          {/* Ações IG */}
          <div className="flex items-center gap-4 px-3 pt-2.5 text-xl text-ink">
            <span>♡</span>
            <span>○</span>
            <span>↗</span>
            <span className="ml-auto">⊟</span>
          </div>
          {/* Legenda */}
          <div className="px-3 pb-3 pt-1.5">
            <p className="text-xs font-semibold text-ink">{handlePreview}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-ink-soft">
              {legenda || <span className="text-muted">A legenda aparece aqui...</span>}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted">
          Aproximação do feed. O resultado 100% fiel virá com a integração do Post for Me.
        </p>
      </aside>

      {/* Modal: biblioteca de mídia */}
      {biblioteca && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/30 p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-md border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="micro-label">Biblioteca de {clienteNome}</span>
              <button
                onClick={() => setBiblioteca(false)}
                className="text-sm text-muted hover:text-ink"
              >
                Fechar ✕
              </button>
            </div>
            {midias.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Nenhuma mídia ainda. Use &quot;Enviar novo arquivo&quot;.
              </p>
            ) : (
              <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
                {midias.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMidiaId(m.id);
                      setBiblioteca(false);
                    }}
                    className={`aspect-square overflow-hidden rounded-sm border bg-paper ${
                      m.id === midiaId ? "border-ink ring-1 ring-ink" : "border-line"
                    }`}
                    title={m.nome_arquivo ?? ""}
                  >
                    {m.tipo === "imagem" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url_publica}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        🎬
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensagem de sucesso animada */}
      {sucesso && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 text-center animate-pop-in">
            <svg
              viewBox="0 0 52 52"
              className="mx-auto h-16 w-16"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="26" cy="26" r="24" className="text-st-publicado/30" strokeWidth="2" />
              <path
                d="M16 27 l7 7 l14 -16"
                className="animate-risca text-st-publicado"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="mt-4 font-display text-2xl font-light">
              {sucesso === "editado"
                ? "Alterações salvas!"
                : sucesso === "rascunho"
                  ? "Rascunho salvo!"
                  : "Publicação agendada!"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {sucesso === "agendado"
                ? "Tudo certo — já aparece no calendário."
                : "Suas informações foram guardadas."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => router.push("/calendario")}
                className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft"
              >
                Ver calendário
              </button>
              {editando ? (
                <button
                  onClick={() => router.back()}
                  className="rounded-sm border border-line px-4 py-2 text-sm hover:border-line-strong"
                >
                  Voltar
                </button>
              ) : (
                <button
                  onClick={() => setSucesso(null)}
                  className="rounded-sm border border-line px-4 py-2 text-sm hover:border-line-strong"
                >
                  Agendar outra
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
