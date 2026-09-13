-- Notas privadas do treinador sobre o aluno (Card 5 do Monitoramento) —
-- tabela separada de `alunos.coach_notes` (esse é o "Relatório do
-- treinador", visível pro aluno). Aqui não existe policy nenhuma pro
-- aluno, de propósito — mesma trava usada em access_requests: RLS
-- habilitada e sem nenhuma policy pra esse papel garante que nem uma
-- consulta direta via API REST com o token do aluno consiga ler,
-- mesmo sendo a própria linha dele.
create table public.aluno_notes (
  aluno_id uuid primary key references public.alunos(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.aluno_notes enable row level security;

create policy "aluno_notes_coach_admin_all"
  on public.aluno_notes for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin') and p.active));
