"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

export type Cliente = {
  id: string;
  nome: string;
  observacoes: string | null;
  ativo: boolean;
};

type ContextoCliente = {
  clientes: Cliente[];
  clienteAtivoId: string | null;
  clienteAtivo: Cliente | null;
  selecionarCliente: (id: string | null) => void;
  recarregar: () => Promise<void>;
  carregando: boolean;
};

const ClienteAtivoContext = createContext<ContextoCliente | null>(null);
const CHAVE = "9labs:clienteAtivoId";

export function ClienteAtivoProvider({ children }: { children: React.ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteAtivoId, setClienteAtivoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome, observacoes, ativo")
      .order("nome", { ascending: true });
    setClientes(data ?? []);
    setCarregando(false);
  }, []);

  // Ao abrir o app: lê o cliente salvo e carrega a lista.
  useEffect(() => {
    const salvo =
      typeof window !== "undefined" ? localStorage.getItem(CHAVE) : null;
    if (salvo) setClienteAtivoId(salvo);
    recarregar();
  }, [recarregar]);

  function selecionarCliente(id: string | null) {
    setClienteAtivoId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(CHAVE, id);
      else localStorage.removeItem(CHAVE);
    }
  }

  const clienteAtivo = clientes.find((c) => c.id === clienteAtivoId) ?? null;

  return (
    <ClienteAtivoContext.Provider
      value={{
        clientes,
        clienteAtivoId,
        clienteAtivo,
        selecionarCliente,
        recarregar,
        carregando,
      }}
    >
      {children}
    </ClienteAtivoContext.Provider>
  );
}

export function useClienteAtivo() {
  const ctx = useContext(ClienteAtivoContext);
  if (!ctx) {
    throw new Error("useClienteAtivo precisa estar dentro do ClienteAtivoProvider");
  }
  return ctx;
}

// Monograma: primeira letra do nome (para os quadradinhos da marca).
export function monograma(nome: string) {
  return (nome.trim()[0] ?? "?").toUpperCase();
}
