-- ============================================================================
-- Migration 0040 — Seed de canais do chat (Mural) — 11/06/2026
-- O Mural (4B) lista canais mas nada os criava. Cria canal Geral + canais de
-- departamento para projetos existentes e futuros (trigger).
-- APLICAR COLANDO NO SQL EDITOR DO SUPABASE. Idempotente.
-- ============================================================================

-- 1) Backfill: canal GERAL para todos os projetos ativos
insert into public.canais (projeto_id, departamento, nome, tipo)
select p.id, 'geral', 'Geral', 'geral'
from public.projetos p
where p.deleted_at is null
  and not exists (
    select 1 from public.canais c
    where c.projeto_id = p.id and c.departamento = 'geral'
  );

-- 2) Backfill: canais de DEPARTAMENTO (os 7 da planilha + produção)
insert into public.canais (projeto_id, departamento, nome, tipo)
select p.id, d.slug, d.nome, 'departamento'
from public.projetos p
cross join (values
  ('producao',  'Produção'),
  ('roteiro',   'Roteiro'),
  ('direcao',   'Direção'),
  ('arte',      'Arte'),
  ('fotografia','Fotografia'),
  ('som',       'Som'),
  ('elenco',    'Elenco'),
  ('pos',       'Pós-produção')
) as d(slug, nome)
where p.deleted_at is null
  and not exists (
    select 1 from public.canais c
    where c.projeto_id = p.id and c.departamento = d.slug
  );

-- 3) Trigger: novo projeto já nasce com os canais
create or replace function public.trg_projeto_seed_canais()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.canais (projeto_id, departamento, nome, tipo) values
    (new.id, 'geral',      'Geral',         'geral'),
    (new.id, 'producao',   'Produção',      'departamento'),
    (new.id, 'roteiro',    'Roteiro',       'departamento'),
    (new.id, 'direcao',    'Direção',       'departamento'),
    (new.id, 'arte',       'Arte',          'departamento'),
    (new.id, 'fotografia', 'Fotografia',    'departamento'),
    (new.id, 'som',        'Som',           'departamento'),
    (new.id, 'elenco',     'Elenco',        'departamento'),
    (new.id, 'pos',        'Pós-produção',  'departamento')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists projeto_seed_canais on public.projetos;
create trigger projeto_seed_canais
  after insert on public.projetos
  for each row execute function public.trg_projeto_seed_canais();

notify pgrst, 'reload schema';
