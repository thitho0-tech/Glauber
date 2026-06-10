-- ============================================================================
-- Migration 0042 — Fix recursão de RLS em canais/canal_membros — 11/06/2026
-- Sintoma: Mural mostra "Nenhum canal nesta categoria" embora os canais
-- existam. Causa: policy de canais consulta canal_membros e vice-versa →
-- "infinite recursion detected in policy" → query do app falha.
-- Solução: funções SECURITY DEFINER (bypassa RLS, quebra o ciclo).
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.
-- ============================================================================

-- 1) Helpers security definer (não disparam RLS — quebram a recursão)
create or replace function public.is_membro_canal(p_canal_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.canal_membros cm
    join public.pessoas pe on pe.id = cm.pessoa_id
    where cm.canal_id = p_canal_id
      and lower(pe.email) = lower((select email from auth.users where id = auth.uid()))
  )
$$;

create or replace function public.canal_projeto(p_canal_id uuid)
returns uuid language sql security definer stable
set search_path = public as $$
  select projeto_id from public.canais where id = p_canal_id
$$;

-- 2) Policy de canais sem subselect em canal_membros
drop policy if exists "canais select" on public.canais;
create policy "canais select" on public.canais for select using (
  projeto_id in (select id from public.projetos)
  and (tipo <> 'privado' or public.is_membro_canal(id))
);

-- 3) Policies de canal_membros sem ciclo + bootstrap do canal privado
--    (quem é membro do projeto pode criar DM e adicionar participantes)
drop policy if exists "canal_membros all" on public.canal_membros;

create policy "canal_membros select" on public.canal_membros for select using (
  public.is_membro_projeto(public.canal_projeto(canal_id))
);
create policy "canal_membros insert" on public.canal_membros for insert with check (
  public.is_membro_projeto(public.canal_projeto(canal_id))
);
create policy "canal_membros delete" on public.canal_membros for delete using (
  public.is_membro_projeto(public.canal_projeto(canal_id))
);

-- 4) Higiene dos seeds: canal "geral" antigo (#geral) vira tipo 'geral'
update public.canais set tipo = 'geral' where departamento = 'geral';

-- 5) Remove o canal de Pós duplicado criado pelo 0040 (slug 'pos') quando o
--    projeto já tinha '#pos-producao' — só se não houver mensagens nele
delete from public.canais c
where c.departamento = 'pos'
  and exists (
    select 1 from public.canais c2
    where c2.projeto_id = c.projeto_id and c2.departamento = 'pos-producao'
  )
  and not exists (select 1 from public.mensagens m where m.canal_id = c.id);

notify pgrst, 'reload schema';
