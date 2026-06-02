"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = { id: string; nome: string };

type Midia = {
  id: string;
  cliente_id: string | null;
  tipo: "imagem" | "video";
  url_publica: string;
  caminho_storage: string;
  nome_arquivo: string | null;
  created_at: string;
};

const BUCKET = "midias";

// Deixa o nome do arquivo "seguro" para virar caminho no Storage.
function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acentos
    .replace(/[^a-zA-Z0-9._-]/g, "_"); // troca o resto por _
}

export default function MidiasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Formulário de envio.
  const [clienteId, setClienteId] = useState<string>(""); // "" = geral
  const [enviando, setEnviando] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const [copiado, setCopiado] = useState<string | null>(null);

  async function carregarTudo() {
    setCarregando(true);
    setErro(null);

    const { data: dataClientes } = await supabase
      .from("clientes")
      .select("id, nome")
      .order("nome", { ascending: true });
    setClientes(dataClientes ?? []);

    const { data: dataMidias, error } = await supabase
      .from("midias")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setErro(error.message);
    else setMidias(dataMidias ?? []);

    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // Envia o arquivo para o Storage e registra na tabela "midias".
  async function enviarArquivo(evento: React.FormEvent) {
    evento.preventDefault();
    const arquivo = inputArquivoRef.current?.files?.[0];
    if (!arquivo) {
      setErro("Escolha um arquivo primeiro.");
      return;
    }

    // Descobre se é imagem ou vídeo.
    const ehImagem = arquivo.type.startsWith("image/");
    const ehVideo = arquivo.type.startsWith("video/");
    if (!ehImagem && !ehVideo) {
      setErro("Só são aceitas imagens ou vídeos.");
      return;
    }

    setEnviando(true);
    setErro(null);

    // Caminho único dentro do bucket (evita sobrescrever arquivos).
    const caminho = `${clienteId || "geral"}/${Date.now()}-${nomeSeguro(arquivo.name)}`;

    // 1) Envia o arquivo para o Storage.
    const { error: erroUpload } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, arquivo);

    if (erroUpload) {
      setErro(`Falha ao enviar: ${erroUpload.message}`);
      setEnviando(false);
      return;
    }

    // 2) Pega o link público do arquivo.
    const { data: dataUrl } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

    // 3) Registra na tabela "midias".
    const { error: erroInsert } = await supabase.from("midias").insert({
      cliente_id: clienteId || null,
      tipo: ehImagem ? "imagem" : "video",
      url_publica: dataUrl.publicUrl,
      caminho_storage: caminho,
      nome_arquivo: arquivo.name,
    });

    if (erroInsert) setErro(`Enviado, mas falhou ao registrar: ${erroInsert.message}`);
    else {
      if (inputArquivoRef.current) inputArquivoRef.current.value = "";
      await carregarTudo();
    }
    setEnviando(false);
  }

  // Exclui a mídia (do Storage e da tabela).
  async function excluirMidia(midia: Midia) {
    const ok = window.confirm(`Excluir "${midia.nome_arquivo ?? "mídia"}"?`);
    if (!ok) return;

    setErro(null);
    await supabase.storage.from(BUCKET).remove([midia.caminho_storage]);
    const { error } = await supabase.from("midias").delete().eq("id", midia.id);
    if (error) setErro(error.message);
    else await carregarTudo();
  }

  async function copiarLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiado(url);
    setTimeout(() => setCopiado(null), 1500);
  }

  function nomeCliente(id: string | null) {
    if (!id) return "Geral";
    return clientes.find((c) => c.id === id)?.nome ?? "—";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca de Mídia</h1>
        <p className="mt-1 text-zinc-600">
          Envie fotos e vídeos. Cada arquivo ganha um link público para usar nos posts.
        </p>
      </div>

      {/* Formulário de envio */}
      <form
        onSubmit={enviarArquivo}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Cliente (opcional)
          </label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          >
            <option value="">Geral (sem cliente)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm font-medium text-zinc-700">
            Arquivo (imagem ou vídeo)
          </label>
          <input
            ref={inputArquivoRef}
            type="file"
            accept="image/*,video/*"
            className="mt-1 w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-red-700"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar"}
        </button>
      </form>

      {erro && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Ocorreu um erro: {erro}
        </p>
      )}

      {/* Galeria */}
      <div className="space-y-3">
        <h2 className="font-semibold">
          Mídias enviadas{" "}
          <span className="text-sm font-normal text-zinc-500">({midias.length})</span>
        </h2>

        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : midias.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma mídia ainda. Envie a primeira acima. 👆
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {midias.map((midia) => (
              <div
                key={midia.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
              >
                {/* Pré-visualização */}
                <div className="flex aspect-video items-center justify-center bg-zinc-100">
                  {midia.tipo === "imagem" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={midia.url_publica}
                      alt={midia.nome_arquivo ?? "imagem"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={midia.url_publica}
                      controls
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                {/* Infos e ações */}
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium" title={midia.nome_arquivo ?? ""}>
                    {midia.nome_arquivo ?? "(sem nome)"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {midia.tipo === "imagem" ? "🖼️ Imagem" : "🎬 Vídeo"} ·{" "}
                    {nomeCliente(midia.cliente_id)}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => copiarLink(midia.url_publica)}
                      className="text-xs text-zinc-700 hover:text-black hover:underline"
                    >
                      {copiado === midia.url_publica ? "Copiado! ✅" : "Copiar link"}
                    </button>
                    <a
                      href={midia.url_publica}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-700 hover:text-black hover:underline"
                    >
                      Abrir
                    </a>
                    <button
                      onClick={() => excluirMidia(midia)}
                      className="ml-auto text-xs text-red-600 hover:text-red-800 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
