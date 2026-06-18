-- ============================================================
-- Migration 0060
-- (A) FIX exclusão/restauração: soft_delete_item e restore_item exigiam
--     criado_por = auth.uid() (só o dono). Agora usam o motor pode(), assim
--     quem tem permissão (ex.: produção em od/editar) consegue excluir/restaurar.
--     → conserta "OD excluída não vai para a lixeira".
-- (B) Decupagem: vínculo de cena (roteiro_cena_id) em figurinos/arte_objetos/locacoes.
-- (C) Housekeeping: corrige a policy de escrita da tabela `decupagem` (planos),
--     que no cutover 0052 fazia join errado (roteiro_cenas em vez de od_cenas).
-- Colar no SQL Editor. Idempotente. Em transação.
-- ============================================================
begin;

-- ── (A) soft_delete_item via pode() ──
create or replace function public.soft_delete_item(p_tabela text, p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_tabela = 'projetos' then
    update public.projetos set deleted_at = now() where id = p_id and public.pode(id,'projeto','excluir');
  elsif p_tabela = 'despesas' then
    update public.despesas set deleted_at = now() where id = p_id and public.pode(projeto_id,'financeiro','criar');
  elsif p_tabela = 'dias_filmagem' then
    update public.dias_filmagem set deleted_at = now() where id = p_id and public.pode(projeto_id,'cronograma','editar');
  elsif p_tabela = 'ordens_do_dia' then
    update public.ordens_do_dia set deleted_at = now() where id = p_id and public.pode(projeto_id,'od','editar');
  elsif p_tabela = 'projeto_pessoas' then
    update public.projeto_pessoas set deleted_at = now() where id = p_id and public.pode(projeto_id,'equipe','editar');
  elsif p_tabela = 'locacoes' then
    update public.locacoes set deleted_at = now() where id = p_id and public.pode(projeto_id,'locacoes','editar');
  end if;
end$$;

-- ── (A) restore_item via pode() ──
create or replace function public.restore_item(p_tabela text, p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_tabela = 'projetos' then
    update public.projetos set deleted_at = null where id = p_id and public.pode(id,'projeto','excluir');
  elsif p_tabela = 'despesas' then
    update public.despesas set deleted_at = null where id = p_id and public.pode(projeto_id,'financeiro','criar');
  elsif p_tabela = 'dias_filmagem' then
    update public.dias_filmagem set deleted_at = null where id = p_id and public.pode(projeto_id,'cronograma','editar');
  elsif p_tabela = 'ordens_do_dia' then
    update public.ordens_do_dia set deleted_at = null where id = p_id and public.pode(projeto_id,'od','editar');
  elsif p_tabela = 'projeto_pessoas' then
    update public.projeto_pessoas set deleted_at = null where id = p_id and public.pode(projeto_id,'equipe','editar');
  elsif p_tabela = 'locacoes' then
    update public.locacoes set deleted_at = null where id = p_id and public.pode(projeto_id,'locacoes','editar');
  end if;
end$$;

-- ── (B) vínculo de cena da decupagem nos módulos ──
alter table public.figurinos    add column if not exists roteiro_cena_id uuid references public.roteiro_cenas(id) on delete set null;
alter table public.arte_objetos  add column if not exists roteiro_cena_id uuid references public.roteiro_cenas(id) on delete set null;
alter table public.locacoes      add column if not exists roteiro_cena_id uuid references public.roteiro_cenas(id) on delete set null;
create index if not exists idx_figurinos_cena   on public.figurinos(roteiro_cena_id);
create index if not exists idx_arte_obj_cena    on public.arte_objetos(roteiro_cena_id);
create index if not exists idx_locacoes_cena    on public.locacoes(roteiro_cena_id);

-- ── (C) corrige policy da tabela decupagem (planos) — join via od_cenas ──
drop policy if exists "decupagem write pode" on public.decupagem;
create policy "decupagem write pode" on public.decupagem for all to authenticated
  using (public.pode(
    (select od.projeto_id from public.od_cenas c join public.ordens_do_dia od on od.id = c.od_id where c.id = decupagem.cena_id),
    'roteiro','editar'))
  with check (public.pode(
    (select od.projeto_id from public.od_cenas c join public.ordens_do_dia od on od.id = c.od_id where c.id = decupagem.cena_id),
    'roteiro','editar'));

notify pgrst,'reload schema';
commit;
