import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";
import { supabaseServer } from "@/lib/supabaseServer";
import { garantirProfileZernio } from "@/lib/zernioProfile";

type ContaZernio = {
  _id?: string;
  id?: string;
  platform?: string;
  username?: string;
  handle?: string;
  name?: string;
  // Na Zernio vem como objeto { _id, name }; aceitamos string também por segurança.
  profileId?: string | { _id?: string };
};

const PLATAFORMAS = ["instagram", "facebook", "tiktok"];

// POST /api/zernio/accounts/sync  { clienteId }
// Lê as contas conectadas na Zernio para aquele cliente e grava o id_externo_zernio
// nas contas_sociais correspondentes (cria a conta se ainda não existir).
export async function POST(req: Request) {
  if (!temChaveZernio()) {
    return NextResponse.json({ ok: false, motivo: "Chave ZERNIO_API_KEY ausente." });
  }
  let body: { clienteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "Body inválido." });
  }
  const { clienteId } = body;
  if (!clienteId) {
    return NextResponse.json({ ok: false, motivo: "Informe clienteId." });
  }

  // Descobre o profile da Zernio deste cliente (para pegar só as contas dele).
  const prof = await garantirProfileZernio(clienteId);
  const profileId = prof.profileId;

  try {
    const resp = await zernioFetch(`/accounts`);
    const corpo = await lerCorpo(resp);
    if (!resp.ok) {
      return NextResponse.json({ ok: false, status: resp.status, corpo });
    }

    // A resposta pode vir como array direto ou dentro de { accounts } / { data }.
    const lista: ContaZernio[] = Array.isArray(corpo)
      ? (corpo as ContaZernio[])
      : (((corpo as Record<string, unknown>)?.accounts as ContaZernio[]) ??
        ((corpo as Record<string, unknown>)?.data as ContaZernio[]) ??
        []);

    let gravadas = 0;
    for (const acc of lista) {
      // Só importa as contas que pertencem ao profile deste cliente.
      const accProfId =
        typeof acc.profileId === "object" ? acc.profileId?._id : acc.profileId;
      if (profileId && accProfId && accProfId !== profileId) continue;

      const plataforma = (acc.platform ?? "").toLowerCase();
      if (!PLATAFORMAS.includes(plataforma)) continue;
      const idZernio = acc._id ?? acc.id;
      if (!idZernio) continue;
      const handle = acc.username ?? acc.handle ?? acc.name ?? null;

      const { data: existentes } = await supabaseServer
        .from("contas_sociais")
        .select("id")
        .eq("cliente_id", clienteId)
        .eq("plataforma", plataforma)
        .limit(1);

      if (existentes && existentes.length > 0) {
        await supabaseServer
          .from("contas_sociais")
          .update({ id_externo_zernio: idZernio, usuario_handle: handle })
          .eq("id", existentes[0].id);
      } else {
        await supabaseServer.from("contas_sociais").insert({
          cliente_id: clienteId,
          plataforma,
          usuario_handle: handle,
          id_externo_zernio: idZernio,
        });
      }
      gravadas++;
    }

    return NextResponse.json({ ok: true, encontradas: lista.length, gravadas });
  } catch (e) {
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
