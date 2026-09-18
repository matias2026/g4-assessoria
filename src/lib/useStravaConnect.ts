"use client";

import { useState } from "react";
import { disconnectStrava, syncStravaNow } from "@/app/(athlete)/dashboard/strava-actions";

/**
 * Estado e ações de conectar/sincronizar/desconectar o Strava — extraído
 * de dentro do card do "Treino do dia" (AthleteWorkoutView) pra também
 * poder aparecer quando não há treino prescrito hoje (StravaConnectCard).
 * Antes, sem treino enviado, a Home do aluno não desenhava
 * AthleteWorkoutView nenhum, e a opção de Strava desaparecia inteira —
 * mesmo pra quem conecta a conta fora de qualquer contexto de treino.
 */
export function useStravaConnect(initialConnected: boolean) {
  // Espelha a prop em estado local pra atualizar o badge na hora ao
  // desconectar, sem depender de recarregar a página inteira.
  const [connected, setConnected] = useState(initialConnected);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  async function handleSync() {
    setSyncMessage(null);
    setSyncing(true);
    try {
      const { synced } = await syncStravaNow();
      setSyncMessage(
        synced > 0 ? `${synced} atividade${synced > 1 ? "s" : ""} sincronizada${synced > 1 ? "s" : ""}.` : "Nenhuma atividade nova."
      );
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : "Não foi possível sincronizar agora.");
    } finally {
      setSyncing(false);
    }
  }

  // Desfaz a conexão com o Strava — pra quem conectou a conta errada e
  // ficava sem jeito nenhum de trocar, já que só existia o botão "Conectar".
  async function handleDisconnect() {
    setDisconnectError(null);
    setDisconnecting(true);
    try {
      await disconnectStrava();
      setConnected(false);
      setConfirmingDisconnect(false);
      setSyncMessage(null);
    } catch (e) {
      setDisconnectError(e instanceof Error ? e.message : "Não foi possível desconectar agora.");
    } finally {
      setDisconnecting(false);
    }
  }

  return {
    connected,
    syncing,
    syncMessage,
    confirmingDisconnect,
    disconnecting,
    disconnectError,
    handleSync,
    handleDisconnect,
    setConfirmingDisconnect,
  };
}
