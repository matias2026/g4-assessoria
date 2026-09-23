-- Completa o módulo de avaliação fisiológica (era só o registro manual em
-- 0026): parecer gerado por IA (rascunho + versão final editada pelo
-- treinador, mesmo padrão de treinos.ai_feedback_draft/coach_feedback),
-- HRV de repouso digitado manualmente (não computado — o app não tem
-- nenhuma fonte de RR intervals/sinal bruto pra calcular isso de verdade)
-- e auditoria de quando os limiares foram aplicados à ficha do aluno.
alter table avaliacoes_fisiologicas
  add column if not exists ai_report_draft text,
  add column if not exists ai_report_final text,
  add column if not exists hrv_rmssd_rest numeric,
  add column if not exists hrv_sdnn_rest numeric,
  add column if not exists hrv_notes text,
  add column if not exists applied_to_ficha_at timestamptz,
  -- Mesmo espírito de treinos.enviado: a avaliação nasce como rascunho do
  -- treinador (ele ainda está digitando estágios, revisando o parecer da
  -- IA) e só fica visível pro aluno quando ele decide publicar. Sem isso,
  -- o aluno veria uma avaliação pela metade, com parecer de IA ainda não
  -- revisado.
  add column if not exists published boolean not null default false;

-- Visibilidade pro atleta (só leitura, e só quando publicada) — não
-- existia nenhuma policy pro papel athlete de propósito na 0026.
create policy avaliacoes_fisiologicas_athlete_select on avaliacoes_fisiologicas for select
  using (
    published
    and exists (
      select 1 from alunos a
      where a.id = avaliacoes_fisiologicas.aluno_id
        and a.user_id = auth.uid()
    )
  );

create policy estagios_teste_lactato_athlete_select on estagios_teste_lactato for select
  using (
    exists (
      select 1 from avaliacoes_fisiologicas av
      join alunos a on a.id = av.aluno_id
      where av.id = estagios_teste_lactato.avaliacao_id
        and av.published
        and a.user_id = auth.uid()
    )
  );
