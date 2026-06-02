"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = { id: string; nome: string };
type ContaSocial = {
  id: string;
  plataforma: "instagram" | "facebook" | "tiktok";
  usuario_handle: string | null;
};
type Midia = {
  id: string;
  tipo: "imagem" | "video";
  nome_arquivo: string | null;
  url_publica: string;
};

// Post agendado já com os dados ligados (cliente, mídia, redes).
type PostAgendado = {
  id: string;
  cliente_id: string;
  midia_id: string | null;
  legenda: string | null;
  data_agendada: string;
  status: "rascunho" | "agendado" | "publicado" | "falhou";
  clientes: { nome: string } | null;
  midias: { tipo: string; nome_arquivo: string | null } | null;
  posts_contas: { contas_sociais: ContaSocial | null }[];
};

const REDES: Record<ContaSocial["plataforma"], string> = {
  instagram: "📸 Instagram",
  facebook: "👍 Facebook",
  tiktok: "🎵 TikTok",
};

const STATUS_CORES: Record<PostAgendado["status"], string> = {
  rascunho: "bg-zinc-100 text-zinc-600",
  agendado: "bg-blue-100 text-blue-700",
  publicado: "bg-green-100 text-green-700",
  falhou: "bg-red-100 text-red-700",
};

export default function CalendarioPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [posts, setPosts] = useState<PostAgendado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Campos do formulário.
  const [clienteId, setClienteId] = useState("");
  const [contasDoCliente, setContasDoCliente] = useState<ContaSocial[]>([]);
  const [contasSelecionadas, setContasSelecionadas] = useState<string[]>([]);
  const [midiasDoCliente, setMidiasDoCliente] = useState<Midia[]>([]);
  const [midiaId, setMidiaId] = useState("");
  const [legenda, setLegenda] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [status, setStatus] = useState<PostAgendado["status"]>("agendado");
  const [salvando, setSalvando] = useState(false);

  // Carrega a lista de publicações (com cliente, mídia e redes ligados).
  async function carregarPosts() {
    const { data, error } = await supabase
      .from("posts_agendados")
      .select(
        "id, cliente_id, midia_id, legenda, data_agendada, status, clientes(nome), midias(tipo, nome_arquivo), posts_contas(contas_sociais(id, plataforma, usuario_handle))",
      )
      .order("data_agendada", { ascending: true });

    if (error) setErro(error.message);
    else setPosts((data as unknown as PostAgendado[]) ?? []);
  }

  async function carregarClientes() {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome")
      .order("nome", { ascending: true });
    setClientes(data ?? []);
  }

  useEffect(() => {
    (async () => {
      setCarregando(true);
      await carregarClientes();
      await carregarPosts();
      setCarregando(false);
    })();
  }, []);

  // Quando troca o cliente, carrega as contas e mídias dele.
  async function aoTrocarCliente(novoClienteId: string) {
    setClienteId(novoClienteId);
    setContasSelecionadas([]);
    setMidiaId("");
    setContasDoCliente([]);
    setMidiasDoCliente([]);
    if (!novoClienteId) return;

    const { data: contas } = await supabase
      .from("contas_sociais")
      .select("id, plataforma, usuario_handle")
      .eq("cliente_id", novoClienteId);
    setContasDoCliente((contas as ContaSocial[]) ?? []);

    // Mídias do cliente + mídias "gerais" (sem cliente).
    const { data: mids } = await supabase
      .from("midias")
      .select("id, tipo, nome_arquivo, url_publica")
      .or(`cliente_id.eq.${novoClienteId},cliente_id.is.null`)
      .order("created_at", { ascending: false });
    setMidiasDoCliente((mids as Midia[]) ?? []);
  }

  function alternarConta(id: string) {
    setContasSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  // Cria a publicação.
  async function salvarPost(evento: React.FormEvent) {
    evento.preventDefault();
    if (!clienteId) {
      setErro("Escolha um cliente.");
      return;
    }
    if (!dataHora) {
      setErro("Escolha a data e a hora.");
      return;
    }

    setSalvando(true);
    setErro(null);

    // 1) Cria o post.
    const { data: novoPost, error: erroPost } = await supabase
      .from("posts_agendados")
      .insert({
        cliente_id: clienteId,
        midia_id: midiaId || null,
        legenda: legenda.trim() || null,
        data_agendada: new Date(dataHora).toISOString(),
        status,
      })
      .select("id")
      .single();

    if (erroPost || !novoPost) {
      setErro(erroPost?.message ?? "Falha ao salvar a publicação.");
      setSalvando(false);
      return;
    }

    // 2) Liga as redes escolhidas ao post.
    if (contasSelecionadas.length > 0) {
      const ligacoes = contasSelecionadas.map((contaId) => ({
        post_id: novoPost.id,
        conta_social_id: contaId,
      }));
      const { error: erroLig } = await supabase.from("posts_contas").insert(ligacoes);
      if (erroLig) setErro(`Post criado, mas falhou ao ligar redes: ${erroLig.message}`);
    }

    // Limpa o formulário e recarrega.
    setLegenda("");
    setDataHora("");
    setMidiaId("");
    setContasSelecionadas([]);
    setStatus("agendado");
    await carregarPosts();
    setSalvando(false);
  }

  async function excluirPost(post: PostAgendado) {
    const ok = window.confirm("Excluir esta publicação agendada?");
    if (!ok) return;
    setErro(null);
    const { error } = await supabase
      .from("posts_agendados")
      .delete()
      .eq("id", post.id);
    if (error) setErro(error.message);
    else await carregarPosts();
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Calendário & Agendamento</h1>
        <p className="mt-1 text-zinc-600">
          Programe uma publicação: escolha o cliente, as redes, a mídia, a legenda e a
          data/hora.
        </p>
      </div>

      {/* Formulário de nova publicação */}
      <form
        onSubmit={salvarPost}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <h2 className="font-semibold">Nova publicação</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Cliente <span className="text-red-500">*</span>
            </label>
            <select
              value={clienteId}
              onChange={(e) => aoTrocarCliente(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            >
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data e hora */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Data e hora <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Redes (contas do cliente) */}
        {clienteId && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">Redes</label>
            {contasDoCliente.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">
                Este cliente ainda não tem contas sociais. Adicione na página do cliente.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-3">
                {contasDoCliente.map((conta) => (
                  <label
                    key={conta.id}
                    className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={contasSelecionadas.includes(conta.id)}
                      onChange={() => alternarConta(conta.id)}
                    />
                    {REDES[conta.plataforma]}
                    {conta.usuario_handle ? ` ${conta.usuario_handle}` : ""}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mídia */}
        {clienteId && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Mídia (opcional)
            </label>
            <select
              value={midiaId}
              onChange={(e) => setMidiaId(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            >
              <option value="">Sem mídia</option>
              {midiasDoCliente.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tipo === "imagem" ? "🖼️" : "🎬"} {m.nome_arquivo ?? m.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Legenda */}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Legenda</label>
          <textarea
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            rows={3}
            placeholder="Escreva a legenda do post..."
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PostAgendado["status"])}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          >
            <option value="rascunho">Rascunho</option>
            <option value="agendado">Agendado</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            &quot;Publicado&quot; e &quot;Falhou&quot; serão definidos automaticamente
            quando ligarmos o Post for Me.
          </p>
        </div>

        <button
          type="submit"
          disabled={salvando || !clienteId || !dataHora}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Agendar publicação"}
        </button>
      </form>

      {erro && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Ocorreu um erro: {erro}
        </p>
      )}

      {/* Lista de publicações */}
      <div className="space-y-3">
        <h2 className="font-semibold">
          Publicações programadas{" "}
          <span className="text-sm font-normal text-zinc-500">({posts.length})</span>
        </h2>

        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : posts.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma publicação ainda. Agende a primeira acima. 👆
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {posts.map((post) => (
              <li key={post.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {post.clientes?.nome ?? "—"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CORES[post.status]}`}
                    >
                      {post.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-600">
                      📅 {formatarData(post.data_agendada)}
                    </span>
                    <button
                      onClick={() => excluirPost(post)}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Redes */}
                {post.posts_contas.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                    {post.posts_contas.map((pc, i) =>
                      pc.contas_sociais ? (
                        <span key={i} className="rounded bg-zinc-100 px-2 py-0.5">
                          {REDES[pc.contas_sociais.plataforma]}
                        </span>
                      ) : null,
                    )}
                  </div>
                )}

                {post.legenda && (
                  <p className="text-sm text-zinc-700">{post.legenda}</p>
                )}

                {post.midias && (
                  <p className="text-xs text-zinc-500">
                    {post.midias.tipo === "imagem" ? "🖼️" : "🎬"}{" "}
                    {post.midias.nome_arquivo ?? "mídia anexada"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
