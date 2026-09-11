"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { toggleActive } from "./actions";

export function ToggleActiveButton({ profileId, active }: { profileId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-4">
      <Button
        type="button"
        variant={active ? "ghost" : "secondary"}
        className="px-3 py-1 text-xs"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await toggleActive(profileId, !active);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Falha ao atualizar.");
            }
          });
        }}
      >
        {isPending ? "..." : active ? "Suspender" : "Reativar"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
