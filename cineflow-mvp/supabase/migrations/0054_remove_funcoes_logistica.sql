-- ============================================================
-- Migration 0054 — Remover do esquema as 3 funções de Logística
--   Gerente Locação/Segurança, Assistente de Locação, Segurança/Vigilância
-- (departamento 'logistica' deixa de existir no catálogo funcoes_av)
-- Defensivo: limpa vínculos antes de apagar. Idempotente.
-- COLAR NO SQL EDITOR DO SUPABASE.
-- ============================================================

-- (Opcional) diagnóstico — rode antes para ver se alguém usa essas funções:
-- select pe.nome, pp.projeto_id
-- from public.projeto_pessoa_funcoes ppf
--   join public.funcoes_av f        on f.id = ppf.funcao_av_id
--   join public.projeto_pessoas pp  on pp.id = ppf.projeto_pessoa_id
--   join public.pessoas pe          on pe.id = pp.pessoa_id
-- where f.codigo in ('gerente_locacao','assistente_locacao','seguranca');

begin;

-- 1. remove vínculos multi-função
delete from public.projeto_pessoa_funcoes
 where funcao_av_id in (select id from public.funcoes_av
   where codigo in ('gerente_locacao','assistente_locacao','seguranca'));

-- 2. zera a função principal de quem porventura tivesse uma delas
update public.projeto_pessoas set funcao_av_id = null
 where funcao_av_id in (select id from public.funcoes_av
   where codigo in ('gerente_locacao','assistente_locacao','seguranca'));

-- 3. remove os grants de permissão dessas funções (também cai por cascade, mas garantimos)
delete from public.perm_funcao_grants
 where funcao_av_id in (select id from public.funcoes_av
   where codigo in ('gerente_locacao','assistente_locacao','seguranca'));

-- 4. remove as funções do catálogo
delete from public.funcoes_av
 where codigo in ('gerente_locacao','assistente_locacao','seguranca');

commit;

-- verificação (deve retornar 0):
-- select count(*) from public.funcoes_av where departamento = 'logistica';
