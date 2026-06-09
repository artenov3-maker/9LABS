import { NextResponse } from "next/server";
import { lerCorpo, temChaveZernio, zernioFetch } from "@/lib/zernio";
import { supabaseServer } from "@/lib/supabaseServer";

// Traduz os erros mais comuns da Zernio para uma frase clara em português.
function amigavel(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("media") && (m.includes("require") || m.includes("content"))) {
    return "Este post precisa de uma imagem ou vídeo. Adicione uma mídia antes de publicar.";
  }
  if (
    m.includes("aspect") ||
    m.includes("ratio") ||
    m.includes("resolution") ||
    m.includes("dimension") ||
    m.includes("width") ||
    m.includes("height")
  ) {
    return "A imagem está fora do tamanho aceito pelo Instagram. Use uma proporção entre 4:5 (vertical) e 1.91:1 (horizontal) — ex.: 1080×1350 ou 1080×1080.";
  }
  return msg;
}

// Converte um instante (ISO/UTC) para a "hora de parede" em São Paulo,
// no formato que a Zernio espera: "YYYY-MM-DDTHH:mm:ss" + timezone à parte.
function paraLocalSaoPaulo(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return fmt.format(d).replace(" ", "T");
}

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
      "id, legenda, data_agendada, midias(url_publica, tipo), posts_contas(contas_sociais(plataforma, id_externo_zernio))",
    )
    .eq("id", postId)
    .single();

  if (error || !post) {
    return NextResponse.json({ ok: false, motivo: error?.message ?? "Post não encontrado." });
  }

  const p = post as unknown as {
    legenda: string | null;
    data_agendada: string;
    midias: { url_publica: string; tipo: string } | null;
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

  // Sempre AGENDA no horário escolhido (hora local + timezone, como a Zernio espera).
  const payload: Record<string, unknown> = {
    content: p.legenda ?? "",
    scheduledFor: paraLocalSaoPaulo(p.data_agendada),
    timezone: "America/Sao_Paulo",
    platforms,
  };
  if (p.midias?.url_publica) {
    payload.mediaItems = [
      { url: p.midias.url_publica, type: p.midias.tipo === "video" ? "video" : "image" },
    ];
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
      // Extrai uma frase legível do erro da Zernio (sem JSON cru).
      const bruto =
        (typeof corpo === "object" && corpo
          ? ((corpo as Record<string, unknown>).error as string) ??
            ((corpo as Record<string, unknown>).message as string)
          : String(corpo)) ?? "Falha ao publicar.";
      const motivo = amigavel(bruto);
      await supabaseServer
        .from("posts_agendados")
        .update({ status: "falhou", erro_mensagem: motivo.slice(0, 500) })
        .eq("id", postId);
      return NextResponse.json({ ok: false, status: resp.status, motivo, corpo });
    }
  } catch (e) {
    await supabaseServer
      .from("posts_agendados")
      .update({ status: "falhou", erro_mensagem: (e as Error).message })
      .eq("id", postId);
    return NextResponse.json({ ok: false, motivo: (e as Error).message });
  }
}
