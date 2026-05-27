-- ============================================================
-- CINEFLOW — Migration 0006 (B4): Escalas vinculadas a projeto_pessoas
-- ============================================================
-- Adiciona projeto_pessoa_id em escalas para que uma escala
-- aponte para a função/cachê DAQUELE projeto (não só pra pessoa do catálogo).
-- pessoa_id continua existindo para compatibilidade.
-- ============================================================

alter table public.escalas
  add column if not exists projeto_pessoa_id uuid references public.projeto_pessoas(id) on delete set null;

create index if not exists escalas_projeto_pessoa_idx on public.escalas(projeto_pessoa_id);

-- Backfill: para cada escala existente, tenta achar a projeto_pessoa
-- correspondente (mesma pessoa + projeto do dia)
update public.escalas e
set projeto_pessoa_id = pp.id
from public.dias_filmagem d, public.projeto_pessoas pp
where e.dia_id = d.id
  and pp.projeto_id = d.projeto_id
  and pp.pessoa_id = e.pessoa_id
  and e.projeto_pessoa_id is null;

-- ============================================================
-- Verificação:
--   select count(*) as total, count(projeto_pessoa_id) as com_projeto_pessoa from public.escalas;
-- ============================================================
