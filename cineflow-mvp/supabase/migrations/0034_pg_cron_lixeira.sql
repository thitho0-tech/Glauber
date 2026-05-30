-- ============================================================
-- Migration 0034 — pg_cron: purge automático da lixeira (30d)
-- Sprint 2A
-- ============================================================
-- PRÉ-REQUISITO: Ativar pg_cron ANTES de rodar este SQL.
--   Supabase Dashboard → Settings → Database → Extensions
--   → Procurar "pg_cron" → Enable
--
-- Depois de ativar a extensão, rodar este arquivo no SQL Editor.
-- Se tentar rodar antes de ativar, vai receber erro:
--   "schema cron does not exist"
-- ============================================================

-- Remover job anterior se existir (evita duplicatas)
select cron.unschedule('limpar-lixeira-30d') 
where exists (
  select 1 from cron.job where jobname = 'limpar-lixeira-30d'
);

-- Criar job: todo dia à meia-noite (horário do servidor Supabase)
select cron.schedule(
  'limpar-lixeira-30d',
  '0 0 * * *',
  $$
    -- Purge de projetos marcados como deletados há mais de 30 dias
    delete from public.projetos
    where deleted_at < now() - interval '30 days';

    -- Purge de despesas
    delete from public.despesas
    where deleted_at < now() - interval '30 days';

    -- Purge de dias de filmagem
    delete from public.dias_filmagem
    where deleted_at < now() - interval '30 days';

    -- Purge de ordens do dia
    delete from public.ordens_do_dia
    where deleted_at < now() - interval '30 days';

    -- Purge de membros removidos do projeto
    delete from public.projeto_pessoas
    where deleted_at < now() - interval '30 days';

    -- Purge de locações
    delete from public.locacoes
    where deleted_at < now() - interval '30 days';
  $$
);

-- Verificação após rodar:
-- select jobname, schedule, active from cron.job;
-- Esperado: limpar-lixeira-30d | 0 0 * * * | true
