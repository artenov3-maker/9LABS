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
// Um "formato" = um tipo de publicação com a sua própria mídia.
type Formato = { tipo: string; midiaId: string };

const REDES: Record<Plataforma, { nome: string; sigla: string }> = {
  instagram: { nome: "Instagram", sigla: "IG" },
  facebook: { nome: "Facebook", sigla: "f" },
  tiktok: { nome: "TikTok", sigla: "TT" },
};

const TIPOS = [
  { valor: "feed", rotulo: "Feed", tamanho: "1080×1350" },
  { valor: "story", rotulo: "Story", tamanho: "1080×1920" },
  { valor: "reels", rotulo: "Reels", tamanho: "vídeo 9:16" },
];

// Quais redes recebem cada tipo de formato.
function suporta(plataforma: Plataforma, tipo: string): boolean {
  if (tipo === "feed") return plataforma === "instagram" || plataforma === "facebook";
  if (tipo === "story") return plataforma === "instagram" || plataforma === "facebook";
  if (tipo === "reels") return plataforma === "instagram" || plataforma === "tiktok";
  return false;
}

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
  const [legenda, setLegenda] = useState("");
  // Formatos a publicar (cada um com sua mídia).
  const [formatos, setFormatos] = useState<Formato[]>([{ tipo: "feed", midiaId: "" }]);
  const [formatoAtivo, setFormatoAtivo] = useState(0); // qual formato o menu de mídia mexe
  const [datas, setDatas] = useState<{ data: string; hora: string }[]>([
    { data: "", hora: "" },
  ]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<
    null | "rascunho" | "agendado" | "editado" | "publicado"
  >(null);

  const [publicandoZernio, setPublicandoZernio] = useState(false);
  const [zernioMsg, setZernioMsg] = useState<string | null>(null);
  const [zernioErro, setZernioErro] = useState(false);

  const [menuMidia, setMenuMidia] = useState(false);
  const [biblioteca, setBiblioteca] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const alvoMidiaRef = useRef(0); // índice do formato que vai receber a mídia

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

  // Setup inicial: edição (carrega o post) ou novo.
  useEffect(() => {
    (async () => {
      setCarregando(true);
      if (editando && postId) {
        const { data: post, error } = await supabase
          .from("posts_agendados")
          .select(
            "cliente_id, midia_id, legenda, data_agendada, status, clientes(nome), posts_contas(conta_social_id, tipo_conteudo)",
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
          posts_contas: { conta_social_id: string; tipo_conteudo: string | null }[];
        };
        setClienteId(p.cliente_id);
        setClienteNome(p.clientes?.nome ?? "");
        setLegenda(p.legenda ?? "");
        setCanais(p.posts_contas.map((x) => x.conta_social_id));
        // Um post existente = um único formato.
        setFormatos([
          {
            tipo: p.posts_contas[0]?.tipo_conteudo ?? "feed",
            midiaId: p.midia_id ?? "",
          },
        ]);
        const dh = separarDataHora(p.data_agendada);
        setDatas([{ data: dh.data, hora: dh.hora }]);
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

  function midiaPorId(id: string) {
    return midias.find((m) => m.id === id) ?? null;
  }

  // Formato em edição (para o preview e o alvo do menu de mídia).
  const formatoAtual = formatos[formatoAtivo] ?? formatos[0];
  const midiaPreview = formatoAtual ? midiaPorId(formatoAtual.midiaId) : null;

  // Canais selecionados que suportam um dado tipo.
  const canaisQueSuportam = useCallback(
    (tipo: string) =>
      canais.filter((cid) => {
        const c = contas.find((x) => x.id === cid);
        return c ? suporta(c.plataforma, tipo) : false;
      }),
    [canais, contas],
  );

  function setMidiaDoFormato(i: number, midiaId: string) {
    setFormatos((arr) => arr.map((f, j) => (j === i ? { ...f, midiaId } : f)));
  }
  function setTipoDoFormato(i: number, tipo: string) {
    setFormatos((arr) => arr.map((f, j) => (j === i ? { ...f, tipo } : f)));
  }

  // Upload inline: envia direto para a Zernio e associa ao formato ativo.
  async function enviarNovoArquivo(arquivo: File) {
    const ehImagem = arquivo.type.startsWith("image/");
    const ehVideo = arquivo.type.startsWith("video/");
    if (!ehImagem && !ehVideo) {
      setErro("Só imagens ou vídeos.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch("/api/zernio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: nomeSeguro(arquivo.name),
          contentType: arquivo.type,
        }),
      });
      const info = await r.json();
      if (!info.ok || !info.uploadUrl || !info.publicUrl) {
        setErro(`Falha ao preparar o upload: ${info.motivo ?? "tente de novo."}`);
        setEnviando(false);
        return;
      }
      const put = await fetch(info.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });
      if (!put.ok) {
        setErro(`Falha ao enviar o arquivo (${put.status}).`);
        setEnviando(false);
        return;
      }
      const { data: nova, error: erroIns } = await supabase
        .from("midias")
        .insert({
          cliente_id: clienteId,
          tipo: ehImagem ? "imagem" : "video",
          url_publica: info.publicUrl,
          caminho_storage: info.key ?? info.publicUrl,
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
      setMidiaDoFormato(alvoMidiaRef.current, (nova as Midia).id);
      setMenuMidia(false);
    } catch (e) {
      setErro(`Erro no upload: ${(e as Error).message}`);
    }
    setEnviando(false);
  }

  // Grava UM post (um formato) para uma data. Devolve o id.
  async function gravarPost(
    status: Status,
    dataHoraISO: string,
    midiaId: string | null,
    canaisIds: string[],
    tipo: string,
  ): Promise<string | null> {
    if (!clienteId) return null;
    setSalvando(true);
    setErro(null);
    const campos = {
      midia_id: midiaId || null,
      legenda: legenda.trim() || null,
      data_agendada: dataHoraISO,
      status,
    };

    let idFinal = postId ?? null;
    if (editando && postId) {
      const { error } = await supabase
        .from("posts_agendados")
        .update(campos)
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
        .insert({ cliente_id: clienteId, ...campos })
        .select("id")
        .single();
      if (error || !novo) {
        setErro(error?.message ?? "Falha ao salvar.");
        setSalvando(false);
        return null;
      }
      idFinal = novo.id;
    }

    if (canaisIds.length > 0 && idFinal) {
      await supabase.from("posts_contas").insert(
        canaisIds.map((c) => ({
          post_id: idFinal,
          conta_social_id: c,
          tipo_conteudo: tipo,
        })),
      );
    }
    setSalvando(false);
    return idFinal;
  }

  async function publicarPorId(id: string, agora = false): Promise<boolean> {
    setPublicandoZernio(true);
    try {
      const resp = await fetch("/api/zernio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id, agora }),
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

  function isoDe(d: { data: string; hora: string }) {
    return new Date(`${d.data}T${d.hora}`).toISOString();
  }

  function resetForm() {
    setLegenda("");
    setCanais([]);
    setFormatos([{ tipo: "feed", midiaId: "" }]);
    setFormatoAtivo(0);
    setDatas([{ data: "", hora: "" }]);
    setErro(null);
    setZernioMsg(null);
    setZernioErro(false);
  }

  // Só publica os formatos que você preencheu com mídia. Sem mídia = não vai.
  function formatosValidos() {
    return formatos.filter((f) => f.midiaId);
  }

  // Cria e publica cada formato, em cada data, nas redes que suportam.
  async function processar(agora: boolean) {
    if (canais.length === 0) {
      setErro("Marque pelo menos um canal.");
      return;
    }
    const validas = datas.filter((d) => d.data && d.hora);
    if (validas.length === 0) {
      setErro("Escolha pelo menos uma data e horário.");
      return;
    }
    const usar = formatosValidos();
    if (usar.length === 0) {
      setErro("Adicione pelo menos um formato com mídia.");
      return;
    }
    setErro(null);
    setZernioMsg(null);
    setZernioErro(false);

    let feitos = 0;
    let criados = 0;
    for (const d of validas) {
      for (const f of usar) {
        const alvo = canaisQueSuportam(f.tipo);
        if (alvo.length === 0) continue; // nenhuma rede marcada suporta esse formato
        criados++;
        const id = await gravarPost(
          "agendado",
          agora ? new Date().toISOString() : isoDe(d),
          f.midiaId || null,
          alvo,
          f.tipo,
        );
        if (!id) return;
        const ok = await publicarPorId(id, agora);
        if (!ok) return; // para no 1º erro e mostra a mensagem
        feitos++;
      }
    }
    if (criados === 0) {
      setErro("Nenhuma rede marcada suporta os formatos escolhidos.");
      return;
    }
    if (feitos > 0 && feitos === criados) {
      setSucesso(agora ? "publicado" : "agendado");
    }
  }

  // Modo edição: salva o único post (um formato, uma data).
  async function salvar() {
    const d0 = datas[0];
    if (!d0?.data || !d0?.hora) {
      setErro("Escolha a data e o horário.");
      return;
    }
    const f = formatos[0];
    const id = await gravarPost(
      "agendado",
      isoDe(d0),
      f.midiaId || null,
      canais,
      f.tipo,
    );
    if (id) setSucesso("editado");
  }
  async function publicarZernio() {
    if (!postId) return;
    const ok = await publicarPorId(postId, false);
    if (ok) {
      setZernioErro(false);
      setZernioMsg("Agendado na rede via Zernio com sucesso!");
    }
  }
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
      setZernioErro(false);
      setZernioMsg(
        dados.novo
          ? `Status atualizado para: ${dados.novo}.`
          : `Sem mudança de status. (Zernio: ${dados.statusZernio ?? "?"})`,
      );
    } catch (e) {
      setZernioErro(true);
      setZernioMsg(`Erro: ${(e as Error).message}`);
    }
    setPublicandoZernio(false);
  }

  const handlePreview = useMemo(() => {
    const conta = contas.find((c) => canais.includes(c.id));
    return conta?.usuario_handle ?? clienteNome ?? "cliente";
  }, [contas, canais, clienteNome]);

  const tipoPreview = formatoAtual?.tipo ?? "feed";
  const rotuloPreview =
    TIPOS.find((t) => t.valor === tipoPreview)?.rotulo ?? "Feed";

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

        {/* 4 Formatos + mídia */}
        <section className="space-y-3">
          <Etapa n={4} titulo={editando ? "Formato e mídia" : "Formatos e mídia"} />
          <div className="space-y-3">
            {formatos.map((f, i) => {
              const m = midiaPorId(f.midiaId);
              const alvo = canaisQueSuportam(f.tipo);
              const ehVideo = m?.tipo === "video";
              return (
                <div key={i} className="rounded-sm border border-line p-3">
                  {/* Escolha do tipo */}
                  <div className="flex flex-wrap items-center gap-2">
                    {TIPOS.filter((t) => t.valor !== "reels" || ehVideo).map((t) => (
                      <button
                        key={t.valor}
                        onClick={() => setTipoDoFormato(i, t.valor)}
                        className={`rounded-sm border px-2.5 py-1 text-xs transition ${
                          f.tipo === t.valor
                            ? "border-ink bg-ink text-surface"
                            : "border-line text-ink-soft hover:border-line-strong"
                        }`}
                      >
                        {t.rotulo}
                      </button>
                    ))}
                    <span className="text-[11px] text-muted">
                      {TIPOS.find((t) => t.valor === f.tipo)?.tamanho}
                      {!ehVideo && " · Reels exige vídeo"}
                    </span>
                    {!editando && formatos.length > 1 && (
                      <button
                        onClick={() =>
                          setFormatos((arr) => arr.filter((_, j) => j !== i))
                        }
                        className="ml-auto text-[11px] text-muted hover:text-st-falhou hover:underline"
                      >
                        remover formato
                      </button>
                    )}
                  </div>

                  {/* Mídia do formato */}
                  <div className="mt-3 flex items-center gap-3">
                    {m ? (
                      <div className="relative h-20 w-20 overflow-hidden rounded-sm border border-line bg-paper">
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
                        <button
                          onClick={() => setMidiaDoFormato(i, "")}
                          className="absolute right-0 top-0 bg-ink px-1 text-[10px] text-surface"
                          title="Remover mídia"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-dashed border-line text-xs text-muted">
                        sem mídia
                      </div>
                    )}

                    <div className="relative">
                      <button
                        onClick={() => {
                          alvoMidiaRef.current = i;
                          setFormatoAtivo(i);
                          setMenuMidia((a) => (formatoAtivo === i ? !a : true));
                        }}
                        disabled={enviando}
                        className="rounded-sm border border-line px-4 py-2 text-sm hover:border-line-strong disabled:opacity-40"
                      >
                        {enviando && formatoAtivo === i
                          ? "Enviando..."
                          : m
                            ? "Trocar mídia ▾"
                            : "+ Adicionar mídia ▾"}
                      </button>
                      {menuMidia && formatoAtivo === i && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuMidia(false)}
                          />
                          <div className="absolute left-0 z-20 mt-1 w-56 rounded-md border border-line bg-surface py-1 shadow-[0_14px_34px_-22px_rgba(20,18,12,.4)]">
                            <button
                              onClick={() => {
                                alvoMidiaRef.current = i;
                                inputArquivoRef.current?.click();
                              }}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                            >
                              ⬆ Enviar novo arquivo
                            </button>
                            <button
                              onClick={() => {
                                alvoMidiaRef.current = i;
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
                    </div>
                  </div>

                  {/* Para quais redes esse formato vai */}
                  <p className="mt-2 text-[11px] text-muted">
                    {alvo.length > 0
                      ? `Vai para: ${alvo
                          .map((cid) => {
                            const c = contas.find((x) => x.id === cid);
                            return c ? REDES[c.plataforma].nome : "";
                          })
                          .filter(Boolean)
                          .join(", ")}`
                      : "Nenhuma rede marcada suporta esse formato."}
                  </p>
                </div>
              );
            })}
          </div>

          {!editando && (
            <button
              onClick={() =>
                setFormatos((arr) => [...arr, { tipo: "story", midiaId: "" }])
              }
              className="text-sm text-ink hover:underline"
            >
              + adicionar formato (ex.: Story)
            </button>
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
        </section>

        {/* 5 Datas */}
        <section className="space-y-3">
          <Etapa n={5} titulo={editando ? "Data e horário" : "Datas e horários"} />
          <div className="space-y-2">
            {datas.map((d, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={d.data}
                  onChange={(e) =>
                    setDatas((arr) =>
                      arr.map((x, j) => (j === i ? { ...x, data: e.target.value } : x)),
                    )
                  }
                  className="rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
                />
                <input
                  type="time"
                  value={d.hora}
                  onChange={(e) =>
                    setDatas((arr) =>
                      arr.map((x, j) => (j === i ? { ...x, hora: e.target.value } : x)),
                    )
                  }
                  className="rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
                />
                {!editando && datas.length > 1 && (
                  <button
                    onClick={() => setDatas((arr) => arr.filter((_, j) => j !== i))}
                    className="text-xs text-muted hover:text-st-falhou hover:underline"
                  >
                    remover
                  </button>
                )}
              </div>
            ))}
          </div>
          {!editando && (
            <button
              onClick={() => setDatas((arr) => [...arr, { data: "", hora: "" }])}
              className="text-sm text-ink hover:underline"
            >
              + adicionar data
            </button>
          )}
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
          {editando ? (
            <>
              <div className="mr-auto flex items-center gap-3">
                <button
                  onClick={publicarZernio}
                  disabled={publicandoZernio}
                  className="rounded-sm border border-ink px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink hover:text-surface disabled:opacity-40"
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
              <button
                onClick={salvar}
                disabled={salvando}
                className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft disabled:opacity-40"
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => processar(true)}
                disabled={salvando || publicandoZernio}
                className="text-sm text-ink-soft hover:text-ink hover:underline disabled:opacity-40"
                title="Publica na hora, ignorando a data."
              >
                Publicar agora
              </button>
              <button
                onClick={() => processar(false)}
                disabled={salvando || publicandoZernio}
                className="rounded-sm bg-ink px-6 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft disabled:opacity-40"
              >
                {salvando || publicandoZernio ? "Agendando..." : "Agendar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-2 flex items-center justify-between">
          <span className="micro-label">Pré-visualização</span>
          <span className="micro-label">Instagram · {rotuloPreview}</span>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-[0_14px_34px_-22px_rgba(20,18,12,.4)]">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-ink to-ink-soft text-xs font-semibold text-white">
              {clienteNome ? monograma(clienteNome) : "?"}
            </span>
            <span className="flex-1 text-sm font-semibold text-ink">{handlePreview}</span>
            <span className="text-ink">⋯</span>
          </div>
          <div
            className={`bg-paper ${
              tipoPreview === "story" || tipoPreview === "reels"
                ? "aspect-[9/16]"
                : "aspect-[4/5]"
            }`}
          >
            {midiaPreview ? (
              midiaPreview.tipo === "imagem" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={midiaPreview.url_publica}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={midiaPreview.url_publica}
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
          <div className="flex items-center gap-4 px-3 pt-2.5 text-xl text-ink">
            <span>♡</span>
            <span>○</span>
            <span>↗</span>
            <span className="ml-auto">⊟</span>
          </div>
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
                      setMidiaDoFormato(alvoMidiaRef.current, m.id);
                      setBiblioteca(false);
                    }}
                    className={`aspect-square overflow-hidden rounded-sm border bg-paper ${
                      m.id === formatos[alvoMidiaRef.current]?.midiaId
                        ? "border-ink ring-1 ring-ink"
                        : "border-line"
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

      {/* Sucesso animado */}
      {sucesso && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 text-center animate-pop-in">
            <svg viewBox="0 0 52 52" className="mx-auto h-16 w-16" fill="none" stroke="currentColor">
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
                  : sucesso === "publicado"
                    ? "Enviado para publicar!"
                    : "Publicação agendada!"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {sucesso === "publicado"
                ? "Está publicando na rede — pode levar alguns minutos para aparecer."
                : sucesso === "agendado"
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
                  onClick={() => {
                    setSucesso(null);
                    resetForm();
                  }}
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
