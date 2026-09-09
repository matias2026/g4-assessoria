"use client";

import { Button } from "@/components/ui/Button";
import { buildZwoXml } from "@/lib/workout-export";
import type { WorkoutInterval } from "@/lib/supabase/types";

interface DownloadZwoButtonProps {
  title: string;
  discipline: string;
  structuredIntervals: WorkoutInterval[];
}

// Gera o .ZWO no navegador (sem round-trip ao servidor) e dispara o
// download — importável em relógios Garmin/Wahoo como treino estruturado.
export function DownloadZwoButton({ title, discipline, structuredIntervals }: DownloadZwoButtonProps) {
  function handleDownload() {
    const xml = buildZwoXml({ title, discipline, structuredIntervals });
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.zwo`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" onClick={handleDownload} className="px-4">
      Baixar treino (.ZWO)
    </Button>
  );
}
