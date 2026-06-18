-- ============================================================
-- Migration 0057 — C2: Editar OD publicada + selo "ATUALIZADA"
-- - coluna atualizada_em em ordens_do_dia (marca re-publicação)
-- - RPC notificar_od_atualizada (re-notifica a equipe; tipo 'od_atualizada')
-- Editar OD publicada NÃO exige nova aprovação (decisão 17/06): versão++,
-- selo, re-notifica. RLS já permite (policy editar OR aprovar, 0056).
-- Colar no SQL Editor. Idempotente. Em transação.
-- ============================================================
begin;

alter table public.ordens_do_dia add column if not exists atualizada_em timestamptz;

create or replace function public.notificar_od_atualizada(
  p_od_id uuid, p_projeto_id uuid, p_titulo_od text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_membro record; v_link text;
begin
  v_link := '/projetos/'||p_projeto_id||'/ordens-do-dia/od/'||p_od_id;
  for v_membro in
    select au.id as user_id
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    join auth.users au on lower(au.email) = lower(pe.email)
    where pp.projeto_id = p_projeto_id
      and pp.notif_od_inapp = true
      and pp.deleted_at is null
  loop
    insert into public.notificacoes_inapp (user_id, tipo, titulo, mensagem, link)
    values (v_membro.user_id, 'od_atualizada', 'Ordem do Dia atualizada', p_titulo_od, v_link);
  end loop;
end$$;
revoke execute on function public.notificar_od_atualizada(uuid, uuid, text) from public, anon;
grant  execute on function public.notificar_od_atualizada(uuid, uuid, text) to authenticated;

notify pgrst,'reload schema';
commit;
