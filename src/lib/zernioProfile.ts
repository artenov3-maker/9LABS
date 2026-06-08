// Garante que um cliente tenha um "profile" na Zernio (agrupa as contas dele).
// Se ainda não tiver, cria um na Zernio e guarda o _id em clientes.id_externo_zernio.
// Só roda no servidor.

import { lerCorpo, zernioFetch } from "./zernio";
import { supabaseServer } from "./supabaseServer";

export async function garantirProfileZernio(
  clienteId: string,
): Promise<{ ok: boolean; profileId?: string; motivo?: string }> {
  const { data: cliente, error } = await supabaseServer
    .from("clientes")
    .select("id, nome, id_externo_zernio")
    .eq("id", clienteId)
    .single();

  if (error || !cliente) {
    return { ok: false, motivo: error?.message ?? "Cliente não encontrado." };
  }
  if (cliente.id_externo_zernio) {
    return { ok: true, profileId: cliente.id_externo_zernio as string };
  }

  // Cria o profile na Zernio com o nome do cliente.
  const resp = await zernioFetch("/profiles", {
    method: "POST",
    body: JSON.stringify({ name: cliente.nome }),
  });
  const corpo = await lerCorpo(resp);
  if (!resp.ok) {
    return {
      ok: false,
      motivo:
        typeof corpo === "object" ? JSON.stringify(corpo) : String(corpo),
    };
  }
  const obj = corpo as Record<string, unknown>;
  const profile = obj.profile as Record<string, unknown> | undefined;
  const profileId = (profile?._id as string) ?? (obj._id as string);
  if (!profileId) {
    return { ok: false, motivo: "Profile criado, mas sem _id na resposta." };
  }

  await supabaseServer
    .from("clientes")
    .update({ id_externo_zernio: profileId })
    .eq("id", clienteId);

  return { ok: true, profileId };
}
