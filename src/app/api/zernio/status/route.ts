import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";
import { supabaseServer } from "@/lib/supabaseServer";

function mapearStatus(s: string | undefined): "publicado" | "falhou" | "agendado" | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (["published", "completed", "success", "posted", "done"].includes(v)) return "publicado";
  if (["failed", "error", "errored"].includes(v)) return "falhou";
  if (["scheduled", "pending", "queued", "processing"].includes(v)) return "agendado";
  return null;
}

// POST /api/zernio/status  { postId }
// Consulta a Zernio o estado atual do post e atualiza o nosso banco (alternativa ao webhook em localhost).
export async function POST(req: Request) {
  if (!temChaveZernio()) {
    return NextResponse.json({ ok: false, motivo: "Chave ZERNIO_API_KEY ausente." });
  }
  let body: { postId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "Body inválido." });
  }
  const { postId } = body;
  if (!postId) return NextResponse.json({ ok: false, motivo: "Informe postId." });

  const { data: post } = await supabaseServer
    .from("posts_agendados")
    .select("id, id_externo_postforme")
    .eq("id", postId)
    .single();

  const idExterno = post?.id_externo_postforme;
  if (!idExterno) {
    return NextResponse.json({
      ok: false,
      motivo: "Este post ainda não foi enviado à Zernio.",
    });
  }

  try {
    const resp = await zernioFetch(`/posts/${idExterno}`);
    const corpo = await lerCorpo(resp);
    const statusZernio =
      typeof corpo === "object" && corpo
        ? ((corpo as Record<string, unknown>).status as string) ??
          (((corpo as Record<string, unknown>).post as Record<string, unknown>)?.status as string)
        : undefined;
    const novo = mapearStatus(statusZernio);
    if (novo) {
      await supabaseServer
        .from("posts_agendados")
        .update({ status: novo })
        .eq("id", postId);
    }
    return NextResponse.json({ ok: resp.ok, statusZernio, novo, corpo });
  } catch (e) {
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
