import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Mapeia o status que vem da Zernio para o nosso.
function mapearStatus(s: string | undefined): "publicado" | "falhou" | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (["published", "completed", "success", "posted", "done"].includes(v)) return "publicado";
  if (["failed", "error", "errored"].includes(v)) return "falhou";
  return null;
}

// POST /api/zernio/webhook
// Recebe eventos da Zernio (quando o post é publicado ou falha) e atualiza o nosso banco.
// Obs.: webhooks só chegam em produção (URL pública); em localhost use o botão "Atualizar status".
export async function POST(req: Request) {
  let evento: Record<string, unknown>;
  try {
    evento = await req.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "Body inválido." });
  }

  // Tenta achar o id do post da Zernio em vários formatos possíveis.
  const dados = (evento.data ?? evento.post ?? evento) as Record<string, unknown>;
  const idExterno =
    (dados._id as string) ?? (dados.id as string) ?? (dados.postId as string);
  const statusZernio =
    (dados.status as string) ?? (evento.status as string) ?? (evento.type as string);
  const erro = (dados.error as string) ?? (dados.errorMessage as string) ?? null;

  if (!idExterno) {
    return NextResponse.json({ ok: false, motivo: "Sem id do post no evento." });
  }

  const novo = mapearStatus(statusZernio);
  const update: Record<string, unknown> = {};
  if (novo) update.status = novo;
  if (novo === "falhou" && erro) update.erro_mensagem = String(erro).slice(0, 500);
  if (novo === "publicado") update.erro_mensagem = null;

  if (Object.keys(update).length > 0) {
    await supabaseServer
      .from("posts_agendados")
      .update(update)
      .eq("id_externo_postforme", idExterno);
  }

  return NextResponse.json({ ok: true, aplicado: update });
}
