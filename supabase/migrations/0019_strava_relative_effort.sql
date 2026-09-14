-- Relative Effort (suffer_score) de cada atividade da Strava — base do
-- cálculo de ACWR (carga aguda/crônica) no Alerta de overtraining, quando a
-- atividade não tem TSS calculado (a maioria não tem).
alter table public.strava_activities add column relative_effort numeric;
