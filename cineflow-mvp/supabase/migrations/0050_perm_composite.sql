-- ============================================================
-- Migration 0050 — BLOCO A: Permissões Composite (Sprint 5)
--
-- Cria as 3 tabelas do modelo composite + o resolver pode() +
-- a função auxiliar project_owner_email().
--
-- O que NÃO acontece aqui:
--   • Políticas de escrita (INSERT/UPDATE/DELETE) NÃO são
--     alteradas. O "cutover" está COMENTADO no final e só deve
--     ser aplicado junto com o seed de grants (Bloco B).
--   • Sem seed de dados em perm_recursos nem perm_funcao_grants
--     (isso é Bloco B).
--
-- APLICAR COLANDO NO SQL EDITOR DO SUPABASE.
-- NUNCA via `supabase db push`.
-- Idempotente (todos os blocos usam IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── 1. TABELAS ───────────────────────────────────────────────

-- Catálogo de recursos e ações do sistema
CREATE TABLE IF NOT EXISTS public.perm_recursos (
  codigo     text PRIMARY KEY,
  modulo     text NOT NULL,
  acao       text NOT NULL,
  descricao  text
);

-- Camada base: grant por função audiovisual
-- Seed desta tabela = Bloco B (matriz Função × Funcionalidade)
CREATE TABLE IF NOT EXISTS public.perm_funcao_grants (
  funcao_av_id    uuid    NOT NULL REFERENCES public.funcoes_av(id)          ON DELETE CASCADE,
  codigo_recurso  text    NOT NULL REFERENCES public.perm_recursos(codigo)   ON DELETE CASCADE,
  acao            text    NOT NULL,
  conceder        boolean NOT NULL DEFAULT true,
  PRIMARY KEY (funcao_av_id, codigo_recurso, acao)
);

-- Exceções individuais por membro do projeto
-- efeito DENY  → nega mesmo que a função conceda
-- efeito ALLOW → concede mesmo que a função não tenha grant
CREATE TABLE IF NOT EXISTS public.perm_overrides (
  projeto_pessoa_id uuid NOT NULL REFERENCES public.projeto_pessoas(id)     ON DELETE CASCADE,
  codigo_recurso    text NOT NULL REFERENCES public.perm_recursos(codigo)   ON DELETE CASCADE,
  acao              text NOT NULL,
  efeito            text NOT NULL,
  PRIMARY KEY (projeto_pessoa_id, codigo_recurso, acao),
  CONSTRAINT perm_overrides_efeito_chk CHECK (efeito IN ('ALLOW', 'DENY'))
);

-- Índices de suporte ao resolver
CREATE INDEX IF NOT EXISTS idx_pfg_funcao_recurso
  ON public.perm_funcao_grants (funcao_av_id, codigo_recurso, acao);

CREATE INDEX IF NOT EXISTS idx_pov_pp_recurso
  ON public.perm_overrides (projeto_pessoa_id, codigo_recurso, acao);

-- ── 2. RLS — somente leitura para authenticated ──────────────
-- Escrita (INSERT/UPDATE/DELETE) via service role apenas (Bloco B seed).

ALTER TABLE public.perm_recursos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perm_funcao_grants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perm_overrides     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perm_recursos_sel"      ON public.perm_recursos;
DROP POLICY IF EXISTS "perm_funcao_grants_sel"  ON public.perm_funcao_grants;
DROP POLICY IF EXISTS "perm_overrides_sel"      ON public.perm_overrides;

CREATE POLICY "perm_recursos_sel"
  ON public.perm_recursos FOR SELECT TO authenticated USING (true);

CREATE POLICY "perm_funcao_grants_sel"
  ON public.perm_funcao_grants FOR SELECT TO authenticated USING (true);

CREATE POLICY "perm_overrides_sel"
  ON public.perm_overrides FOR SELECT TO authenticated USING (true);

-- ── 3. AUXILIAR: email do criador do projeto ─────────────────
-- Usado pelo front para identificar a linha do owner no painel
-- de Autorizações (Settings.tsx) sem expor auth.users diretamente.

CREATE OR REPLACE FUNCTION public.project_owner_email(p_projeto uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.projetos p ON p.criado_por = u.id
  WHERE p.id = p_projeto
$$;

GRANT EXECUTE ON FUNCTION public.project_owner_email(uuid) TO authenticated;

-- ── 4. RESOLVER PRINCIPAL ────────────────────────────────────
--
-- Precedência (deny-by-default):
--   1. OWNER (projetos.criado_por = auth.uid())      → true
--   2. Override DENY individual                       → false
--   3. Override ALLOW individual                      → true
--   4. Grant por função (perm_funcao_grants)          → true
--   5. Padrão                                         → false
--
-- SECURITY DEFINER: lê projetos, projeto_pessoas, pessoas e
-- auth.users sem disparar RLS das tabelas consultadas.
-- O set search_path evita substituição de schema.

CREATE OR REPLACE FUNCTION public.pode(
  p_projeto uuid,
  p_recurso text,
  p_acao    text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner  uuid;
  v_pp_id  uuid;
BEGIN
  -- Requisição não autenticada → nega imediatamente
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- 1. OWNER: criado_por = auth.uid() → sempre true
  SELECT criado_por INTO v_owner
  FROM public.projetos
  WHERE id = p_projeto;

  IF v_owner = auth.uid() THEN
    RETURN true;
  END IF;

  -- Localiza o projeto_pessoa do usuário corrente neste projeto
  -- (vínculo via email — mesma lógica de papel_no_projeto/0016)
  SELECT pp.id INTO v_pp_id
  FROM public.projeto_pessoas pp
  JOIN public.pessoas pe ON pe.id = pp.pessoa_id
  WHERE pp.projeto_id = p_projeto
    AND lower(pe.email) = lower(
          (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    AND pp.deleted_at IS NULL
  LIMIT 1;

  -- Não é membro → negado
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 2. Override DENY → false
  PERFORM 1
  FROM public.perm_overrides
  WHERE projeto_pessoa_id = v_pp_id
    AND codigo_recurso = p_recurso
    AND acao = p_acao
    AND efeito = 'DENY';

  IF FOUND THEN RETURN false; END IF;

  -- 3. Override ALLOW → true
  PERFORM 1
  FROM public.perm_overrides
  WHERE projeto_pessoa_id = v_pp_id
    AND codigo_recurso = p_recurso
    AND acao = p_acao
    AND efeito = 'ALLOW';

  IF FOUND THEN RETURN true; END IF;

  -- 4. Grant por função (projeto_pessoa_funcoes → perm_funcao_grants)
  PERFORM 1
  FROM public.projeto_pessoa_funcoes ppf
  JOIN public.perm_funcao_grants pfg
    ON pfg.funcao_av_id = ppf.funcao_av_id
  WHERE ppf.projeto_pessoa_id = v_pp_id
    AND pfg.codigo_recurso    = p_recurso
    AND pfg.acao              = p_acao
    AND pfg.conceder          = true;

  IF FOUND THEN RETURN true; END IF;

  -- 5. Padrão → negado
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pode(uuid, text, text) TO authenticated;

-- ── 5. NOTIFICAÇÃO DO SCHEMA ─────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── 6. VERIFICAÇÕES (executar após aplicar) ──────────────────
-- SELECT public.project_owner_email('<uuid-do-projeto>');
-- SELECT public.pode('<uuid-projeto>', 'od', 'ver');
-- SELECT count(*) FROM public.perm_recursos;
-- SELECT count(*) FROM public.perm_funcao_grants;

-- ============================================================
-- ██████████████████████████████████████████████████████████
--
-- BLOCO DE CUTOVER — APLICAR SOMENTE JUNTO COM O SEED DE
-- GRANTS (BLOCO B). SE APLICADO ANTES, MEMBROS NÃO-OWNER
-- PERDERÃO ACESSO DE ESCRITA A TODAS AS TABELAS DO PROJETO.
--
-- PRÉ-CONDIÇÃO OBRIGATÓRIA:
--   SELECT count(*) FROM public.perm_funcao_grants;
--   → deve retornar > 0 antes de executar qualquer linha abaixo.
--
-- Executar dentro de BEGIN; ... COMMIT; para rollback fácil.
--
-- ██████████████████████████████████████████████████████████
-- ============================================================
/*

BEGIN;

-- Verifica pré-condição (aborta se grants vazios)
DO $$
BEGIN
  IF (SELECT count(*) FROM public.perm_funcao_grants) = 0 THEN
    RAISE EXCEPTION 'perm_funcao_grants vazio — aplique o seed do Bloco B antes do cutover';
  END IF;
END $$;

-- projetos: insert permanece livre (quem cria vira owner)
DROP POLICY IF EXISTS "projetos update org" ON public.projetos;
DROP POLICY IF EXISTS "projetos delete org" ON public.projetos;

CREATE POLICY "projetos update pode" ON public.projetos
  FOR UPDATE TO authenticated
  USING      (public.pode(id, 'projeto', 'editar'))
  WITH CHECK (public.pode(id, 'projeto', 'editar'));

CREATE POLICY "projetos delete pode" ON public.projetos
  FOR DELETE TO authenticated
  USING (public.pode(id, 'projeto', 'excluir'));

-- dias_filmagem
DROP POLICY IF EXISTS "dias insert org" ON public.dias_filmagem;
DROP POLICY IF EXISTS "dias update org" ON public.dias_filmagem;
DROP POLICY IF EXISTS "dias delete org" ON public.dias_filmagem;

CREATE POLICY "dias_filmagem write pode" ON public.dias_filmagem
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'cronograma', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'cronograma', 'editar'));

-- ordens_do_dia
DROP POLICY IF EXISTS "od insert org" ON public.ordens_do_dia;
DROP POLICY IF EXISTS "od update org" ON public.ordens_do_dia;
DROP POLICY IF EXISTS "od delete org" ON public.ordens_do_dia;

CREATE POLICY "od write pode" ON public.ordens_do_dia
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'od', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'od', 'editar'));

-- projeto_pessoas
DROP POLICY IF EXISTS "pp insert org" ON public.projeto_pessoas;
DROP POLICY IF EXISTS "pp update org" ON public.projeto_pessoas;
DROP POLICY IF EXISTS "pp delete org" ON public.projeto_pessoas;

CREATE POLICY "pp write pode" ON public.projeto_pessoas
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'equipe', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'equipe', 'editar'));

-- despesas
DROP POLICY IF EXISTS "despesas insert org" ON public.despesas;
DROP POLICY IF EXISTS "despesas update org" ON public.despesas;
DROP POLICY IF EXISTS "despesas delete org" ON public.despesas;

CREATE POLICY "despesas write pode" ON public.despesas
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'financeiro', 'criar'))
  WITH CHECK (public.pode(projeto_id, 'financeiro', 'criar'));

-- roteiros e roteiro_cenas
DROP POLICY IF EXISTS "roteiros insert org" ON public.roteiros;
DROP POLICY IF EXISTS "roteiros update org" ON public.roteiros;

CREATE POLICY "roteiros write pode" ON public.roteiros
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'roteiro', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'roteiro', 'editar'));

DROP POLICY IF EXISTS "roteiro_cenas insert org" ON public.roteiro_cenas;
DROP POLICY IF EXISTS "roteiro_cenas update org" ON public.roteiro_cenas;
DROP POLICY IF EXISTS "roteiro_cenas delete org" ON public.roteiro_cenas;

CREATE POLICY "roteiro_cenas write pode" ON public.roteiro_cenas
  FOR ALL TO authenticated
  USING (public.pode(
    (SELECT projeto_id FROM public.roteiros WHERE id = roteiro_cenas.roteiro_id LIMIT 1),
    'roteiro', 'editar'
  ))
  WITH CHECK (public.pode(
    (SELECT projeto_id FROM public.roteiros WHERE id = roteiro_cenas.roteiro_id LIMIT 1),
    'roteiro', 'editar'
  ));

-- agenda_eventos
DROP POLICY IF EXISTS "agenda insert org" ON public.agenda_eventos;
DROP POLICY IF EXISTS "agenda update org" ON public.agenda_eventos;
DROP POLICY IF EXISTS "agenda delete org" ON public.agenda_eventos;

CREATE POLICY "agenda write pode" ON public.agenda_eventos
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'agenda', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'agenda', 'editar'));

-- locacoes
DROP POLICY IF EXISTS "locacoes insert org" ON public.locacoes;
DROP POLICY IF EXISTS "locacoes update org" ON public.locacoes;
DROP POLICY IF EXISTS "locacoes delete org" ON public.locacoes;

CREATE POLICY "locacoes write pode" ON public.locacoes
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'locacoes', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'locacoes', 'editar'));

-- figurino / objetos_arte
DROP POLICY IF EXISTS "figurino insert org" ON public.figurino;
DROP POLICY IF EXISTS "figurino update org" ON public.figurino;
DROP POLICY IF EXISTS "figurino delete org" ON public.figurino;

CREATE POLICY "figurino write pode" ON public.figurino
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'figurino_arte', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'figurino_arte', 'editar'));

DROP POLICY IF EXISTS "objetos_arte insert org" ON public.objetos_arte;
DROP POLICY IF EXISTS "objetos_arte update org" ON public.objetos_arte;
DROP POLICY IF EXISTS "objetos_arte delete org" ON public.objetos_arte;

CREATE POLICY "objetos_arte write pode" ON public.objetos_arte
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'figurino_arte', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'figurino_arte', 'editar'));

-- contratos
DROP POLICY IF EXISTS "contratos insert org" ON public.contratos;
DROP POLICY IF EXISTS "contratos update org" ON public.contratos;
DROP POLICY IF EXISTS "contratos delete org" ON public.contratos;

CREATE POLICY "contratos write pode" ON public.contratos
  FOR ALL TO authenticated
  USING      (public.pode(projeto_id, 'contratos', 'editar'))
  WITH CHECK (public.pode(projeto_id, 'contratos', 'editar'));

NOTIFY pgrst, 'reload schema';

COMMIT;

*/
