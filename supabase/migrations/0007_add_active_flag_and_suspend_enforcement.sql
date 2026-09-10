-- Suspensão de conta: uma conta suspensa (active = false) perde acesso
-- imediatamente, mesmo com sessão já aberta (o login também bloqueia antes
-- disso, mas RLS é o backstop pra sessões que já existiam quando suspendeu).
alter table public.profiles add column active boolean not null default true;

alter policy "alunos_coach_admin_all" on public.alunos
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active));

alter policy "alunos_athlete_select_own" on public.alunos
  using (user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active));

alter policy "treinos_coach_admin_all" on public.treinos
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active));

alter policy "treinos_athlete_select_own" on public.treinos
  using (aluno_id in (select id from public.alunos where user_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active));

alter policy "treinos_athlete_update_own" on public.treinos
  using (aluno_id in (select id from public.alunos where user_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active))
  with check (aluno_id in (select id from public.alunos where user_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active));
