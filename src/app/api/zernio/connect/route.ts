import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";

// POST /api/zernio/connect  { clienteId, platform }
// Pede à Zernio um link de autorização (authUrl) para conectar uma conta da rede
// escolhida ao "profile" daquele cliente.
export async function POST(req: Request) {
  if (!temChaveZernio()) {
    return NextResponse.json({ ok: false, motivo: "Chave ZERNIO_API_KEY ausente." });
  }
  let body: { clienteId?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "Body inválido." });
  }
  const { clienteId, platform } = body;
  if (!clienteId || !platform) {
    return NextResponse.json({ ok: false, motivo: "Informe clienteId e platform." });
  }

  try {
    const resp = await zernioFetch(
      `/connect/${platform}?profileId=${encodeURIComponent(clienteId)}`,
    );
    const corpo = await lerCorpo(resp);
    const authUrl =
      typeof corpo === "object" && corpo
        ? ((corpo as Record<string, unknown>).authUrl as string | undefined)
        : undefined;
    return NextResponse.json({ ok: resp.ok, status: resp.status, authUrl, corpo });
  } catch (e) {
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
