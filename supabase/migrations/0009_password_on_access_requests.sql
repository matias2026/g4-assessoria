-- A pessoa agora escolhe a própria senha ao pedir acesso, em vez do admin
-- gerar uma provisória na aprovação. Fica em texto puro até a aprovação
-- (quando vira a senha real da conta no Supabase Auth) — aceitável porque
-- esta tabela já não tem nenhuma policy de RLS (só a service role lê/
-- escreve, nunca o navegador direto, ver 0008_add_access_requests.sql).
-- Mesmo assim, a senha é apagada logo depois de usada (aprovação ou
-- negação) pra não ficar guardada à toa.
alter table public.access_requests add column password text;
