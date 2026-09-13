"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type DeviceKey = "garmin" | "igpsport" | "wahoo";

interface DeviceGuide {
  key: DeviceKey;
  label: string;
  steps: string[];
}

const DEVICES: DeviceGuide[] = [
  {
    key: "garmin",
    label: "Garmin",
    steps: [
      "Baixe o arquivo do treino (.ZWO) no botão acima.",
      "Conecte o Garmin no computador via USB e cole o arquivo na pasta \"NewFiles\" do dispositivo — ou importe direto pelo app Garmin Connect no celular (Treino → Importar arquivo).",
    ],
  },
  {
    key: "igpsport",
    label: "iGPSPORT",
    steps: [
      "Baixe o arquivo do treino no botão acima.",
      "Abra o app iGPSPORT, vá em \"Treinos estruturados\" e importe o arquivo — se seu modelo não tiver import direto pelo app, sincronize por cabo USB.",
    ],
  },
  {
    key: "wahoo",
    label: "Wahoo / Outros",
    steps: [
      "Baixe o arquivo do treino (.ZWO) no botão acima.",
      "Abra o app do seu ciclocomputador (Wahoo SYSTM/ELEMNT ou equivalente) e importe o arquivo na seção de treinos — a maioria dos GPS de ciclismo aceita o formato .ZWO.",
    ],
  },
];

// Seletor de dispositivo + mini tutorial expansível para importar o
// arquivo de treino baixado. Cobre as marcas mais comuns entre os alunos,
// não só Garmin.
export function DeviceTutorial() {
  const [selected, setSelected] = useState<DeviceKey | null>(null);
  const guide = DEVICES.find((d) => d.key === selected) ?? null;

  return (
    <div className="mt-3 border-t border-g4-border pt-3">
      <p className="text-sm font-medium text-g4-ink">Qual seu dispositivo?</p>

      {/* Rolagem horizontal em vez de empilhar — três botões numa linha só
          espremeriam o texto ("Wahoo / Outros" quebrando ao meio) no
          celular; assim cada um mantém a largura natural e o usuário
          arrasta pros que não couberem na tela. */}
      <div className="mt-2 flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DEVICES.map((device) => {
          const isActive = device.key === selected;
          return (
            <button
              key={device.key}
              type="button"
              onClick={() => setSelected(isActive ? null : device.key)}
              aria-expanded={isActive}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-ring",
                isActive
                  ? "border-lime bg-lime text-g4-ink"
                  : "border-g4-border bg-white text-g4-ink hover:border-lime-deep/50 hover:bg-g4-surface-alt"
              )}
            >
              {device.label}
            </button>
          );
        })}
      </div>

      {guide && (
        <div className="mt-3 rounded-xl border border-lime/40 bg-lime/10 p-3">
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-g4-ink">
            {guide.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
