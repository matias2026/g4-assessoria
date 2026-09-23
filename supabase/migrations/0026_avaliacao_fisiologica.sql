-- Módulo enxuto de avaliação fisiológica (teste de lactato/glicemia
-- incremental): cabeçalho do teste + estágios coletados. Limiares (LT1/LT2)
-- são marcados manualmente pelo treinador nesta primeira versão — sem
-- detecção automática, que fica pra depois.
create table if not exists avaliacoes_fisiologicas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  data_avaliacao date not null default current_date,
  tipo_teste text not null default 'ciclismo' check (tipo_teste in ('ciclismo', 'corrida', 'outro')),
  observacoes text,
  -- Limiares marcados manualmente pelo treinador sobre o gráfico (não
  -- calculados automaticamente nesta versão).
  lt1_potencia numeric,
  lt1_fc integer,
  lt2_potencia numeric,
  lt2_fc integer,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists estagios_teste_lactato (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references avaliacoes_fisiologicas(id) on delete cascade,
  estagio_numero integer not null,
  tempo_minutos numeric,
  potencia_watts numeric,
  pace text,
  glicemia numeric,
  fc_bpm integer,
  lactato_mmol numeric,
  pse integer check (pse is null or (pse between 0 and 10)),
  unique (avaliacao_id, estagio_numero)
);

alter table avaliacoes_fisiologicas enable row level security;
alter table estagios_teste_lactato enable row level security;

-- Mesmo padrão de isolamento por organização usado em aluno_notes/treinos
-- (0022_multi_tenant_foundation.sql) — coach/admin ativo da própria
-- organização (ou platform admin) vê e gerencia tudo; aluno não tem
-- nenhuma policy aqui de propósito, é dado do treinador sobre o aluno,
-- não do aluno.
create policy avaliacoes_fisiologicas_coach_admin_all on avaliacoes_fisiologicas for all
  using (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and exists (
        select 1 from alunos a
        where a.id = avaliacoes_fisiologicas.aluno_id
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
        where a.id = avaliacoes_fisiologicas.aluno_id
          and a.organization_id = (select organization_id from current_profile())
      )
    )
  );

create policy estagios_teste_lactato_coach_admin_all on estagios_teste_lactato for all
  using (
    (select is_platform_admin from current_profile())
    or (
      (select role from current_profile()) = any (array['coach', 'admin'])
      and (select active from current_profile())
      and exists (
        select 1 from avaliacoes_fisiologicas av
        join alunos a on a.id = av.aluno_id
        where av.id = estagios_teste_lactato.avaliacao_id
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
        select 1 from avaliacoes_fisiologicas av
        join alunos a on a.id = av.aluno_id
        where av.id = estagios_teste_lactato.avaliacao_id
          and a.organization_id = (select organization_id from current_profile())
      )
    )
  );
