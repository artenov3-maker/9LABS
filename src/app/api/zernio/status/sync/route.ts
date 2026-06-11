import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";
import { supabaseServer } from "@/lib/supabaseServer";

function mapearStatus(s: string | undefined): "publicado" | "falhou" | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (["published", "completed", "success", "posted", "done"].includes(v)) return "publicado";
  if (["failed", "error", "errored"].includes(v)) return "falhou";
  return null; // scheduled/publishing/processing -> mantém "agendado"
}

// POST /api/zernio/status/sync  { clienteId? }
// Para os posts "agendado" que já têm id na Zernio, consulta o estado atual e
// atualiza para "publicado"/"falhou". Usado pelo calendário ao abrir.
export async function POST(req: Request) {
  if (!temChaveZernio()) {
    return NextResponse.json({ ok: false, motivo: "Chave ausente." });
  }
  let body: { clienteId?: string | null };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let query = supabaseServer
    .from("posts_agendados")
    .select("id, id_externo_postforme")
    .eq("status", "agendado")
    .not("id_externo_postforme", "is", null)
    .limit(50);
  if (body.clienteId) query = query.eq("cliente_id", body.clienteId);

  const { data: posts } = await query;
  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, atualizados: 0 });
  }

  let atualizados = 0;
  for (const post of posts) {
    try {
      const resp = await zernioFetch(`/posts/${post.id_externo_postforme}`);
      if (!resp.ok) continue;
      const corpo = (await lerCorpo(resp)) as Record<string, unknown>;
      const obj = (corpo.post ?? corpo) as Record<string, unknown>;
      const novo = mapearStatus(obj.status as string);
      if (novo) {
        await supabaseServer
          .from("posts_agendados")
          .update({ status: novo })
          .eq("id", post.id);
        atualizados++;
      }
    } catch {
      // ignora e segue para o próximo
    }
  }

  return NextResponse.json({ ok: true, atualizados });
}
