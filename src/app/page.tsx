import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel de Agendamento</h1>
        <p className="mt-1 text-zinc-600">
          Bem-vindo ao painel interno da 9LABS. Escolha por onde começar:
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Atalho que já funciona */}
        <Link
          href="/clientes"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:shadow-md"
        >
          <h2 className="font-semibold">👥 Clientes</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Cadastre os clientes da agência e suas contas sociais.
          </p>
        </Link>

        {/* Atalho que já funciona */}
        <Link
          href="/midias"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:shadow-md"
        >
          <h2 className="font-semibold">🖼️ Biblioteca de Mídia</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Envie fotos e vídeos e gere links públicos.
          </p>
        </Link>

        {/* Atalho que já funciona */}
        <Link
          href="/calendario"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:shadow-md"
        >
          <h2 className="font-semibold">📅 Calendário</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Programe publicações por cliente, redes, mídia e data.
          </p>
        </Link>

        {/* Atalhos das próximas fases (ainda desativados) */}
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-5 text-zinc-400">
          <h2 className="font-semibold">📊 Relatório</h2>
          <p className="mt-1 text-sm">Em breve (Fase 4).</p>
        </div>
      </div>
    </div>
  );
}
