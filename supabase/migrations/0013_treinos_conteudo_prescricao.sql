-- treinos existia desde o início do schema TrainingPeaks (RLS já cobre
-- coach/admin gerenciar tudo e o aluno ler/atualizar só o próprio), mas
-- nenhum código do app gravava nele — a prescrição ficava só em memória
-- no Cockpit (CockpitTabs), então nunca chegava de verdade no painel do
-- aluno. titulo/conteudo guardam o suficiente pra reconstruir o treino
-- prescrito (prescrição, blocos estruturados, sessões de exercício,
-- zonas de potência e métricas planejadas) sem precisar de mais uma
-- dúzia de colunas tipadas.
alter table public.treinos
  add column titulo text,
  add column conteudo jsonb not null default '{}'::jsonb;

-- Um treino prescrito por dia por aluno — a tela de prescrição (e a
-- página do aluno) sempre trabalham em cima do "treino de hoje", nunca
-- múltiplos por dia. Salvar de novo no mesmo dia atualiza em vez de
-- duplicar.
alter table public.treinos
  add constraint treinos_aluno_data_unique unique (aluno_id, data);
