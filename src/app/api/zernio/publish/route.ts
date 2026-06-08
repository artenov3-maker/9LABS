import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";
import { supabaseServer } from "@/lib/supabaseServer";

// POST /api/zernio/publish  { postId }
// Envia o post à Zernio para publicar/agendar nas contas conectadas.
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
  if (!postId) {
    return NextResponse.json({ ok: false, motivo: "Informe postId." });
  }

  // Carrega o post com mídia e contas (com o id da Zernio).
  const { data: post, error } = await supabaseServer
    .from("posts_agendados")
    .select(
      "id, legenda, data_agendada, midias(url_publica), posts_contas(contas_sociais(plataforma, id_externo_zernio))",
    )
    .eq("id", postId)
    .single();

  if (error || !post) {
    return NextResponse.json({ ok: false, motivo: error?.message ?? "Post não encontrado." });
  }

  const p = post as unknown as {
    legenda: string | null;
    data_agendada: string;
    midias: { url_publica: string } | null;
    posts_contas: {
      contas_sociais: { plataforma: string; id_externo_zernio: string | null } | null;
    }[];
  };

  // Monta a lista de contas conectadas à Zernio.
  const platforms = p.posts_contas
    .map((pc) => pc.contas_sociais)
    .filter((c): c is { plataforma: string; id_externo_zernio: string } =>
      Boolean(c && c.id_externo_zernio),
    )
    .map((c) => ({ platform: c.plataforma, accountId: c.id_externo_zernio }));

  if (platforms.length === 0) {
    return NextResponse.json({
      ok: false,
      motivo:
        "Nenhuma conta deste post está conectada à Zernio. Conecte as contas na página do cliente.",
    });
  }

  const payload: Record<string, unknown> = {
    content: p.legenda ?? "",
    scheduledFor: p.data_agendada,
    timezone: "America/Sao_Paulo",
    platforms,
  };
  if (p.midias?.url_publica) {
    payload.media = [{ url: p.midias.url_publica }];
  }

  try {
    const resp = await zernioFetch("/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const corpo = await lerCorpo(resp);

    if (resp.ok) {
      const idExterno =
        typeof corpo === "object" && corpo
          ? ((corpo as Record<string, unknown>)._id as string | undefined) ??
            (((corpo as Record<string, unknown>).post as Record<string, unknown>)?._id as
              | string
              | undefined)
          : undefined;
      await supabaseServer
        .from("posts_agendados")
        .update({
          status: "agendado",
          id_externo_postforme: idExterno ?? null,
          erro_mensagem: null,
        })
        .eq("id", postId);
      return NextResponse.json({ ok: true, idExterno, corpo });
    } else {
      const msg =
        typeof corpo === "object" && corpo
          ? JSON.stringify(corpo)
          : String(corpo);
      await supabaseServer
        .from("posts_agendados")
        .update({ status: "falhou", erro_mensagem: msg.slice(0, 500) })
        .eq("id", postId);
      return NextResponse.json({ ok: false, status: resp.status, corpo });
    }
  } catch (e) {
    await supabaseServer
      .from("posts_agendados")
      .update({ status: "falhou", erro_mensagem: (e as Error).message })
      .eq("id", postId);
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
