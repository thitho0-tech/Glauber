-- ============================================================
-- Migration 0059 — OD: re-notificar aprovadores no REENVIO
-- O gatilho de alerta passa a disparar também quando aprovacao_status volta
-- para 'pendente' (ex.: OD rejeitada reeditada e reenviada).
-- Colar no SQL Editor. Idempotente.
-- ============================================================
begin;

create or replace function public.trg_notificar_od_pendente() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if NEW.aprovacao_status = 'pendente'
     and (TG_OP = 'INSERT' or coalesce(OLD.aprovacao_status,'') <> 'pendente') then
    insert into public.notificacoes_inapp (user_id, tipo, titulo, mensagem, link)
    select distinct au.id, 'od_aprovacao',
           'OD aguardando aprovação',
           coalesce(NEW.titulo,'Ordem do Dia'),
           '/projetos/'||NEW.projeto_id||'/ordens-do-dia/od/'||NEW.id
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    join auth.users au on lower(au.email) = lower(pe.email)
    join public.projeto_pessoa_funcoes ppf on ppf.projeto_pessoa_id = pp.id
    join public.perm_funcao_grants g on g.funcao_av_id = ppf.funcao_av_id
    where pp.projeto_id = NEW.projeto_id
      and pp.deleted_at is null
      and g.codigo_recurso = 'od' and g.acao = 'aprovar' and g.conceder = true;
  end if;
  return NEW;
end$$;
revoke execute on function public.trg_notificar_od_pendente() from public, anon, authenticated;

drop trigger if exists od_pendente_notifica on public.ordens_do_dia;
create trigger od_pendente_notifica
  after insert or update of aprovacao_status on public.ordens_do_dia
  for each row execute function public.trg_notificar_od_pendente();

notify pgrst,'reload schema';
commit;
