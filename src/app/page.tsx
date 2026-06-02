import Link from "next/link";

const ATALHOS = [
  {
    href: "/clientes",
    emoji: "👥",
    titulo: "Clientes",
    descricao:
      "Cadastre os clientes da agência. Dentro de cada um: contas, mídias e publicações.",
  },
  {
    href: "/calendario",
    emoji: "📅",
    titulo: "Calendário geral",
    descricao: "Veja e programe publicações de todos os clientes no calendário.",
  },
  {
    href: "/relatorio",
    emoji: "📊",
    titulo: "Relatório geral",
    descricao: "Acompanhe as publicações por status e por cliente.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel de Agendamento</h1>
        <p className="mt-1 text-zinc-600">
          Bem-vindo ao painel interno da 9LABS. Escolha por onde começar:
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ATALHOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-red-300 hover:shadow-md"
          >
            <h2 className="font-semibold">
              <span className="mr-1">{a.emoji}</span>
              <span className="group-hover:text-red-700">{a.titulo}</span>
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{a.descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
