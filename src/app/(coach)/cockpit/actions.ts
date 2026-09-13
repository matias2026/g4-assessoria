"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExerciseLibraryItem, ProfileRole } from "@/lib/supabase/types";

// Autentica/autoriza com o client de sessão (RLS); a leitura/escrita em si
// roda com a service role, mesmo padrão de src/app/admin/actions.ts — o
// generic de tabela do @supabase/ssr não propaga bem pra insert/upsert.
export async function requireCoachOrAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  // O generic da tabela via @supabase/ssr não propaga o tipo da coluna aqui;
  // o shape é conhecido (profiles.role/active) então a asserção é segura.
  const profile = data as { role: ProfileRole; active: boolean } | null;
  if (!profile?.active || !["coach", "admin"].includes(profile.role)) {
    throw new Error("Acesso restrito a treinadores.");
  }
}

/** Lista os exercícios salvos na biblioteca, em ordem alfabética. */
export async function listExerciseLibrary(): Promise<ExerciseLibraryItem[]> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("exercise_library").select("id, name, video_url").order("name");

  if (error) throw new Error("Falha ao carregar a biblioteca de exercícios.");

  return (data ?? []).map((row) => ({ id: row.id, name: row.name, videoUrl: row.video_url }));
}

/** Salva (cria ou atualiza pelo nome) um exercício na biblioteca. */
export async function saveExerciseLibraryItem(input: {
  name: string;
  videoUrl: string | null;
}): Promise<ExerciseLibraryItem> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exercise_library")
    .upsert({ name: input.name, video_url: input.videoUrl }, { onConflict: "name" })
    .select("id, name, video_url")
    .single();

  if (error) throw new Error("Falha ao salvar na biblioteca de exercícios.");

  return { id: data.id, name: data.name, videoUrl: data.video_url };
}
