-- Data de nascimento (idade -> FC máxima estimada por Tanaka), peso,
-- altura, anamnese (PAR-Q), modalidade e nível de experiência,
-- coletados no próprio /solicitar-acesso quando quem pede é aluno —
-- repassados pra ficha em alunos na aprovação do pedido.
-- "if not exists": essas colunas já foram criadas manualmente no banco
-- (mesmo projeto Supabase usado por outro repo/sessão) antes desta
-- migração existir aqui; idempotente pra não quebrar se aplicada de novo.
alter table public.access_requests add column if not exists birth_date date;
alter table public.access_requests add column if not exists weight_kg numeric;
alter table public.access_requests add column if not exists height_cm numeric;
alter table public.access_requests add column if not exists medical_notes text;
alter table public.access_requests add column if not exists modalidade text;
alter table public.access_requests add column if not exists training_experience text
  check (training_experience in ('iniciante', 'experiente'));
