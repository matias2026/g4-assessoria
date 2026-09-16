-- O trigger enforce_athlete_cap contava atletas da plataforma inteira —
-- com mais de uma organização, a assessoria B ficaria travada por causa
-- do volume de atletas da assessoria A. O limite de 50 é por organização.
create or replace function enforce_athlete_cap()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'athlete' then
    if (
      select count(*) from public.profiles
      where role = 'athlete' and organization_id = new.organization_id
    ) >= 50 then
      raise exception 'Limite de 50 atletas cadastrados atingido.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
