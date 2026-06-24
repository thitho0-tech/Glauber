-- Migration 0067: Adiciona roteiro_cena_id na od_cenas
-- Permite vincular cenas da OD às cenas do roteiro (roteiro_cenas)
-- INSTRUÇÃO: Colar no SQL Editor do Supabase Dashboard antes de fazer deploy do frontend

ALTER TABLE public.od_cenas
  ADD COLUMN IF NOT EXISTS roteiro_cena_id uuid
    references public.roteiro_cenas(id) on delete set null;

CREATE INDEX IF NOT EXISTS od_cenas_roteiro_cena_idx
  ON public.od_cenas(roteiro_cena_id);

-- Verificação:
-- select column_name from information_schema.columns
--   where table_name = 'od_cenas' and column_name = 'roteiro_cena_id';
