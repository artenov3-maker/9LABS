"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "rascunho" | "agendado" | "publicado" | "falhou";

export type PostCal = {
  id: string;
  data_agendada: string;
  status: Status;
  legenda: string | null;
  clientes: { nome: string } | null;
  redes: string[]; // siglas: IG, f, TT
};

const COR_STATUS: Record<Status, string> = {
  rascunho: "var(--color-st-rascunho)",
  agendado: "var(--color-st-agendado)",
  publicado: "var(--color-st-publicado)",
  falhou: "var(--color-st-falhou)",
};
const ROTULO_STATUS: Record<Status, string> = {
  rascunho: "Rascunho",
  agendado: "Agendado",
  publicado: "Publicado",
  falhou: "Falhou",
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function mesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarioMensal({
  posts,
  onExcluir,
  onDuplicar,
}: {
  posts: PostCal[];
  onExcluir?: (postId: string) => void;
  onDuplicar?: (postId: string) => void;
}) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [diaAberto, setDiaAberto] = useState<number | null>(null);

  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const deslocamento = new Date(ano, mes, 1).getDay();

  const celulas: (number | null)[] = [];
  for (let i = 0; i < deslocamento; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);

  function postsDoDia(dia: number) {
    const alvo = new Date(ano, mes, dia);
    return posts
      .filter((p) => mesmoDia(new Date(p.data_agendada), alvo))
      .sort(
        (a, b) =>
          new Date(a.data_agendada).getTime() - new Date(b.data_agendada).getTime(),
      );
  }

  function mesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno(ano - 1);
    } else setMes(mes - 1);
  }
  function mesProximo() {
    if (mes === 11) {
      setMes(0);
      setAno(ano + 1);
    } else setMes(mes + 1);
  }

  const postsAbertos = diaAberto ? postsDoDia(diaAberto) : [];

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      {/* Cabeçalho */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-light">
          {MESES[mes]} {ano}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={mesAnterior}
            className="rounded-sm border border-line px-2.5 py-1 text-sm hover:border-line-strong"
          >
            ‹
          </button>
          <button
            onClick={() => {
              setAno(hoje.getFullYear());
              setMes(hoje.getMonth());
            }}
            className="rounded-sm border border-line px-3 py-1 text-sm hover:border-line-strong"
          >
            Hoje
          </button>
          <button
            onClick={mesProximo}
            className="rounded-sm border border-line px-2.5 py-1 text-sm hover:border-line-strong"
          >
            ›
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-px border-b border-line pb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="micro-label py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-px">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`v-${i}`} className="min-h-24" />;
          const doDia = postsDoDia(dia);
          const ehHoje = mesmoDia(new Date(ano, mes, dia), hoje);
          return (
            <button
              key={dia}
              onClick={() => doDia.length > 0 && setDiaAberto(dia)}
              className={`min-h-24 border-b border-r border-line p-1.5 text-left transition ${
                doDia.length > 0 ? "hover:bg-paper" : "cursor-default"
              }`}
            >
              <div
                className={`font-display text-sm ${ehHoje ? "text-ink underline" : "text-muted"}`}
              >
                {dia}
              </div>
              <div className="mt-1 space-y-1">
                {doDia.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-1 text-[11px]">
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COR_STATUS[p.status] }}
                    />
                    <span className="text-ink-soft">{hhmm(p.data_agendada)}</span>
                    <span className="text-muted">{p.redes[0] ?? ""}</span>
                  </div>
                ))}
                {doDia.length > 3 && (
                  <div className="text-[11px] text-muted">+{doDia.length - 3} mais</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Janela do dia */}
      {diaAberto && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/30 p-4 animate-fade-in"
          onClick={() => setDiaAberto(null)}
        >
          <div
            className="w-full max-w-md rounded-md border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-light">
                {diaAberto} de {MESES[mes]}
              </h3>
              <button
                onClick={() => setDiaAberto(null)}
                className="text-sm text-muted hover:text-ink"
              >
                Fechar ✕
              </button>
            </div>
            <ul className="space-y-2">
              {postsAbertos.map((p) => (
                <li
                  key={p.id}
                  className="rounded-sm border border-line p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {hhmm(p.data_agendada)} · {p.clientes?.nome ?? "—"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: COR_STATUS[p.status] }}
                      />
                      <span className="micro-label">{ROTULO_STATUS[p.status]}</span>
                    </span>
                  </div>
                  {p.redes.length > 0 && (
                    <div className="mt-1 text-xs text-muted">
                      {p.redes.join(" · ")}
                    </div>
                  )}
                  {p.legenda && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                      {p.legenda}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 border-t border-line pt-2 text-xs">
                    <Link href={`/posts/${p.id}`} className="text-ink hover:underline">
                      Abrir e editar
                    </Link>
                    {onDuplicar && (
                      <button
                        onClick={() => onDuplicar(p.id)}
                        className="text-ink-soft hover:text-ink hover:underline"
                      >
                        Duplicar
                      </button>
                    )}
                    {onExcluir && (
                      <button
                        onClick={() => onExcluir(p.id)}
                        className="ml-auto text-muted hover:text-st-falhou hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
