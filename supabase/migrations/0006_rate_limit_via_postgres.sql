-- Rate limiting usando o próprio Postgres do Supabase (sem serviço externo).
-- Janela fixa por chave (ex.: "login:1.2.3.4"): cada bucket de N segundos
-- conta quantas vezes a chave apareceu; se passar do máximo, bloqueia.
create table public.rate_limit_buckets (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- Infraestrutura interna, não dado de usuário: RLS habilitada e sem
-- nenhuma policy — só a service role (usada em src/lib/rate-limit.ts) acessa.
alter table public.rate_limit_buckets enable row level security;

create or replace function public.check_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_buckets (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limit_buckets.count + 1
  returning count into v_count;

  -- limpeza oportunista: descarta janelas antigas da mesma chave
  delete from public.rate_limit_buckets
  where key = p_key and window_start < v_window_start - (p_window_seconds || ' seconds')::interval;

  return v_count <= p_max;
end;
$$;

-- Só a service role chama isso (rotas de servidor); não é uma função de app.
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
