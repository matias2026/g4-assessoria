-- exercise_library_name_key era único pro nome inteiro da plataforma —
-- duas organizações não conseguiriam ter cada uma o próprio exercício
-- "Agachamento" na biblioteca. Único por organização agora.
alter table exercise_library drop constraint if exists exercise_library_name_key;
create unique index if not exists exercise_library_org_name_key on exercise_library (organization_id, name);
