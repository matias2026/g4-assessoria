-- strava_tokens/strava_activities já eram usadas pelo código (connect/
-- callback/sync, ver src/lib/strava e src/app/(athlete)/dashboard/
-- strava-actions.ts) e já estavam declaradas em src/lib/supabase/types.ts,
-- mas a migração pra criar essas tabelas de verdade nunca tinha sido
-- escrita — o "Conectar" da Strava sempre falhava silenciosamente
-- (upsert em tabela inexistente) e nada era salvo.
--
-- strava_tokens guarda access/refresh token — sensível, mesmo padrão de
-- aluno_notes/access_requests: RLS habilitada e sem nenhuma policy, então
-- só a service role (sempre usada pelo app pra mexer aqui) consegue ler ou
-- escrever, mesmo o próprio dono da linha via sessão normal não consegue.
create table public.strava_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.strava_tokens enable row level security;

-- Resumo de cada atividade sincronizada — menos sensível que o token, mas
-- mesma trava por simplicidade (o app também só acessa via service role).
create table public.strava_activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid,
  strava_activity_id bigint not null unique,
  name text not null,
  type text not null,
  distance_meters numeric,
  moving_time_seconds integer,
  start_date timestamptz not null,
  average_heartrate numeric,
  raw jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.strava_activities enable row level security;

create index strava_activities_profile_id_idx on public.strava_activities (profile_id);
