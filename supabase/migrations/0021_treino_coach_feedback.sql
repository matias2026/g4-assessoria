-- O composer de feedback com IA (AiFeedbackComposer.tsx) nunca persistia
-- nada — só atualizava o texto na tela ("Enviado ✓" era só um estado local
-- que sumia ao recarregar). Sem essas colunas o feedback do treinador nunca
-- chegava de verdade pro aluno.
alter table treinos
  add column if not exists coach_feedback text,
  add column if not exists ai_feedback_draft text;
