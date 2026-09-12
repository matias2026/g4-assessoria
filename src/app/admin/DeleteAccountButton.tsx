"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteAccount } from "./actions";

// Exige um segundo clique pra confirmar — exclusão é irreversível (ao
// contrário de suspender/reativar), então não pode disparar num toque só.
export function DeleteAccountButton({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-4">
        <div className="flex gap-4">
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-1 text-xs text-red-600"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await deleteAccount(profileId);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Falha ao excluir.");
                  setConfirming(false);
                }
              });
            }}
          >
            {isPending ? "Excluindo..." : "Confirmar exclusão"}
          </Button>
          <Button type="button" variant="ghost" className="px-3 py-1 text-xs" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-4">
      <Button type="button" variant="ghost" className="px-3 py-1 text-xs text-red-600" onClick={() => setConfirming(true)}>
        Excluir
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
