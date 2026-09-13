-- Separa "salvar" (rascunho, só o treinador vê) de "enviar" (publica pro
-- aluno). Sem isso, todo "Salvar prescrição" já ficava visível pro aluno
-- na hora, sem o treinador poder ajustar antes de mandar de verdade.
alter table public.treinos
  add column rascunho jsonb not null default '{}'::jsonb,
  add column enviado boolean not null default false;
