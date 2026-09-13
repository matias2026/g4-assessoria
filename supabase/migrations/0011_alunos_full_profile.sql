-- Ficha completa do aluno (idade, sexo, composição corporal, perfis por
-- modalidade) direto na tabela alunos — hoje só existia em memória no
-- Cockpit. Perfis como jsonb porque são objetos aninhados, opcionais
-- (só preenchidos quando a modalidade se aplica) e nunca filtrados por
-- sub-campo em SQL — mesmo raciocínio de workouts.structured_intervals.
alter table public.alunos
  add column secondary_disciplines text[] not null default '{}',
  add column age integer,
  add column sex text check (sex in ('Masculino', 'Feminino', 'Outro')),
  add column body_composition jsonb,
  add column weight_history_notes text not null default '',
  add column medical_notes text not null default '',
  add column cycling_profile jsonb,
  add column running_profile jsonb,
  add column strength_profile jsonb;
