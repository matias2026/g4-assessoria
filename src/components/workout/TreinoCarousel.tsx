"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, Lock } from "lucide-react";

export interface Treino {
  id: number;
  dia: string;
  data: string;
  dataIso: string;
  modalidade: string;
  titulo: string;
  descricao: string;
  duracao: string;
  distancia: string;
  concluido: boolean;
}

interface TreinoCarouselProps {
  treinos: Treino[];
  onToggleComplete: (dataIso: string, concluido: boolean) => Promise<void>;
}

/**
 * Carrossel dos treinos da semana na Home do aluno — navega pelos dias que
 * o treinador já enviou (dias sem prescrição não aparecem aqui, nunca
 * inventados). "Marcar como concluído" grava direto em `treinos.concluido`
 * via onToggleComplete (setWeekWorkoutCompletion); é um check rápido sem
 * RPE — a conclusão detalhada do treino de hoje continua no card
 * AthleteWorkoutView, com o modal de RPE/sensação.
 */
export default function TreinoCarousel({ treinos, onToggleComplete }: TreinoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (treinos.length === 0) return null;

  const treinoAtual = treinos[currentIndex];

  // Regra: só pode concluir o treino da posição N se o da posição N-1 (o
  // dia anterior com treino enviado) já estiver concluído. O primeiro da
  // lista está sempre liberado.
  const podeConcluir = (index: number) => {
    if (index === 0) return true;
    return treinos[index - 1].concluido;
  };

  async function toggleConcluido(index: number) {
    if (!podeConcluir(index) || pending) return;
    const treino = treinos[index];
    setError(null);
    setPending(true);
    try {
      await onToggleComplete(treino.dataIso, !treino.concluido);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar esse treino.");
    } finally {
      setPending(false);
    }
  }

  const proximo = () => {
    if (currentIndex < treinos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const anterior = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const isConcluido = treinoAtual.concluido;
  const isLiberado = podeConcluir(currentIndex);

  return (
    <div className="w-full max-w-xl mx-auto bg-[#141A1B] border border-zinc-800 rounded-2xl p-6 text-zinc-100 shadow-xl">
      {/* Navegação de Dias da Semana (Visão geral de todos os cards na mesma tela) */}
      <div className="flex items-center justify-between mb-6 gap-1 overflow-x-auto pb-2">
        {treinos.map((t, idx) => {
          const isSelected = idx === currentIndex;
          const done = t.concluido;
          const unlocked = podeConcluir(idx);

          return (
            <button
              key={t.id}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-1 min-w-[65px] py-2 px-1 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1 border ${
                isSelected
                  ? "bg-[#84CC16] text-black border-[#84CC16] font-bold"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <span>{t.dia}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] opacity-75">{t.data}</span>
                {done && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {!unlocked && !done && <Lock className="w-3 h-3 text-zinc-600" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Card Animado Principal com Setas */}
      <div className="relative flex items-center justify-between gap-4">
        {/* Seta Esquerda */}
        <button
          onClick={anterior}
          disabled={currentIndex === 0}
          className="p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Conteúdo Animado do Card */}
        <div className="flex-1 overflow-hidden min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={treinoAtual.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-[#1C2426] border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#84CC16]/20 text-[#84CC16] border border-[#84CC16]/30">
                    {treinoAtual.modalidade}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {treinoAtual.dia} • {treinoAtual.data}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">
                  {treinoAtual.titulo}
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {treinoAtual.descricao}
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-300 font-mono mb-4">
                  <span>⏱ {treinoAtual.duracao}</span>
                  <span>📍 {treinoAtual.distancia}</span>
                </div>
              </div>

              {/* Botão de Conclusão com Validação */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                {isLiberado ? (
                  <button
                    onClick={() => toggleConcluido(currentIndex)}
                    disabled={pending}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                      isConcluido
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-[#84CC16] text-black hover:bg-[#73b512]"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isConcluido ? "Treino Concluído" : "Marcar como Concluído"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/80 px-3 py-2 rounded-lg border border-zinc-800">
                    <Lock className="w-4 h-4 text-zinc-500" />
                    <span>Conclua o treino anterior para liberar este dia</span>
                  </div>
                )}
              </div>
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Seta Direita */}
        <button
          onClick={proximo}
          disabled={currentIndex === treinos.length - 1}
          className="p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
