import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";

// POST /api/zernio/upload-url  { filename, contentType }
// Pede à Zernio um link temporário (uploadUrl) para enviar o arquivo direto
// para o storage dela, e devolve também a publicUrl (usada no post).
// Assim arquivos grandes (vídeos de Reels) não esbarram no limite do Supabase.
export async function POST(req: Request) {
  if (!temChaveZernio()) {
    return NextResponse.json({ ok: false, motivo: "Chave ZERNIO_API_KEY ausente." });
  }
  let body: { filename?: string; contentType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "Body inválido." });
  }
  const { filename, contentType } = body;
  if (!filename || !contentType) {
    return NextResponse.json({ ok: false, motivo: "Informe filename e contentType." });
  }

  try {
    const resp = await zernioFetch("/media/presign", {
      method: "POST",
      body: JSON.stringify({ filename, contentType }),
    });
    const corpo = (await lerCorpo(resp)) as Record<string, unknown>;
    if (!resp.ok) {
      return NextResponse.json({ ok: false, status: resp.status, corpo });
    }
    return NextResponse.json({
      ok: true,
      uploadUrl: corpo.uploadUrl,
      publicUrl: corpo.publicUrl,
      key: corpo.key,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
