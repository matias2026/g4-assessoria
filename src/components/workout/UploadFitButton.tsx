"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { completeOwnWorkoutWithFit } from "@/app/(athlete)/dashboard/profile-actions";

interface UploadFitButtonProps {
  onUploaded: () => void;
}

// Upload manual do arquivo .FIT do treino realizado — decodificado no
// servidor (fit-import.ts) e salvo em treinos.atividade_fit, pra aparecer
// com dado real na aba "Analisar treino do aluno" do treinador (potência,
// FC, cadência, altimetria, velocidade), em vez do exemplo genérico.
export function UploadFitButton({ onUploaded }: UploadFitButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois de um erro
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      await completeOwnWorkoutWithFit(file);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {/* accept só com a extensão ".fit" faz o Android abrir a Galeria de
          fotos em vez do app de Arquivos (Downloads) — o sistema não
          reconhece nenhum MIME pra essa extensão custom e cai num
          fallback errado. Combinar com application/octet-stream resolve
          nos dois SOs; a validação de verdade é sempre no servidor
          (parseFitFile), então isso aqui é só uma dica pro picker. */}
      <input
        ref={inputRef}
        type="file"
        accept=".fit,application/octet-stream"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Enviando..." : "Enviar arquivo do treino (.FIT)"}
      </Button>
      {error && <p className="mt-2 text-sm text-status-missed">{error}</p>}
    </div>
  );
}
