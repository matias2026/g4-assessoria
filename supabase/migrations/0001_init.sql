-- Schema inicial do sistema G4 Assessoria Esportiva.
-- Aplique com: supabase db push  (ou cole no SQL Editor do painel Supabase)

create type profile_role as enum ('athlete', 'coach');
create type workout_status as enum ('pending', 'done', 'missed');

-- Perfis: um por usuário autenticado (auth.users), com papel atleta/treinador.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role profile_role not null default 'athlete',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Tokens OAuth do Strava, um conjunto por atleta.
create table strava_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

-- Treinos prescritos pelo treinador para um atleta.
create table workouts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  coach_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  discipline text not null default 'ciclismo',
  scheduled_date date not null,
  status workout_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Atividades importadas do Strava, opcionalmente vinculadas a um treino prescrito.
create table strava_activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  workout_id uuid references workouts (id) on delete set null,
  strava_activity_id bigint not null,
  name text not null,
  type text not null,
  distance_meters numeric,
  moving_time_seconds integer,
  start_date timestamptz not null,
  average_heartrate numeric,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (strava_activity_id)
);

create index workouts_profile_date_idx on workouts (profile_id, scheduled_date);
create index strava_activities_profile_date_idx on strava_activities (profile_id, start_date);

-- Row Level Security -------------------------------------------------------

alter table profiles enable row level security;
alter table strava_tokens enable row level security;
alter table workouts enable row level security;
alter table strava_activities enable row level security;

-- profiles: qualquer usuário autenticado pode ler perfis (necessário para o
-- cockpit do treinador listar atletas); cada um só atualiza o próprio.
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on profiles
  for update to authenticated using (id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (id = auth.uid());

-- strava_tokens: só o próprio atleta acessa seus tokens. Trocas/renovações de
-- token feitas pelo servidor usam a service role, que ignora RLS.
create policy "strava_tokens_owner" on strava_tokens
  for all to authenticated using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- workouts: atleta vê os próprios; treinador vê e gerencia os que criou.
create policy "workouts_select_own_or_coach" on workouts
  for select to authenticated using (profile_id = auth.uid() or coach_id = auth.uid());

create policy "workouts_coach_manage" on workouts
  for all to authenticated using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- atleta pode atualizar o status do próprio treino (ex.: marcar como feito).
create policy "workouts_athlete_update_status" on workouts
  for update to authenticated using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- strava_activities: cada atleta só acessa as próprias atividades sincronizadas.
create policy "strava_activities_owner" on strava_activities
  for all to authenticated using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
