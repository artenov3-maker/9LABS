"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  id_externo_zernio: string | null;
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

  // Zernio (conexão de contas).
  const [zernioMsg, setZernioMsg] = useState<string | null>(null);
  const [zernioBusy, setZernioBusy] = useState(false);
  const aguardandoRef = useRef(false); // esperando você autorizar na outra aba
  const baselineRef = useRef(0); // quantas contas estavam conectadas antes

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

  // Conta quantas contas deste cliente já estão conectadas à Zernio.
  async function contarConectadas() {
    const { data } = await supabase
      .from("contas_sociais")
      .select("id")
      .eq("cliente_id", clienteId)
      .not("id_externo_zernio", "is", null);
    return data?.length ?? 0;
  }

  // Sincroniza e verifica se entrou uma conta nova. Devolve true se entrou.
  const verificarConexao = useCallback(async (): Promise<boolean> => {
    try {
      await fetch("/api/zernio/accounts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId }),
      });
    } catch {
      /* tenta de novo depois */
    }
    const agora = await contarConectadas();
    if (agora > baselineRef.current) {
      aguardandoRef.current = false;
      setZernioBusy(false);
      setZernioMsg("✓ Conta conectada e salva!");
      await carregarTudo();
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // Detecta automaticamente quando você volta para esta aba após autorizar.
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === "visible" && aguardandoRef.current) {
        verificarConexao();
      }
    }
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [verificarConexao]);

  // Pede o link de autorização da Zernio, abre numa nova aba e começa a detectar.
  async function conectarZernio(plat: ContaSocial["plataforma"]) {
    setZernioBusy(true);
    setZernioMsg(null);
    try {
      const resp = await fetch("/api/zernio/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: clienteId, platform: plat }),
      });
      const dados = await resp.json();
      if (!dados.authUrl) {
        setZernioMsg(`Não veio link. Resposta: ${JSON.stringify(dados)}`);
        setZernioBusy(false);
        return;
      }
      baselineRef.current = await contarConectadas();
      aguardandoRef.current = true;
      window.open(dados.authUrl, "_blank", "noopener");
      setZernioMsg(
        "Abrimos o login numa nova aba. Autorize por lá (no Facebook, escolha a Página) — ao voltar para cá, salvamos sozinho.",
      );
      // Apoio: também fica tentando por uns 2 minutos.
      let tentativas = 0;
      const timer = setInterval(async () => {
        tentativas++;
        if (!aguardandoRef.current) {
          clearInterval(timer);
          return;
        }
        const ok = await verificarConexao();
        if (ok || tentativas >= 30) {
          clearInterval(timer);
          if (!ok) {
            aguardandoRef.current = false;
            setZernioBusy(false);
            setZernioMsg(
              "Se você já autorizou, clique em “Sincronizar agora”.",
            );
          }
        }
      }, 4000);
    } catch (e) {
      setZernioMsg(`Erro: ${(e as Error).message}`);
      setZernioBusy(false);
    }
  }

  // Após autorizar, busca as contas conectadas e grava os IDs.
  async function sincronizarZernio() {
    setZernioBusy(true);
    setZernioMsg(null);
    try {
      const resp = await fetch("/api/zernio/accounts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId }),
      });
      const dados = await resp.json();
      if (dados.ok) {
        setZernioMsg(
          `Sincronizado: ${dados.gravadas ?? 0} conta(s) ligada(s) à Zernio.`,
        );
        await carregarTudo();
      } else {
        setZernioMsg(`Não deu certo: ${dados.motivo ?? JSON.stringify(dados)}`);
      }
    } catch (e) {
      setZernioMsg(`Erro: ${(e as Error).message}`);
    }
    setZernioBusy(false);
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
                  {conta.id_externo_zernio ? (
                    <p className="text-xs text-st-publicado">✓ conectada à Zernio</p>
                  ) : (
                    <p className="text-xs text-muted">não conectada à Zernio</p>
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

        <p className="border-t border-line pt-4 text-xs text-muted">
          As contas aparecem aqui automaticamente quando você conecta uma rede em
          “Publicação real (Zernio)” abaixo.
        </p>
      </section>

      {/* Conectar via Zernio (publicação real) */}
      <section className="space-y-4 rounded-md border border-line bg-surface p-6">
        <div className="micro-label">Publicação real (Zernio)</div>
        <p className="text-sm text-muted">
          Conecte as redes deste cliente à Zernio para poder publicar de verdade. Você
          autoriza numa nova aba e depois clica em “Sincronizar contas”.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["instagram", "facebook", "tiktok"] as const).map((p) => (
            <button
              key={p}
              onClick={() => conectarZernio(p)}
              disabled={zernioBusy}
              className="rounded-sm border border-line px-3 py-2 text-sm hover:border-line-strong disabled:opacity-40"
            >
              Conectar {REDES[p]}
            </button>
          ))}
          <button
            onClick={sincronizarZernio}
            disabled={zernioBusy}
            className="rounded-sm bg-ink px-3 py-2 text-sm font-medium text-surface hover:bg-ink-soft disabled:opacity-40"
          >
            {zernioBusy ? "Detectando..." : "Sincronizar agora"}
          </button>
        </div>
        {zernioMsg && <p className="text-sm text-ink-soft">{zernioMsg}</p>}
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
