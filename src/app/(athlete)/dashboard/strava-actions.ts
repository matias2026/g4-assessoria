"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAthleteActivities, refreshStravaToken } from "@/lib/strava/client";

/**
 * "Sincronizar agora" — puxa as atividades recentes do Strava sob demanda
 * (não existia nenhum gatilho pra isso antes; a conexão OAuth em si já
 * funcionava, só nunca buscava atividade nenhuma). Renova o token
 * automaticamente quando expirado, mesma lógica que estava parada e sem uso
 * em api/strava/sync/route.ts (removida — virou este Server Action, no
 * mesmo padrão do resto do app).
 */
export async function syncStravaNow(): Promise<{ synced: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

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

  let activities;
  try {
    activities = await fetchAthleteActivities(accessToken, { perPage: 30 });
  } catch (e) {
    console.error("[strava] erro ao buscar atividades:", e instanceof Error ? e.message : e);
    throw new Error("Não foi possível buscar as atividades do Strava agora. Tente de novo em instantes.");
  }

  if (activities.length > 0) {
    await admin.from("strava_activities").upsert(
      activities.map((activity) => ({
        profile_id: user.id,
        strava_activity_id: activity.id,
        name: activity.name,
        type: activity.type,
        distance_meters: activity.distance,
        moving_time_seconds: activity.moving_time,
        start_date: activity.start_date,
        average_heartrate: activity.average_heartrate ?? null,
        raw: activity as unknown as Record<string, unknown>,
      })),
      { onConflict: "strava_activity_id" }
    );
  }

  revalidatePath("/dashboard");
  return { synced: activities.length };
}
