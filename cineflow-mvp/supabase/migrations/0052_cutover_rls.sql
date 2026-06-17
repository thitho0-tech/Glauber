-- ============================================================
-- Migration 0052 — CUTOVER do RLS para o resolver pode()
-- Substitui as policies de ESCRITA org-scoped por checagem via pode().
-- Nomes de policies/tabelas conferidos ao vivo (16/06/2026).
--
-- PRÉ-CONDIÇÃO: perm_funcao_grants populado (Bloco B / 0051). Verificado abaixo.
-- Reads preservados: tabelas sem SELECT próprio ganham policy de SELECT aqui.
-- fornecedores fica de fora (é org-scoped, sem projeto_id).
--
-- APLICAR EM TRANSAÇÃO. Reversível via ROLLBACK enquanto não der COMMIT.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.perm_funcao_grants) = 0 THEN
    RAISE EXCEPTION 'perm_funcao_grants vazio — aplique o seed (0051) antes do cutover';
  END IF;
END $$;

-- ── PROJETOS (insert continua livre; update/delete via pode) ──
DROP POLICY IF EXISTS "projetos update" ON public.projetos;
DROP POLICY IF EXISTS "projetos delete" ON public.projetos;
CREATE POLICY "projetos update pode" ON public.projetos
  FOR UPDATE TO authenticated
  USING (public.pode(id,'projeto','editar')) WITH CHECK (public.pode(id,'projeto','editar'));
CREATE POLICY "projetos delete pode" ON public.projetos
  FOR DELETE TO authenticated
  USING (public.pode(id,'projeto','excluir'));

-- ── DIAS_FILMAGEM (precisa SELECT próprio) ──
DROP POLICY IF EXISTS "dias all" ON public.dias_filmagem;
CREATE POLICY "dias select" ON public.dias_filmagem
  FOR SELECT TO authenticated USING (projeto_id IN (SELECT id FROM public.projetos));
CREATE POLICY "dias write pode" ON public.dias_filmagem
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'cronograma','editar')) WITH CHECK (public.pode(projeto_id,'cronograma','editar'));

-- ── ORDENS_DO_DIA (já tem SELECT) ──
DROP POLICY IF EXISTS "od insert org" ON public.ordens_do_dia;
DROP POLICY IF EXISTS "od update org" ON public.ordens_do_dia;
DROP POLICY IF EXISTS "od delete org" ON public.ordens_do_dia;
CREATE POLICY "od write pode" ON public.ordens_do_dia
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'od','editar')) WITH CHECK (public.pode(projeto_id,'od','editar'));

-- ── PROJETO_PESSOAS (já tem SELECT) ──
DROP POLICY IF EXISTS "projeto_pessoas insert" ON public.projeto_pessoas;
DROP POLICY IF EXISTS "projeto_pessoas update" ON public.projeto_pessoas;
DROP POLICY IF EXISTS "projeto_pessoas delete" ON public.projeto_pessoas;
CREATE POLICY "pp write pode" ON public.projeto_pessoas
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'equipe','editar')) WITH CHECK (public.pode(projeto_id,'equipe','editar'));

-- ── DESPESAS (precisa SELECT próprio) ──
DROP POLICY IF EXISTS "despesas all" ON public.despesas;
CREATE POLICY "despesas select" ON public.despesas
  FOR SELECT TO authenticated USING (projeto_id IN (SELECT id FROM public.projetos));
CREATE POLICY "despesas write pode" ON public.despesas
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'financeiro','criar')) WITH CHECK (public.pode(projeto_id,'financeiro','criar'));

-- ── ROTEIROS (já tem SELECT) ──
DROP POLICY IF EXISTS "roteiros write org" ON public.roteiros;
CREATE POLICY "roteiros write pode" ON public.roteiros
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'roteiro','editar')) WITH CHECK (public.pode(projeto_id,'roteiro','editar'));

-- ── ROTEIRO_CENAS (já tem SELECT; projeto via roteiros) ──
DROP POLICY IF EXISTS "roteiro_cenas write org" ON public.roteiro_cenas;
DROP POLICY IF EXISTS "roteiro_cenas update" ON public.roteiro_cenas;
CREATE POLICY "roteiro_cenas write pode" ON public.roteiro_cenas
  FOR ALL TO authenticated
  USING (public.pode((SELECT projeto_id FROM public.roteiros WHERE id = roteiro_cenas.roteiro_id),'roteiro','editar'))
  WITH CHECK (public.pode((SELECT projeto_id FROM public.roteiros WHERE id = roteiro_cenas.roteiro_id),'roteiro','editar'));

-- ── AGENDA_EVENTOS (já tem SELECT) ──
DROP POLICY IF EXISTS "agenda_eventos_insert" ON public.agenda_eventos;
DROP POLICY IF EXISTS "agenda_eventos_update" ON public.agenda_eventos;
DROP POLICY IF EXISTS "agenda_eventos_delete" ON public.agenda_eventos;
CREATE POLICY "agenda_eventos write pode" ON public.agenda_eventos
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'agenda','editar')) WITH CHECK (public.pode(projeto_id,'agenda','editar'));

-- ── AGENDA_PARTICIPANTES (já tem SELECT; projeto via evento) ──
DROP POLICY IF EXISTS "agenda_participantes_insert" ON public.agenda_participantes;
DROP POLICY IF EXISTS "agenda_participantes_delete" ON public.agenda_participantes;
CREATE POLICY "agenda_part write pode" ON public.agenda_participantes
  FOR ALL TO authenticated
  USING (public.pode((SELECT projeto_id FROM public.agenda_eventos WHERE id = agenda_participantes.evento_id),'agenda','editar'))
  WITH CHECK (public.pode((SELECT projeto_id FROM public.agenda_eventos WHERE id = agenda_participantes.evento_id),'agenda','editar'));

-- ── LOCACOES (precisa SELECT próprio) ──
DROP POLICY IF EXISTS "locacoes all" ON public.locacoes;
CREATE POLICY "locacoes select" ON public.locacoes
  FOR SELECT TO authenticated USING (projeto_id IN (SELECT id FROM public.projetos));
CREATE POLICY "locacoes write pode" ON public.locacoes
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'locacoes','editar')) WITH CHECK (public.pode(projeto_id,'locacoes','editar'));

-- ── FIGURINOS (já tem SELECT) ──
DROP POLICY IF EXISTS "figurinos write org" ON public.figurinos;
CREATE POLICY "figurinos write pode" ON public.figurinos
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'figurino_arte','editar')) WITH CHECK (public.pode(projeto_id,'figurino_arte','editar'));

-- ── ARTE_OBJETOS (já tem SELECT) ──
DROP POLICY IF EXISTS "arte_obj write org" ON public.arte_objetos;
CREATE POLICY "arte_obj write pode" ON public.arte_objetos
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'figurino_arte','editar')) WITH CHECK (public.pode(projeto_id,'figurino_arte','editar'));

-- ── CONTRATOS (já tem SELECT) ──
DROP POLICY IF EXISTS "contratos insert org" ON public.contratos;
DROP POLICY IF EXISTS "contratos update org" ON public.contratos;
DROP POLICY IF EXISTS "contratos delete org" ON public.contratos;
CREATE POLICY "contratos write pode" ON public.contratos
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'contratos','editar')) WITH CHECK (public.pode(projeto_id,'contratos','editar'));

-- ── DECUPAGEM (já tem SELECT; projeto via cena->roteiro) ──
DROP POLICY IF EXISTS "decupagem write org" ON public.decupagem;
CREATE POLICY "decupagem write pode" ON public.decupagem
  FOR ALL TO authenticated
  USING (public.pode((SELECT r.projeto_id FROM public.roteiro_cenas rc JOIN public.roteiros r ON r.id = rc.roteiro_id WHERE rc.id = decupagem.cena_id),'roteiro','editar'))
  WITH CHECK (public.pode((SELECT r.projeto_id FROM public.roteiro_cenas rc JOIN public.roteiros r ON r.id = rc.roteiro_id WHERE rc.id = decupagem.cena_id),'roteiro','editar'));

-- ── PERSONAGENS (já tem SELECT) ── gate por roteiro/editar (fluxo decupagem)
DROP POLICY IF EXISTS "personagens write org" ON public.personagens;
CREATE POLICY "personagens write pode" ON public.personagens
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'roteiro','editar')) WITH CHECK (public.pode(projeto_id,'roteiro','editar'));

-- ── MAPAS_TRANSPORTE (a policy "mapas select" é ALL → precisa SELECT próprio) ──
DROP POLICY IF EXISTS "mapas select" ON public.mapas_transporte;
CREATE POLICY "mapas select" ON public.mapas_transporte
  FOR SELECT TO authenticated USING (projeto_id IN (SELECT id FROM public.projetos));
CREATE POLICY "mapas write pode" ON public.mapas_transporte
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'transporte','editar')) WITH CHECK (public.pode(projeto_id,'transporte','editar'));

-- ── TRANSPORTE_TRECHOS (precisa SELECT próprio; projeto via mapa) ──
DROP POLICY IF EXISTS "trechos all" ON public.transporte_trechos;
CREATE POLICY "trechos select" ON public.transporte_trechos
  FOR SELECT TO authenticated USING (mapa_id IN (SELECT id FROM public.mapas_transporte));
CREATE POLICY "trechos write pode" ON public.transporte_trechos
  FOR ALL TO authenticated
  USING (public.pode((SELECT projeto_id FROM public.mapas_transporte WHERE id = transporte_trechos.mapa_id),'transporte','editar'))
  WITH CHECK (public.pode((SELECT projeto_id FROM public.mapas_transporte WHERE id = transporte_trechos.mapa_id),'transporte','editar'));

-- ── ORCAMENTOS (precisa SELECT próprio) ──
DROP POLICY IF EXISTS "orcamentos all" ON public.orcamentos;
CREATE POLICY "orcamentos select" ON public.orcamentos
  FOR SELECT TO authenticated USING (projeto_id IN (SELECT id FROM public.projetos));
CREATE POLICY "orcamentos write pode" ON public.orcamentos
  FOR ALL TO authenticated
  USING (public.pode(projeto_id,'rubricas','editar')) WITH CHECK (public.pode(projeto_id,'rubricas','editar'));

-- ── LINHAS_ORCAMENTO (precisa SELECT próprio; projeto via orcamento) ──
DROP POLICY IF EXISTS "linhas all" ON public.linhas_orcamento;
CREATE POLICY "linhas select" ON public.linhas_orcamento
  FOR SELECT TO authenticated USING (orcamento_id IN (SELECT id FROM public.orcamentos));
CREATE POLICY "linhas write pode" ON public.linhas_orcamento
  FOR ALL TO authenticated
  USING (public.pode((SELECT projeto_id FROM public.orcamentos WHERE id = linhas_orcamento.orcamento_id),'rubricas','editar'))
  WITH CHECK (public.pode((SELECT projeto_id FROM public.orcamentos WHERE id = linhas_orcamento.orcamento_id),'rubricas','editar'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verificação pós-cutover (rodar separado, logado como usuário de teste):
--   update public.despesas set descricao=descricao where id='<uuid>';  -- deve respeitar pode()
--   select policyname, cmd from pg_policies where schemaname='public' and policyname like '%pode%' order by 1;
