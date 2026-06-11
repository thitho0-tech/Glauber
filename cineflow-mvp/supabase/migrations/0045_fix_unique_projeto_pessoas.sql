-- ============================================================================
-- Migration 0045 — restaura unique de projeto_pessoas — 12/06/2026
-- "there is no unique or exclusion constraint matching the ON CONFLICT
--  specification" ao criar projeto: o rpc criar_projeto_com_equipe usa
--  ON CONFLICT (projeto_id, pessoa_id) e o índice único sumiu do banco.
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.
-- ============================================================================

-- 1) Remove duplicados, se houver (tabela deve estar vazia após o reset)
delete from public.projeto_pessoas a
using public.projeto_pessoas b
where a.projeto_id = b.projeto_id
  and a.pessoa_id = b.pessoa_id
  and a.id > b.id;

-- 2) Recria o índice único que serve de árbitro para o ON CONFLICT
create unique index if not exists projeto_pessoas_projeto_id_pessoa_id_key
  on public.projeto_pessoas (projeto_id, pessoa_id);

-- 3) Diagnóstico: deve listar o índice acima entre os resultados
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'projeto_pessoas';

notify pgrst, 'reload schema';
