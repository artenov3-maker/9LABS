"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { monograma, useClienteAtivo } from "@/context/ClienteAtivo";

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

const REDES: Record<ContaSocial["plataforma"], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export default function ConfiguracoesClientePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = String(params.id);
  const { recarregar, selecionarCliente, clienteAtivoId } = useClienteAtivo();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contas, setContas] = useState<ContaSocial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [plataforma, setPlataforma] =
    useState<ContaSocial["plataforma"]>("instagram");
  const [handle, setHandle] = useState("");
  const [adicionando, setAdicionando] = useState(false);

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

    const { data: dataContas } = await supabase
      .from("contas_sociais")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: true });
    setContas((dataContas as ContaSocial[]) ?? []);
    setCarregando(false);
  }, [clienteId]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

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
      setMensagem("Alterações salvas.");
      await recarregar();
      await carregarTudo();
    }
    setSalvando(false);
  }

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

  async function removerConta(conta: ContaSocial) {
    if (!window.confirm(`Remover a conta de ${REDES[conta.plataforma]}?`)) return;
    setErro(null);
    const { error } = await supabase
      .from("contas_sociais")
      .delete()
      .eq("id", conta.id);
    if (error) setErro(error.message);
    else await carregarTudo();
  }

  async function excluirCliente() {
    if (!cliente) return;
    if (!window.confirm(`Excluir definitivamente o cliente "${cliente.nome}"?`)) return;
    const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
    if (error) {
      setErro(error.message);
      return;
    }
    if (clienteAtivoId === clienteId) selecionarCliente(null);
    await recarregar();
    router.push("/clientes");
  }

  if (carregando) return <p className="text-sm text-muted">Carregando...</p>;

  if (!cliente) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-st-falhou">
          Cliente não encontrado{erro ? `: ${erro}` : "."}
        </p>
        <Link href="/clientes" className="text-sm text-muted hover:text-ink">
          ← Voltar para Clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <Link href="/clientes" className="text-sm text-muted hover:text-ink">
          ← Clientes
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-ink font-display text-xl text-surface">
            {monograma(cliente.nome)}
          </span>
          <h1 className="font-display text-4xl font-light tracking-tight">
            {cliente.nome}
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted">Configurações do cliente</p>
      </header>

      {erro && (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-st-falhou">
          Erro: {erro}
        </p>
      )}

      {/* Dados */}
      <form
        onSubmit={salvarCliente}
        className="space-y-4 rounded-md border border-line bg-surface p-6"
      >
        <div className="micro-label">Dados</div>
        <div>
          <label className="micro-label">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="micro-label">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando || !nome.trim()}
            className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-surface transition hover:bg-ink-soft disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
          {mensagem && <span className="text-sm text-st-publicado">{mensagem}</span>}
        </div>
      </form>

      {/* Contas sociais */}
      <section className="space-y-4 rounded-md border border-line bg-surface p-6">
        <div className="micro-label">Contas sociais ({contas.length})</div>

        {contas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma conta ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {contas.map((conta) => (
              <li key={conta.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{REDES[conta.plataforma]}</p>
                  {conta.usuario_handle && (
                    <p className="text-sm text-muted">{conta.usuario_handle}</p>
                  )}
                </div>
                <button
                  onClick={() => removerConta(conta)}
                  className="text-xs text-muted hover:text-st-falhou hover:underline"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={adicionarConta}
          className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
        >
          <div>
            <label className="micro-label">Rede</label>
            <select
              value={plataforma}
              onChange={(e) =>
                setPlataforma(e.target.value as ContaSocial["plataforma"])
              }
              className="mt-1 rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="micro-label">Usuário / @ (opcional)</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@perfil"
              className="mt-1 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
          <button
            type="submit"
            disabled={adicionando}
            className="rounded-sm border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-line-strong disabled:opacity-40"
          >
            {adicionando ? "Adicionando..." : "Adicionar conta"}
          </button>
        </form>
      </section>

      {/* Zona de perigo */}
      <section className="rounded-md border border-line bg-surface p-6">
        <div className="micro-label">Zona de perigo</div>
        <p className="mt-2 text-sm text-muted">
          Excluir o cliente remove também suas contas sociais e posts. Não dá para
          desfazer.
        </p>
        <button
          onClick={excluirCliente}
          className="mt-3 rounded-sm border border-st-falhou px-4 py-2 text-sm font-medium text-st-falhou transition hover:bg-st-falhou hover:text-surface"
        >
          Excluir cliente
        </button>
      </section>
    </div>
  );
}
