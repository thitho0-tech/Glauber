-- ============================================================
-- Migration 0073 — RPC minhas_pendencias (alimenta o bloco de Pendências no Mural)
-- Retorna as APROVAÇÕES pendentes que o usuário CORRENTE pode aprovar:
--   • OD                (od/aprovar)          aprovacao_status = 'pendente'
--   • Figurino          (figurino_arte/aprovar) aprovacao_status = 'pendente'
--   • Objeto de arte    (figurino_arte/aprovar) aprovacao_status = 'pendente'
--   • Proposta locação  (figurino_arte/aprovar) etapa='proposta' + em_analise
-- Ordena por data de geração (as pendências mais antigas primeiro).
-- Confirmação de presença NÃO entra aqui: é marcada no próprio evento no front.
-- SECURITY DEFINER + gate por pode() (que usa auth.uid()). Idempotente.
-- ============================================================
create or replace function public.minhas_pendencias(p_projeto uuid)
returns table (tipo text, titulo text, link text, gerado_em timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with perm as (
    select public.pode(p_projeto, 'od', 'aprovar')            as pode_od,
           public.pode(p_projeto, 'figurino_arte', 'aprovar') as pode_arte
  )
  select 'od'::text,
         coalesce(nullif(o.titulo, ''), 'Ordem do Dia'),
         '/projetos/' || o.projeto_id || '/ordens-do-dia/od/' || o.id,
         o.criado_em
  from public.ordens_do_dia o, perm
  where perm.pode_od
    and o.projeto_id = p_projeto
    and o.deleted_at is null
    and o.aprovacao_status = 'pendente'

  union all
  select 'figurino',
         coalesce(nullif(f.descricao, ''), 'Figurino'),
         '/projetos/' || f.projeto_id || '/figurino-arte',
         f.criado_em
  from public.figurinos f, perm
  where perm.pode_arte
    and f.projeto_id = p_projeto
    and f.aprovacao_status = 'pendente'

  union all
  select 'arte',
         coalesce(nullif(a.descricao, ''), 'Objeto de arte'),
         '/projetos/' || a.projeto_id || '/figurino-arte',
         a.criado_em
  from public.arte_objetos a, perm
  where perm.pode_arte
    and a.projeto_id = p_projeto
    and a.aprovacao_status = 'pendente'

  union all
  select 'locacao',
         coalesce(nullif(l.nome, ''), 'Locação'),
         '/projetos/' || l.projeto_id || '/figurino-arte',
         l.criado_em
  from public.locacoes l, perm
  where perm.pode_arte
    and l.projeto_id = p_projeto
    and l.deleted_at is null
    and l.etapa = 'proposta'
    and l.aprovacao_status = 'em_analise'

  order by 4 asc;
$$;

revoke execute on function public.minhas_pendencias(uuid) from public, anon;
grant  execute on function public.minhas_pendencias(uuid) to authenticated;

notify pgrst, 'reload schema';
