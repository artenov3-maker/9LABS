import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";

// POST /api/zernio/accounts/disconnect  { accountId }
// Desconecta (remove) a conta na Zernio. Usado quando o usuário remove a conta no painel.
export async function POST(req: Request) {
  if (!temChaveZernio()) {
    return NextResponse.json({ ok: false, motivo: "Chave ZERNIO_API_KEY ausente." });
  }
  let body: { accountId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "Body inválido." });
  }
  const { accountId } = body;
  if (!accountId) {
    return NextResponse.json({ ok: false, motivo: "Informe accountId." });
  }

  try {
    const resp = await zernioFetch(`/accounts/${accountId}`, { method: "DELETE" });
    const corpo = await lerCorpo(resp);
    // 404 (já não existe) tratamos como sucesso — o objetivo é que suma da Zernio.
    if (resp.ok || resp.status === 404) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, status: resp.status, corpo });
  } catch (e) {
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
