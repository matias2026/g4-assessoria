"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshStravaToken, revokeStravaToken } from "@/lib/strava/client";
import { pullStravaActivities } from "@/lib/strava/sync";

// Regra da sincronização manual: sempre as últimas 20 atividades do
// atleta, independente de data — não uma janela de dias, que
// sub-sincronizava quem treina raramente (período curto demais) ou trazia
// volume desnecessário de quem treina todo dia. A sincronização
// automática ao conectar (ver api/strava/callback/route.ts) traz um
// histórico maior — ver CONNECT_INITIAL_SYNC_COUNT lá.
const SYNC_LAST_N_ACTIVITIES = 20;

/**
 * "Desconectar" — apaga o vínculo do Strava dessa conta. Sem isso, quem
 * conectasse a conta errada do Strava ficava preso nela pra sempre: o
 * botão só existia pra conectar, nunca pra trocar. Revoga a autorização
 * do lado da Strava também (melhor esforço — se falhar, não impede
 * desconectar aqui, só quer dizer que a Strava ainda vai lembrar do app
 * autorizado até a pessoa revogar por lá também), e sempre apaga o
 * registro local, que é o que realmente prende a conta errada.
 */
export async function disconnectStrava(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("strava_tokens")
    .select("access_token")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (tokenRow) {
    try {
      await revokeStravaToken(tokenRow.access_token);
    } catch (e) {
      console.error("[strava] falha ao revogar autorização (desconectando localmente mesmo assim):", e);
    }
  }

  await admin.from("strava_tokens").delete().eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

/**
 * "Sincronizar agora" — puxa as últimas SYNC_LAST_N_ACTIVITIES atividades
 * do Strava sob demanda. A conexão em si já dispara uma sincronização
 * automática (ver api/strava/callback/route.ts) — este botão é pra
 * atualizar depois, sem esperar reconectar. Renova o token
 * automaticamente quando expirado.
 *
 * O trabalho de busca/gravação em si (não depende de o aluno ter treino
 * prescrito) mora em src/lib/strava/sync.ts, compartilhado com o
 * callback do OAuth.
 */
export async function syncStravaNow(): Promise<{ synced: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // Mesma checagem de suspensão de profile-actions.ts — cobre uma aba que
  // já estava aberta antes da conta ser suspensa (o proxy só barra numa
  // navegação nova).
  const { data: profileData } = await supabase.from("profiles").select("active").eq("id", user.id).single();
  // O generic da tabela via @supabase/ssr não propaga aqui; o shape é
  // conhecido (profiles.active) então a asserção é segura.
  if (!(profileData as { active: boolean } | null)?.active) {
    throw new Error("Esta conta está suspensa. Fale com seu treinador.");
  }

  const admin = createAdminClient();
  const { data: tokenRow } = await admin.from("strava_tokens").select("*").eq("profile_id", user.id).single();
  if (!tokenRow) throw new Error("Strava não conectado.");

  let accessToken = tokenRow.access_token;
  const isExpired = new Date(tokenRow.expires_at).getTime() <= Date.now();

  if (isExpired) {
    const refreshed = await refreshStravaToken(tokenRow.refresh_token);
    accessToken = refreshed.access_token;

    await admin
      .from("strava_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", user.id);
  }

  const result = await pullStravaActivities(admin, user.id, accessToken, SYNC_LAST_N_ACTIVITIES);

  revalidatePath("/dashboard");
  revalidatePath("/cockpit");
  return result;
}
