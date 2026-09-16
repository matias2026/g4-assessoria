-- slug curto e único pra URL de cadastro por organização
-- (/login?org=<slug>) — sem isso não dá pra distinguir pra qual
-- assessoria um link de "Criar conta" aponta.
alter table organizations add column if not exists slug text;

update organizations set slug = 'g4' where slug is null and name = 'G4 Assessoria Esportiva';
update organizations set slug = 'org-' || substr(id::text, 1, 8) where slug is null;

alter table organizations alter column slug set not null;
create unique index if not exists organizations_slug_key on organizations (slug);
