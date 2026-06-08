import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";

// GET /api/zernio/ping
// Valida se a chave da Zernio está configurada e funcionando.
export async function GET() {
  if (!temChaveZernio()) {
    return NextResponse.json({
      ok: false,
      motivo: "Chave ZERNIO_API_KEY ausente no .env.local",
    });
  }
  try {
    const resp = await zernioFetch("/accounts");
    const corpo = await lerCorpo(resp);
    return NextResponse.json({ ok: resp.ok, status: resp.status, corpo });
  } catch (e) {
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
