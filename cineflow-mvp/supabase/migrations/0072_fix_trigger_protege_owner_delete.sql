-- ============================================================
-- 0072 — Fix trigger trg_protege_owner_pp
-- APLICADA EM PRODUÇÃO em 02/07/2026 via MCP (Cowork).
--
-- Bug: BEFORE DELETE retornava NEW (que é NULL em DELETE) =>
-- TODO delete em projeto_pessoas era silenciosamente ignorado.
-- Foi a origem de 52 registros órfãos de projetos excluídos.
-- ============================================================
create or replace function public.trg_protege_owner_pp()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if exists (select 1 from public.projetos p join public.pessoas pe on pe.id = OLD.pessoa_id
             where p.id = OLD.projeto_id
               and lower(pe.email) = lower((select email from auth.users where id = p.criado_por))) then
    if TG_OP='DELETE' then
      raise exception 'O criador do projeto não pode ser removido da equipe';
    elsif TG_OP='UPDATE' and NEW.deleted_at is not null and OLD.deleted_at is null then
      raise exception 'O criador do projeto não pode ser removido da equipe';
    end if;
  end if;
  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end$function$;
