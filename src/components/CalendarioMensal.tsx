"use client";

import { useState } from "react";

// Só os campos que o calendário precisa de cada post.
type PostNoCalendario = {
  id: string;
  data_agendada: string;
  status: "rascunho" | "agendado" | "publicado" | "falhou";
  clientes: { nome: string } | null;
};

const STATUS_CORES: Record<PostNoCalendario["status"], string> = {
  rascunho: "bg-zinc-200 text-zinc-700",
  agendado: "bg-blue-100 text-blue-700",
  publicado: "bg-green-100 text-green-700",
  falhou: "bg-red-100 text-red-700",
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Duas datas caem no mesmo dia (no horário local)?
function mesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarioMensal({ posts }: { posts: PostNoCalendario[] }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()); // 0 = Janeiro

  // Quantos dias tem o mês e em que dia da semana ele começa.
  const primeiroDia = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const deslocamento = primeiroDia.getDay(); // 0 (Dom) a 6 (Sáb)

  // Monta as "células": espaços em branco antes do dia 1, depois os dias.
  const celulas: (number | null)[] = [];
  for (let i = 0; i < deslocamento; i++) celulas.push(null);
  for (let dia = 1; dia <= totalDias; dia++) celulas.push(dia);

  // Posts de um dia específico deste mês.
  function postsDoDia(dia: number) {
    const dataDoDia = new Date(ano, mes, dia);
    return posts.filter((p) => mesmoDia(new Date(p.data_agendada), dataDoDia));
  }

  function mesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  }
  function mesProximo() {
    if (mes === 11) {
      setMes(0);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  }
  function irParaHoje() {
    setAno(hoje.getFullYear());
    setMes(hoje.getMonth());
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      {/* Cabeçalho com navegação de mês */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">
          {MESES[mes]} de {ano}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={mesAnterior}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-50"
          >
            ←
          </button>
          <button
            onClick={irParaHoje}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
          >
            Hoje
          </button>
          <button
            onClick={mesProximo}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grade dos dias */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((dia, indice) => {
          if (dia === null) {
            return <div key={`vazio-${indice}`} className="min-h-20" />;
          }

          const doDia = postsDoDia(dia);
          const ehHoje = mesmoDia(new Date(ano, mes, dia), hoje);

          return (
            <div
              key={dia}
              className={`min-h-20 rounded-md border p-1 ${
                ehHoje ? "border-blue-400 bg-blue-50" : "border-zinc-200"
              }`}
            >
              <div className="text-right text-xs text-zinc-500">{dia}</div>
              <div className="mt-0.5 space-y-0.5">
                {doDia.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    title={`${p.clientes?.nome ?? ""} (${p.status})`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] ${STATUS_CORES[p.status]}`}
                  >
                    {p.clientes?.nome ?? "—"}
                  </div>
                ))}
                {doDia.length > 3 && (
                  <div className="text-[10px] text-zinc-500">
                    +{doDia.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
