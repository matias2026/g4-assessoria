-- Biblioteca de exercícios do treinador — nome + vídeo demonstrativo,
-- reutilizável entre alunos/prescrições (evita redigitar/recolar toda
-- vez). Sem coluna de dono: mesmo modelo de alunos/treinos, onde
-- qualquer coach/admin ativo tem acesso total (sem multi-coach hoje).
create table public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  video_url text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.exercise_library enable row level security;

create policy "exercise_library_coach_admin_all"
  on public.exercise_library for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active));
