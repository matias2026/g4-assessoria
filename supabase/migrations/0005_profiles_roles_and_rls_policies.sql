-- profiles: liga um usuário do Supabase Auth a um papel (coach/athlete/admin).
-- Cadastro é sempre feito pelo painel administrador (service role) — não há
-- policy de insert para authenticated/anon, então autocadastro é impossível.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach', 'athlete', 'admin')),
  full_name text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own_name"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Trava de negócio: no máximo 50 perfis com role='athlete' (capacidade
-- realista da assessoria no momento). Vale mesmo para inserts feitos com
-- service role, então protege o painel admin e qualquer acesso direto ao banco.
create or replace function public.enforce_athlete_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'athlete' then
    if (select count(*) from public.profiles where role = 'athlete') >= 50 then
      raise exception 'Limite de 50 atletas cadastrados atingido.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_athlete_cap
  before insert on public.profiles
  for each row execute function public.enforce_athlete_cap();

-- Não é uma função pra ser chamada via RPC — só o trigger acima a usa.
revoke execute on function public.enforce_athlete_cap() from public, anon, authenticated;

-- Liga um aluno cadastrado (tabela já existente) ao login do atleta.
alter table public.alunos
  add column user_id uuid unique references auth.users(id) on delete set null;

-- alunos: treinador/admin gerencia todos; atleta só enxerga o próprio registro.
create policy "alunos_coach_admin_all"
  on public.alunos for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin')));

create policy "alunos_athlete_select_own"
  on public.alunos for select
  using (user_id = auth.uid());

-- treinos: treinador/admin gerencia todos; atleta enxerga e atualiza (registra
-- execução) só os treinos do próprio aluno.
create policy "treinos_coach_admin_all"
  on public.treinos for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin')));

create policy "treinos_athlete_select_own"
  on public.treinos for select
  using (aluno_id in (select id from public.alunos where user_id = auth.uid()));

create policy "treinos_athlete_update_own"
  on public.treinos for update
  using (aluno_id in (select id from public.alunos where user_id = auth.uid()))
  with check (aluno_id in (select id from public.alunos where user_id = auth.uid()));
