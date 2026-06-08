// Ajudante para falar com a API da Zernio.
// IMPORTANTE: este arquivo só roda no SERVIDOR (rotas /api/*). A chave é secreta
// (ZERNIO_API_KEY, sem NEXT_PUBLIC) e nunca vai para o navegador.

const BASE = "https://zernio.com/api/v1";

export function temChaveZernio() {
  return Boolean(process.env.ZERNIO_API_KEY);
}

// Faz uma chamada autenticada à Zernio. Devolve a resposta (fetch Response).
export async function zernioFetch(caminho: string, init: RequestInit = {}) {
  const chave = process.env.ZERNIO_API_KEY;
  if (!chave) {
    throw new Error("ZERNIO_API_KEY não configurada no .env.local");
  }
  return fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

// Lê o corpo como JSON quando possível (senão devolve texto cru).
export async function lerCorpo(resp: Response): Promise<unknown> {
  const texto = await resp.text();
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}
