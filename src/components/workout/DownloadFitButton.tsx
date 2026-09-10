"use client";

import { Button } from "@/components/ui/Button";
import { buildFitWorkout } from "@/lib/workout-export";
import type { WorkoutInterval } from "@/lib/supabase/types";

interface DownloadFitButtonProps {
  title: string;
  discipline: string;
  structuredIntervals: WorkoutInterval[];
}

// Gera o .FIT binário no navegador via SDK oficial da Garmin (@garmin/fitsdk)
// e dispara o download — formato nativo, reconhecido direto por relógios e
// ciclocomputadores Garmin sem passar pelo Garmin Connect.
export function DownloadFitButton({ title, discipline, structuredIntervals }: DownloadFitButtonProps) {
  function handleDownload() {
    const bytes = buildFitWorkout({ title, discipline, structuredIntervals });
    // Encoder.close() devolve Uint8Array<ArrayBufferLike>; o construtor de
    // Blob exige um ArrayBuffer concreto — new Uint8Array(bytes) copia para
    // um buffer próprio e resolve a incompatibilidade de tipos.
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.fit`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" onClick={handleDownload} className="px-4">
      Baixar treino (.FIT)
    </Button>
  );
}
