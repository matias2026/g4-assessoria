-- Fundação multi-tenant: transforma o app de "um treinador só" em
-- plataforma que pode atender várias assessorias isoladas entre si.
--
-- Isolamento por organization_id em vez de duplicar tabelas (alunos/
-- treinos continuam sendo o modelo oficial, sem um "workouts" paralelo).
-- current_profile() é SECURITY DEFINER pra evitar o problema clássico de
-- RLS recursiva ao consultar profiles de dentro de uma policy da própria
-- profiles, e serve de base pra todas as outras policies também.

-- 1) Catálogo da plataforma ------------------------------------------------

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- null = sem limite. Preço fica configurável aqui, nunca fixo no código.
  max_athletes integer,
  price_cents integer,
  billing_period text not null default 'monthly' check (billing_period in ('monthly', 'yearly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table plans enable row level security;

-- Estrutura pronta pra um gateway de pagamento real (Stripe, etc.) —
-- payment_provider/payment_provider_subscription_id ficam null até uma
-- integração de verdade existir. Nunca simula cobrança.
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid references plans(id),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  payment_provider text,
  payment_provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
create unique index if not exists subscriptions_one_active_per_org on subscriptions (organization_id)
  where status in ('trialing', 'active', 'past_due');

-- 2) organization_id nas tabelas existentes --------------------------------

alter table profiles add column if not exists organization_id uuid references organizations(id);
-- Dono da plataforma (você) — enxerga todas as organizações. Distinto de
-- profiles.role = 'admin', que é o admin *daquela* organização (assessoria).
alter table profiles add column if not exists is_platform_admin boolean not null default false;

alter table alunos add column if not exists organization_id uuid references organizations(id);
alter table access_requests add column if not exists organization_id uuid references organizations(id);
alter table exercise_library add column if not exists organization_id uuid references organizations(id);

-- 3) Backfill: a organização única de hoje vira a primeira assessoria -------
-- (idempotente — não recria nem reatribui se já existir uma organização).

do $$
declare
  seed_org_id uuid;
begin
  select id into seed_org_id from organizations order by created_at limit 1;

  if seed_org_id is null then
    insert into organizations (name, contact_phone)
    values ('G4 Assessoria Esportiva', '+5584999990000')
    returning id into seed_org_id;
  end if;

  update profiles set organization_id = seed_org_id where organization_id is null;
  update alunos set organization_id = seed_org_id where organization_id is null;
  update access_requests set organization_id = seed_org_id where organization_id is null;
  update exercise_library set organization_id = seed_org_id where organization_id is null;

  -- O admin único de hoje também é o dono da plataforma, até existir mais
  -- de uma organização de verdade.
  update profiles set is_platform_admin = true where role = 'admin';

  if not exists (select 1 from subscriptions where organization_id = seed_org_id) then
    insert into subscriptions (organization_id, status, trial_ends_at)
    values (seed_org_id, 'active', null);
  end if;
end $$;

alter table profiles alter column organization_id set not null;
alter table alunos alter column organization_id set not null;
alter table exercise_library alter column organization_id set not null;
-- access_requests fica nullable: hoje só existe 1 organização (o link
-- público /solicitar-acesso resolve pra ela), então essa coluna já vem
-- preenchida na prática — mas exigir NOT NULL aqui travaria o fluxo se
-- um dia existir um link de pedido de acesso sem organização resolvida
-- (ex.: durante o próprio onboarding de uma organização nova).

-- 4) Isolamento entre organizações (RLS) -----------------------------------

create or replace function current_profile()
returns table (organization_id uuid, role text, active boolean, is_platform_admin boolean)
language sql
security definer
stable
set search_path = public
as $$
  select organization_id, role, active, is_platform_admin from profiles where id = auth.uid()
$$;

-- profiles: cada um vê o próprio perfil; treinador/admin vê o resto da
-- própria organização; dono da plataforma vê tudo.
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles for select
  using (
    id = auth.uid()
    or (select is_platform_admin from current_profile())
    or organization_id = (select organization_id from current_profile())
  );

-- alunos: mesma regra de sempre (coach/admin ativo vê tudo, aluno só a
-- própria ficha), agora restrita à própria organização.
drop policy if exists alunos_coach_admin_all on alunos;
create policy alunos_coach_admin_all on alunos for all
  using (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and organization_id = (select organization_id from current_profile())
    )
  )
  with check (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and organization_id = (select organization_id from current_profile())
    )
  );

-- treinos: sem organization_id próprio — isola pelo aluno_id (que já
-- pertence a uma organização).
drop policy if exists treinos_coach_admin_all on treinos;
create policy treinos_coach_admin_all on treinos for all
  using (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and exists (
        select 1 from alunos a
        where a.id = treinos.aluno_id
          and a.organization_id = (select organization_id from current_profile())
      )
    )
  )
  with check (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and exists (
        select 1 from alunos a
        where a.id = treinos.aluno_id
          and a.organization_id = (select organization_id from current_profile())
      )
    )
  );

-- exercise_library: biblioteca é por organização, não global entre todas
-- as assessorias.
drop policy if exists exercise_library_coach_admin_all on exercise_library;
create policy exercise_library_coach_admin_all on exercise_library for all
  using (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and organization_id = (select organization_id from current_profile())
    )
  )
  with check (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and organization_id = (select organization_id from current_profile())
    )
  );

-- aluno_notes: sem organization_id próprio, mesma lógica de treinos.
drop policy if exists aluno_notes_coach_admin_all on aluno_notes;
create policy aluno_notes_coach_admin_all on aluno_notes for all
  using (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and exists (
        select 1 from alunos a
        where a.id = aluno_notes.aluno_id
          and a.organization_id = (select organization_id from current_profile())
      )
    )
  )
  with check (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and exists (
        select 1 from alunos a
        where a.id = aluno_notes.aluno_id
          and a.organization_id = (select organization_id from current_profile())
      )
    )
  );

-- organizations/plans/subscriptions: sem policy nenhuma além do
-- necessário pra o app ler os próprios dados — o resto (criar
-- organização, mexer em plano/assinatura) passa pela service role via
-- Server Actions, igual ao padrão já usado em todo o app pra escrita
-- sensível. Deixa o admin da própria organização ler a própria org e a
-- própria assinatura (pro dashboard mostrar plano/uso).
create policy organizations_select_own on organizations for select
  using (
    (select is_platform_admin from current_profile())
    or id = (select organization_id from current_profile())
  );

create policy subscriptions_select_own on subscriptions for select
  using (
    (select is_platform_admin from current_profile())
    or organization_id = (select organization_id from current_profile())
  );

create policy plans_select_all on plans for select using (true);
