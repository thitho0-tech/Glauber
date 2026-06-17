-- ============================================================
-- Migration 0053 — Re-seed acesso da aba Produção (Equipe + Locações)
-- Override da matriz: equipe e locacoes passam a valer SÓ p/ listas fixas.
-- Demais sub-abas (financeiro/fornecedores/contratos/prestacao) seguem a matriz.
-- Idempotente. Aplicar APÓS 0051. Não ativa cutover.
-- ============================================================
begin;
delete from public.perm_funcao_grants where codigo_recurso in ('equipe','locacoes');

-- EQUIPE (ver/editar/remover): Prod Geral, Prod Executivo, Dir Produção,
-- Coord Produção, Asst Produção, Diretor, Asst Direção
insert into public.perm_funcao_grants(funcao_av_id,codigo_recurso,acao,conceder)
select f.id,g.rec,g.acao,true from public.funcoes_av f
cross join (values ('equipe','ver'),('equipe','editar'),('equipe','remover')) as g(rec,acao)
where f.id in ('27cd4ffe-dbd3-4957-91a8-75f18fe523ab','954b7f4d-35bf-4dce-bd01-3e687dc86440',
 '0622b87d-e2c8-4e5a-8e63-15a60155b89b','9df1681a-4a22-4023-93b3-412a4bb1bf89',
 '4502c68a-1f41-42ce-bc89-ae8057b3dcf4','e468ca7a-4cea-4445-836d-0835cdc6d97a',
 '6d08218a-b2e1-4a59-9909-8f65ca4f4ada');

-- LOCAÇÕES (ver/editar/excluir): Prod Geral, Prod Executivo, Dir Produção,
-- Coord Produção, Asst Produção, Prod Locações, Motorista Produção
insert into public.perm_funcao_grants(funcao_av_id,codigo_recurso,acao,conceder)
select f.id,g.rec,g.acao,true from public.funcoes_av f
cross join (values ('locacoes','ver'),('locacoes','editar'),('locacoes','excluir')) as g(rec,acao)
where f.id in ('27cd4ffe-dbd3-4957-91a8-75f18fe523ab','954b7f4d-35bf-4dce-bd01-3e687dc86440',
 '0622b87d-e2c8-4e5a-8e63-15a60155b89b','9df1681a-4a22-4023-93b3-412a4bb1bf89',
 '4502c68a-1f41-42ce-bc89-ae8057b3dcf4','d3f44beb-eac0-4849-9bca-cc69f7b072c5',
 'bc08c6c1-2d04-4f78-be0f-6a58960ca7f2');

notify pgrst,'reload schema';
commit;

-- Verificação:
-- select codigo_recurso, count(*) from public.perm_funcao_grants
--   where codigo_recurso in ('equipe','locacoes') group by 1;  -- equipe=21 (7x3), locacoes=21 (7x3)
