"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { useStravaConnect } from "@/lib/useStravaConnect";

interface StravaConnectCardProps {
  connected: boolean;
}

/**
 * Card de conectar/sincronizar/desconectar o Strava fora do contexto de um
 * treino — aparece na Home mesmo quando o treinador ainda não enviou
 * nenhum treino pra hoje (ver NoWorkoutCard, dashboard/page.tsx). Antes,
 * essa opção só existia dentro do card do "Treino do dia"
 * (AthleteWorkoutView), então sem treino prescrito o aluno não tinha como
 * conectar nem sincronizar a conta — mesmo a sincronização em si nunca
 * dependendo de treino nenhum (ver src/lib/strava/sync.ts).
 */
export function StravaConnectCard({ connected: initialConnected }: StravaConnectCardProps) {
  const {
    connected,
    syncing,
    syncMessage,
    confirmingDisconnect,
    disconnecting,
    disconnectError,
    handleSync,
    handleDisconnect,
    setConfirmingDisconnect,
  } = useStravaConnect(initialConnected);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-medium text-g4-ink">Strava</p>
        <div className="flex items-center gap-4 text-xs">
          <Badge tone={connected ? "lime" : "neutral"}>{connected ? "Strava conectado" : "Strava não conectado"}</Badge>
          {connected ? (
            <>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="text-xs font-semibold text-lime-deep underline underline-offset-2 focus-ring disabled:opacity-60"
              >
                {syncing ? "Sincronizando..." : "Sincronizar agora"}
              </button>
              {confirmingDisconnect ? (
                <span className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="font-semibold text-status-missed underline underline-offset-2 focus-ring disabled:opacity-60"
                  >
                    {disconnecting ? "Desconectando..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDisconnect(false)}
                    className="text-g4-muted underline underline-offset-2 focus-ring"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDisconnect(true)}
                  className="text-g4-muted underline underline-offset-2 focus-ring"
                >
                  Desconectar
                </button>
              )}
            </>
          ) : (
            <LinkButton href="/api/strava/connect" variant="ghost" className="px-2 py-1 text-xs">
              Conectar
            </LinkButton>
          )}
        </div>
      </div>
      {syncMessage && <p className="mt-2 text-right text-xs text-g4-muted">{syncMessage}</p>}
      {disconnectError && <p className="mt-2 text-right text-xs text-status-missed">{disconnectError}</p>}
    </Card>
  );
}
