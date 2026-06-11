-- ============================================================================
-- Migration 0046 — remove trigger antigo de canais — 12/06/2026
-- Causa-raiz do erro ao criar projeto: trg_criar_canais_padrao (0009) usa
-- ON CONFLICT (projeto_id, departamento), mas a 0039 trocou essa unique por
-- índice PARCIAL (p/ DMs) — índice parcial não serve de árbitro → 400 no rpc.
-- O trigger projeto_seed_canais (0040) já cria os 9 canais; o antigo sai.
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.
-- ============================================================================

drop trigger if exists criar_canais_padrao on public.projetos;
drop function if exists public.trg_criar_canais_padrao();

notify pgrst, 'reload schema';
