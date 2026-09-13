-- Upload manual de arquivo .FIT pelo aluno: guarda o arquivo bruto (Storage,
-- pra reprocessar/baixar depois se precisar) e o resumo+amostras já
-- decodificados (jsonb, mesmo padrão de conteudo/rascunho) pra alimentar os
-- gráficos da aba "Analisar treino do aluno" sem reprocessar o binário toda
-- vez que a tela carrega.
alter table public.treinos
  add column arquivo_fit_path text,
  add column atividade_fit jsonb;

insert into storage.buckets (id, name, public)
values ('fit-uploads', 'fit-uploads', false)
on conflict (id) do nothing;

-- Bucket privado — só a service role (usada nas Server Actions) lê/escreve.
-- Mesmo padrão de access_requests/aluno_notes: RLS sem policy nenhuma pro
-- aluno, então nem uma chamada direta via API REST com o token dele
-- alcança os arquivos de outra pessoa (nem os dele, na real — tudo passa
-- pelo servidor).
create policy "fit_uploads_service_role_only"
  on storage.objects for all
  using (bucket_id = 'fit-uploads' and auth.role() = 'service_role')
  with check (bucket_id = 'fit-uploads' and auth.role() = 'service_role');
