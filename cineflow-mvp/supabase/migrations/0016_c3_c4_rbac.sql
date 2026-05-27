-- ============================================================
-- CINEFLOW - Migration 0016 (C3+C4): RBAC granular por projeto
-- ============================================================
-- Adiciona papel_projeto em projeto_pessoas + helpers para hooks/RLS.
-- Papeis:
--   owner       - criador do projeto (todos os direitos)
--   admin       - co-administrador (todos os direitos exceto excluir projeto)
--   producao    - producao executiva (edita cronograma/financeiro/equipe)
--   departamento- chefe de departamento (edita so seu departamento)
--   leitor      - somente leitura
--
-- Esta migration NAO altera policies existentes; ela cria a base para
-- componentes condicionarem botoes ("se admin, mostra excluir") e para
-- futuras restricoes finer-grained.
-- ============================================================

alter table public.projeto_pessoas
  add column if not exists papel_projeto text;

-- check constraint apenas para valores conhecidos
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'projeto_pessoas_papel_projeto_chk'
  ) then
    alter table public.projeto_pessoas
      add constraint projeto_pessoas_papel_projeto_chk
      check (papel_projeto is null or papel_projeto in ('owner','admin','producao','departamento','leitor'));
  end if;
end $$;

-- Helper: retorna o papel do user atual no projeto
create or replace function public.papel_no_projeto(p_projeto_id uuid)
returns text
language sql security definer set search_path = public, pg_temp as $$
  select case
    when (select criado_por from public.projetos where id = p_projeto_id) = auth.uid()
      then 'owner'
    else (
      select pp.papel_projeto
      from public.projeto_pessoas pp
      join public.pessoas pe on pe.id = pp.pessoa_id
      where pp.projeto_id = p_projeto_id
        and lower(pe.email) = lower((select email from auth.users where id = auth.uid()))
      order by case pp.papel_projeto
        when 'admin' then 1
        when 'producao' then 2
        when 'departamento' then 3
        when 'leitor' then 4
        else 5 end
      limit 1
    )
  end
$$;

grant execute on function public.papel_no_projeto(uuid) to authenticated;

-- Helper: verifica permissao (true se papel suficiente)
-- escala: leitor < departamento < producao < admin < owner
create or replace function public.tem_perm_projeto(p_projeto_id uuid, p_min_papel text)
returns boolean
language sql security definer set search_path = public, pg_temp as $$
  with rank as (
    select case lower(p_min_papel)
      when 'owner' then 1
      when 'admin' then 2
      when 'producao' then 3
      when 'departamento' then 4
      when 'leitor' then 5
      else 6 end as min_rank
  ),
  meu as (
    select case lower(coalesce(public.papel_no_projeto(p_projeto_id), 'leitor'))
      when 'owner' then 1
      when 'admin' then 2
      when 'producao' then 3
      when 'departamento' then 4
      when 'leitor' then 5
      else 6 end as my_rank
  )
  select (select my_rank from meu) <= (select min_rank from rank)
$$;

grant execute on function public.tem_perm_projeto(uuid, text) to authenticated;

-- Verificacao:
--   select public.papel_no_projeto('<uuid-de-um-projeto>');
--   select public.tem_perm_projeto('<uuid>', 'producao');
