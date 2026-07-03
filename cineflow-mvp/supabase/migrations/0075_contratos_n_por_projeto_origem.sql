-- 0075_contratos_n_por_projeto_origem.sql
-- Habilita N contratos por projeto e distingue contrato upado de formulado.
--
-- Causa-raiz do erro "duplicate key value violates unique constraint
-- contratos_projeto_id_key": a tabela contratos herdou UNIQUE(projeto_id)
-- do desenho antigo (migration 0012, 1 contrato por projeto). A 0074 passou
-- a permitir N contratos no front, mas o UNIQUE continuou barrando o 2º insert.
-- O índice de leitura por projeto já existe (idx_contratos_projeto, criado na
-- 0074), então remover o UNIQUE não afeta performance das queries da lista.
--
-- origem: 'formulario' (contrato montado no formulário interno) x
--         'upload' (contrato pronto/assinado anexado de fora — fonte de
--          verdade é o PDF; não exige preenchimento completo do formulário).

alter table public.contratos drop constraint if exists contratos_projeto_id_key;

alter table public.contratos add column if not exists origem text not null default 'formulario';
alter table public.contratos drop constraint if exists contratos_origem_check;
alter table public.contratos add constraint contratos_origem_check
  check (origem in ('formulario','upload'));
