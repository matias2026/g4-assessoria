-- Sensação (emoji, 1-5) e observações do feedback pós-treino do aluno —
-- rpe_esforco e concluido já existiam, mas o resto do RpeFeedbackModal
-- nunca tinha onde ser salvo (ficava só no estado local da tela, se
-- perdia ao recarregar/trocar de aparelho).
alter table public.treinos
  add column sensacao smallint check (sensacao between 1 and 5),
  add column comentarios text;
