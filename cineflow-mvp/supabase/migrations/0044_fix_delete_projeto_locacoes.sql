-- ============================================================================
-- Migration 0044 — Fix exclusão de projeto + locações por projeto — 11/06/2026
-- (1) Excluir projeto falhava: trigger refresh_kpis_agenda dispara no DELETE
--     em cascata e reinsere projeto_kpis do projeto sendo apagado → FK error.
-- (2) Locações eram da produtora (org) e apareciam em TODOS os projetos.
-- (3) roteiros.arquivo_path para visualizar o roteiro original na plataforma.
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.
-- ============================================================================

-- 1) Guard no trigger de KPIs: não recalcular se o projeto está sendo excluído
create or replace function public.trg_refresh_proximos_eventos()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_projeto uuid;
begin
  v_projeto := coalesce(new.projeto_id, old.projeto_id);
  if v_projeto is null then
    return coalesce(new, old);
  end if;
  -- projeto já não existe (delete em cascata em andamento) → não recalcular
  if not exists (select 1 from public.projetos where id = v_projeto) then
    return coalesce(new, old);
  end if;
  perform public.populate_proximos_eventos(v_projeto);
  return coalesce(new, old);
end $$;

-- 2) Locações passam a pertencer a um projeto (isolamento total)
alter table public.locacoes add column if not exists projeto_id uuid references public.projetos(id) on delete cascade;
create index if not exists idx_locacoes_projeto on public.locacoes(projeto_id);
-- Locações antigas (projeto_id null) deixam de aparecer nas telas por projeto.

-- 3) Roteiro: guardar o arquivo original para visualização na plataforma
alter table public.roteiros add column if not exists arquivo_path text;
alter table public.roteiros add column if not exists arquivo_nome text;


-- 4) Blindagem na origem: as funções de KPI do 0024 (roteiro %, orçamento %,
--    prazos) também inserem em projeto_kpis durante a cascata da exclusão.
--    Este BEFORE trigger descarta silenciosamente qualquer linha de KPI cujo
--    projeto não exista mais — cobre TODOS os caminhos de uma vez.
create or replace function public.trg_kpis_skip_orfaos()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if not exists (select 1 from public.projetos where id = new.projeto_id) then
    return null; -- projeto em exclusão: ignora o insert/update de KPI
  end if;
  return new;
end $$;

drop trigger if exists kpis_skip_orfaos on public.projeto_kpis;
create trigger kpis_skip_orfaos
  before insert or update on public.projeto_kpis
  for each row execute function public.trg_kpis_skip_orfaos();

notify pgrst, 'reload schema';
