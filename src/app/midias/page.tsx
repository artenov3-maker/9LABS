"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useClienteAtivo } from "@/context/ClienteAtivo";

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

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function MidiasPage() {
  const { clienteAtivo, carregando: carregandoCtx } = useClienteAtivo();
  const [midias, setMidias] = useState<Midia[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    if (!clienteAtivo) {
      setMidias([]);
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase
      .from("midias")
      .select("*")
      .or(`cliente_id.eq.${clienteAtivo.id},cliente_id.is.null`)
      .order("created_at", { ascending: false });
    if (error) setErro(error.message);
    else setMidias((data as Midia[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteAtivo]);

  async function enviar(arquivo: File) {
    if (!clienteAtivo) return;
    const ehImagem = arquivo.type.startsWith("image/");
    const ehVideo = arquivo.type.startsWith("video/");
    if (!ehImagem && !ehVideo) {
      setErro("Só imagens ou vídeos.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const caminho = `${clienteAtivo.id}/${Date.now()}-${nomeSeguro(arquivo.name)}`;
    const { error: erroUp } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
    if (erroUp) {
      setErro(`Falha no upload: ${erroUp.message}`);
      setEnviando(false);
      return;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
    const { error: erroIns } = await supabase.from("midias").insert({
      cliente_id: clienteAtivo.id,
      tipo: ehImagem ? "imagem" : "video",
      url_publica: pub.publicUrl,
      caminho_storage: caminho,
      nome_arquivo: arquivo.name,
    });
    if (erroIns) setErro(erroIns.message);
    else await carregar();
    setEnviando(false);
  }

  async function excluir(m: Midia) {
    if (!window.confirm(`Excluir "${m.nome_arquivo ?? "mídia"}"?`)) return;
    await supabase.storage.from(BUCKET).remove([m.caminho_storage]);
    const { error } = await supabase.from("midias").delete().eq("id", m.id);
    if (error) setErro(error.message);
    else await carregar();
  }

  async function copiar(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiado(url);
    setTimeout(() => setCopiado(null), 1500);
  }

  if (!carregandoCtx && !clienteAtivo) {
    return (
      <div className="rounded-md border border-dashed border-line bg-surface px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-light">Mídia</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Escolha um cliente para ver e enviar mídias.
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
          <div className="micro-label">Mídia</div>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight">
            {clienteAtivo?.nome}
          </h1>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft disabled:opacity-40"
        >
          {enviando ? "Enviando..." : "+ Enviar arquivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar(f);
            e.target.value = "";
          }}
        />
      </header>

      {erro && <p className="text-sm text-st-falhou">Erro: {erro}</p>}

      {carregando ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : midias.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-16 text-center text-sm text-muted">
          Nenhuma mídia ainda. Envie a primeira no botão acima.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {midias.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden rounded-md border border-line bg-surface"
            >
              <div className="aspect-square bg-paper">
                {m.tipo === "imagem" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url_publica}
                    alt={m.nome_arquivo ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video src={m.url_publica} controls className="h-full w-full object-cover" />
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-sm" title={m.nome_arquivo ?? ""}>
                  {m.nome_arquivo ?? "(sem nome)"}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={() => copiar(m.url_publica)}
                    className="text-ink-soft hover:text-ink hover:underline"
                  >
                    {copiado === m.url_publica ? "Copiado!" : "Copiar link"}
                  </button>
                  <a
                    href={m.url_publica}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft hover:text-ink hover:underline"
                  >
                    Abrir
                  </a>
                  <button
                    onClick={() => excluir(m)}
                    className="ml-auto text-muted hover:text-st-falhou hover:underline"
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
  );
}
