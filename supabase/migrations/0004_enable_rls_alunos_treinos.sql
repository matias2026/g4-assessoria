-- Habilita Row Level Security nas tabelas reais do projeto (alunos/treinos),
-- que estavam totalmente expostas à anon key sem RLS (achado crítico do
-- advisor de segurança do Supabase). Sem políticas ainda nesta migração —
-- só a service role acessa até as políticas por papel (migração seguinte).
alter table public.alunos enable row level security;
alter table public.treinos enable row level security;
