"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { approveRequest, denyRequest } from "./actions";

export function RequestActions({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [denied, setDenied] = useState(false);

  if (approved) {
    return (
      <div className="rounded-lg bg-g4-surface-alt p-2 text-xs">
        <p className="font-medium text-g4-ink">Conta criada.</p>
        <p className="mt-1 text-g4-muted">A pessoa já pode entrar com a senha que ela mesma escolheu.</p>
      </div>
    );
  }

  if (denied) {
    return <p className="text-xs text-g4-muted">Pedido negado.</p>;
  }

  return (
    <div className="flex flex-col items-end gap-4">
      <div className="flex gap-4">
        <Button
          type="button"
          variant="primary"
          className="px-3 py-1 text-xs"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await approveRequest(requestId);
              if (result.error) {
                setError(result.error);
                return;
              }
              setApproved(true);
            });
          }}
        >
          {isPending ? "..." : "Aprovar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="px-3 py-1 text-xs"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await denyRequest(requestId);
              if (result.error) {
                setError(result.error);
                return;
              }
              setDenied(true);
            });
          }}
        >
          Negar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
