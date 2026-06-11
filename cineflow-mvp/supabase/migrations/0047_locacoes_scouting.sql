-- ============================================================================
-- Migration 0047 — Scouting de locações (Arte → Diretor → Produção) — 12/06
-- Fluxo: Arte cadastra PROPOSTA com fotos → Diretor avalia/aprova → Produção
-- promove a OFICIAL preenchendo os dados completos. Mesma tabela locacoes.
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.
-- ============================================================================

alter table public.locacoes add column if not exists etapa text not null default 'oficial';
  -- 'proposta'  = scouting da Arte (aparece só no catálogo da Arte)
  -- 'oficial'   = locação efetivada (aparece na página Locações da Produção)

alter table public.locacoes add column if not exists aprovacao_status text default 'em_analise';
  -- em_analise | aprovada | rejeitada   (avaliação do Diretor sobre a proposta)

alter table public.locacoes add column if not exists aprovacao_comentarios text;
alter table public.locacoes add column if not exists proposta_por text;  -- nome de quem propôs

create index if not exists idx_locacoes_etapa on public.locacoes(projeto_id, etapa);

notify pgrst, 'reload schema';
