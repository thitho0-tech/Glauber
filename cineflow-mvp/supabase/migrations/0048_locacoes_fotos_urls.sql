-- Migration 0048 — fotos_urls para locacoes (scouting Arte)
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.

alter table public.locacoes add column if not exists fotos_urls text[] default '{}';

notify pgrst, 'reload schema';
