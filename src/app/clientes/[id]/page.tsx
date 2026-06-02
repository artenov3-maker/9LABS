"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: string;
  nome: string;
  observacoes: string | null;
  ativo: boolean;
};

type ContaSocial = {
  id: string;
  cliente_id: string;
  plataforma: "instagram" | "facebook" | "tiktok";
  usuario_handle: string | null;
  created_at: string;
};

// Nomes bonitos e emoji para cada rede.
const REDES: Record<ContaSocial["plataforma"], string> = {
  instagram: "📸 Instagram",
  facebook: "👍 Facebook",
  tiktok: "🎵 TikTok",
};

export default function ClienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = String(params.id);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contas, setContas] = useState<ContaSocial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Campos de edição do cliente.
  const [nome, setNome] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Campos do formulário de nova conta social.
  const [plataforma, setPlataforma] =
    useState<ContaSocial["plataforma"]>("instagram");
  const [handle, setHandle] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  // Carrega o cliente e suas contas sociais.
  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const { data: dataCliente, error: erroCliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (erroCliente) {
      setErro(erroCliente.message);
      setCarregando(false);
      return;
    }

    setCliente(dataCliente);
    setNome(dataCliente.nome);
    setObservacoes(dataCliente.observacoes ?? "");

    const { data: dataContas, error: erroContas } = await supabase
      .from("contas_sociais")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: true });

    if (erroContas) setErro(erroContas.message);
    else setContas(dataContas ?? []);

    setCarregando(false);
  }, [clienteId]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  // Salva as edições do cliente.
  async function salvarCliente(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return;

    setSalvando(true);
    setErro(null);
    setMensagem(null);
    const { error } = await supabase
      .from("clientes")
      .update({ nome: nome.trim(), observacoes: observacoes.trim() || null })
      .eq("id", clienteId);

    if (error) setErro(error.message);
    else {
      setMensagem("Alterações salvas! ✅");
      await carregarTudo();
    }
    setSalvando(false);
  }

  // Adiciona uma conta social ao cliente.
  async function adicionarConta(evento: React.FormEvent) {
    evento.preventDefault();
    setAdicionando(true);
    setErro(null);
    const { error } = await supabase.from("contas_sociais").insert({
      cliente_id: clienteId,
      plataforma,
      usuario_handle: handle.trim() || null,
    });

    if (error) setErro(error.message);
    else {
      setHandle("");
      await carregarTudo();
    }
    setAdicionando(false);
  }

  // Remove uma conta social.
  async function removerConta(conta: ContaSocial) {
    const ok = window.confirm(
      `Remover a conta de ${REDES[conta.plataforma]}${
        conta.usuario_handle ? ` (${conta.usuario_handle})` : ""
      }?`,
    );
    if (!ok) return;

    setErro(null);
    const { error } = await supabase
      .from("contas_sociais")
      .delete()
      .eq("id", conta.id);
    if (error) setErro(error.message);
    else await carregarTudo();
  }

  if (carregando) {
    return <p className="text-sm text-zinc-500">Carregando...</p>;
  }

  if (!cliente) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Cliente não encontrado{erro ? `: ${erro}` : "."}
        </p>
        <Link href="/clientes" className="text-sm text-zinc-700 hover:underline">
          ← Voltar para Clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/clientes" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{cliente.nome}</h1>
      </div>

      {erro && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Ocorreu um erro: {erro}
        </p>
      )}

      {/* Editar dados do cliente */}
      <form
        onSubmit={salvarCliente}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <h2 className="font-semibold">Dados do cliente</h2>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Observações
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando || !nome.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
          {mensagem && <span className="text-sm text-green-700">{mensagem}</span>}
        </div>
      </form>

      {/* Contas sociais */}
      <div className="space-y-4">
        <h2 className="font-semibold">
          Contas sociais{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({contas.length})
          </span>
        </h2>

        {/* Lista de contas */}
        {contas.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma conta ainda. Adicione abaixo. 👇
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {contas.map((conta) => (
              <li
                key={conta.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium">{REDES[conta.plataforma]}</p>
                  {conta.usuario_handle && (
                    <p className="text-sm text-zinc-600">{conta.usuario_handle}</p>
                  )}
                </div>
                <button
                  onClick={() => removerConta(conta)}
                  className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Formulário de nova conta */}
        <form
          onSubmit={adicionarConta}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-5"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700">Rede</label>
            <select
              value={plataforma}
              onChange={(e) =>
                setPlataforma(e.target.value as ContaSocial["plataforma"])
              }
              className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            >
              <option value="instagram">📸 Instagram</option>
              <option value="facebook">👍 Facebook</option>
              <option value="tiktok">🎵 TikTok</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700">
              Usuário / @ (opcional)
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Ex.: @padariadojoao"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={adicionando}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adicionando ? "Adicionando..." : "Adicionar conta"}
          </button>
        </form>
      </div>

      {/* Excluir cliente */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="font-semibold text-red-800">Zona de perigo</h2>
        <p className="mt-1 text-sm text-red-700">
          Excluir o cliente remove também suas contas sociais e posts. Não dá para
          desfazer.
        </p>
        <button
          onClick={async () => {
            const ok = window.confirm(
              `Excluir definitivamente o cliente "${cliente.nome}"?`,
            );
            if (!ok) return;
            const { error } = await supabase
              .from("clientes")
              .delete()
              .eq("id", clienteId);
            if (error) setErro(error.message);
            else router.push("/clientes");
          }}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Excluir cliente
        </button>
      </div>
    </div>
  );
}
