-- Reestrutura o módulo de treino no padrão TrainingPeaks: prescrição
-- estruturada + métricas planejadas em `workouts`, e uma tabela separada
-- `workout_completions` para os dados reais (via Strava ou lançamento
-- manual do treinador), comparáveis lado a lado com o planejado.

-- Prescrição estruturada e link de vídeo/preleção -------------------------

alter table workouts
  add column warmup_text text,
  add column main_set_text text,
  add column cooldown_text text,
  add column video_url text;

-- Métricas planejadas -------------------------------------------------------
-- Pace/velocidade média não é armazenado: é derivado em tempo de exibição a
-- partir de planned_distance_meters e planned_duration_seconds (ver
-- src/lib/workout-metrics.ts), evitando dado duplicado/inconsistente.

alter table workouts
  add column planned_duration_seconds integer,
  add column planned_distance_meters numeric,
  add column planned_tss numeric,
  add column planned_if numeric,
  add column planned_hr_min integer,
  add column planned_hr_avg integer,
  add column planned_hr_max integer;

-- Dados concluídos -----------------------------------------------------------

create type workout_completion_source as enum ('strava', 'manual');

create table workout_completions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  source workout_completion_source not null default 'manual',
  strava_activity_id uuid references strava_activities (id) on delete set null,
  duration_seconds integer,
  distance_meters numeric,
  tss numeric,
  if_score numeric,
  hr_min integer,
  hr_avg integer,
  hr_max integer,
  rpe smallint check (rpe between 1 and 10),
  feeling smallint check (feeling between 1 and 5),
  comments text,
  created_at timestamptz not null default now(),
  unique (workout_id)
);

create index workout_completions_profile_idx on workout_completions (profile_id);

alter table workout_completions enable row level security;

-- workout_completions: mesmas regras de acesso de workouts — o próprio
-- atleta ou o treinador responsável pelo treino podem ler/lançar dados.
create policy "workout_completions_select" on workout_completions
  for select to authenticated using (
    profile_id = auth.uid()
    or exists (
      select 1 from workouts w
      where w.id = workout_completions.workout_id and w.coach_id = auth.uid()
    )
  );

create policy "workout_completions_write" on workout_completions
  for all to authenticated using (
    profile_id = auth.uid()
    or exists (
      select 1 from workouts w
      where w.id = workout_completions.workout_id and w.coach_id = auth.uid()
    )
  )
  with check (
    profile_id = auth.uid()
    or exists (
      select 1 from workouts w
      where w.id = workout_completions.workout_id and w.coach_id = auth.uid()
    )
  );
