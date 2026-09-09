-- Suporte a exportação de treino estruturado (.ZWO), contato via WhatsApp e
-- feedback híbrido (treinador + rascunho de IA).

-- Telefone para os links wa.me (treinador <-> aluno) -----------------------

alter table profiles
  add column phone text;

comment on column profiles.phone is 'E.164, ex.: +5584999999999. Usado para montar links wa.me.';

-- Intervalos estruturados do treino, base real para gerar o arquivo .ZWO
-- (aquecimento/tiros/desaquecimento como segmentos com duração e %FTP).
alter table workouts
  add column structured_intervals jsonb;

comment on column workouts.structured_intervals is
  'Array de segmentos [{type: warmup|steady|interval|recovery|cooldown, duration_seconds, target_low_pct, target_high_pct}], %FTP. Usado para gerar o .ZWO.';

-- Feedback híbrido: rascunho gerado por IA (Gemini) + versão final do
-- treinador, exibidos juntos na aba de pós-treino do atleta.
alter table workout_completions
  add column ai_feedback_draft text,
  add column coach_feedback text;

comment on column workout_completions.ai_feedback_draft is
  'Rascunho gerado pela IA (Gemini) a partir do comparativo planejado vs. concluído. Ponto de partida editável pelo treinador, nunca exibido sozinho ao atleta.';
comment on column workout_completions.coach_feedback is
  'Comentário final do treinador (pode ter partido do rascunho de IA). É o que o atleta vê como "Feedback do professor".';
