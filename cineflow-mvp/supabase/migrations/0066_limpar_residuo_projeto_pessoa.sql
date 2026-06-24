-- 0066: Ao soft-deletar um vínculo (projeto_pessoas.deleted_at), limpar os
-- registros derivados presos a esse vínculo: função antiga, confirmações de
-- evento, escalas, check-ins, overrides de permissão. Resolve o resíduo de
-- "pessoa re-adicionada com a função/confirmações antigas".

create or replace function public.limpar_residuo_projeto_pessoa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.agenda_participantes    where projeto_pessoa_id = new.id;
    delete from public.escalas                  where projeto_pessoa_id = new.id;
    delete from public.check_ins                where projeto_pessoa_id = new.id;
    delete from public.perm_overrides           where projeto_pessoa_id = new.id;
    delete from public.projeto_pessoa_funcoes   where projeto_pessoa_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.limpar_residuo_projeto_pessoa() from public, anon, authenticated;

drop trigger if exists trg_limpar_residuo_pp on public.projeto_pessoas;
create trigger trg_limpar_residuo_pp
  after update on public.projeto_pessoas
  for each row execute function public.limpar_residuo_projeto_pessoa();

-- Backfill: limpa o resíduo já existente dos vínculos soft-deletados.
delete from public.agenda_participantes ap using public.projeto_pessoas pp
  where ap.projeto_pessoa_id = pp.id and pp.deleted_at is not null;
delete from public.escalas e using public.projeto_pessoas pp
  where e.projeto_pessoa_id = pp.id and pp.deleted_at is not null;
delete from public.check_ins c using public.projeto_pessoas pp
  where c.projeto_pessoa_id = pp.id and pp.deleted_at is not null;
delete from public.perm_overrides po using public.projeto_pessoas pp
  where po.projeto_pessoa_id = pp.id and pp.deleted_at is not null;
delete from public.projeto_pessoa_funcoes f using public.projeto_pessoas pp
  where f.projeto_pessoa_id = pp.id and pp.deleted_at is not null;
