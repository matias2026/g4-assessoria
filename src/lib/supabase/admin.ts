import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Cliente com service role, exclusivo para uso em Route Handlers de servidor
// (ex.: troca de tokens do Strava, sincronização de atividades). NUNCA importe
// este arquivo em código que roda no navegador.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
