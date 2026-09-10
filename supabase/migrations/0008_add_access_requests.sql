-- Pedido de acesso público (tela sem login). Só a service role lê/escreve
-- (o formulário público insere via Server Action com service role, nunca
-- direto do navegador) — RLS habilitada e sem nenhuma policy, mesma trava
-- usada em rate_limit_buckets.
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  role_requested text not null check (role_requested in ('coach', 'athlete')),
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.access_requests enable row level security;
