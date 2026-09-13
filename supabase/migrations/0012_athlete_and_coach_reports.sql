alter table public.alunos
  add column athlete_report text not null default '',
  add column coach_notes text not null default '';
