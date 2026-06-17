# DIAGNOSTICO — Estado Atual do Prototipo vs. Roadmap V2/V3
**Data:** 27/05/2026  
**Base:** Analise do codigo real pos-Sprint 1C + CINEFLOW_Roadmap_V3.md  
**Referencia:** 29 migrations aplicadas, 26 paginas .tsx, build limpo em producao

---

## 1. RESUMO EXECUTIVO

O prototipo Glauber esta **muito mais avancado do que o Roadmap V3 antecipava** para esta fase. O documento V3 (23/05/2026) projetava ~10 sprints para cobrir todas as trilhas A-D. Em 3 sprints (1A, 1B, 1C), **todas as trilhas foram implementadas** — incluindo funcionalidades que o V3 classificava como Trilha D (mais complexa e de longo prazo).

**Grau de cobertura estimado: ~85% do Roadmap V3.**

---

## 2. COBERTURA DETALHADA POR TRILHA DO ROADMAP V3

### TRILHA A — "Claude autonomo, sem bloqueio" (9 itens)

| Item V3 | Status | Observacao |
|---|---|---|
| A1 — Rename "Camera" → "Fotografia" | ✅ Implementado | Constraint SQL atualizado, SelectItem renomeado |
| A2 — Rename "Valor diaria" → "Valor de contratacao" | ✅ Implementado | Labels UI atualizados |
| A3 — Travar DatePicker ao periodo do projeto | ✅ Implementado | Schedule.tsx valida contra periodo_inicio/fim |
| A4 — Botao "+ Planejamento" com tipo + periodo | ✅ Implementado | 4 tipos: pre_producao, producao, dia_filmagem, pos_producao |
| A5 — Locacoes com Google Maps/Waze | ✅ Implementado | Locations.tsx com campos maps_url, waze_url + botoes abrir |
| A6 — Configuracoes: edicao de cadastro pessoal | ✅ Implementado | Settings.tsx existe com edicao de perfil |
| A7 — Seed funcoes_av (organograma 60+ funcoes) | ✅ Implementado | Migration 0003_trilha_a.sql inclui seed funcoes_av |
| A8 — Validacoes SIC ativas (RPC) | ✅ Implementado | validar_despesa() com regras SIC. Sprint 1C conectou ao UI |
| A9 — Travar orcamento ao teto do edital | ✅ Implementado | RPC check_orcamento_dentro_teto + banner amarelo |

**Trilha A: 9/9 concluida (100%)**

---

### TRILHA B — "Refator estrutural" (6 itens)

| Item V3 | Status | Observacao |
|---|---|---|
| B1 — Equipe POR projeto (projeto_pessoas) | ✅ Implementado | Migration 0004, tabela projeto_pessoas com funcao_av_id e valor_contratacao |
| B2 — OD autonoma com secoes por departamento | ✅ Implementado | Migrations 0003+0005, CallSheetEditor.tsx completo com secoes, cenas, publicacao |
| B3 — Cronograma com fases | ✅ Implementado | Schedule.tsx com agrupamento por tipo (pre/prod/filmagem/pos) |
| B4 — Equipe vinculada ao cronograma | ✅ Implementado | PlanejamentoDetalhe.tsx com escalas + check-in/out |
| B5 — Exclusao de projeto + 2FA email | ✅ Implementado | RPC request_delete_project + confirm_delete_project (migrations 0007+0011) |
| B6 — OD aprimorada (10 blocos do organograma) | ✅ Implementado | CallSheetEditor.tsx com campos avancados (chegada_geral, hospital, contatos emergencia, etc.) |

**Trilha B: 6/6 concluida (100%)**

---

### TRILHA C — "Depende de decisao" (4 itens)

| Item V3 | Status | Observacao |
|---|---|---|
| C1 — Contrato stub (1 projeto = 1 contrato) | ✅ Implementado | Migration 0012, Contract.tsx com status/vigencia/valor |
| C2 — Convite e-mail + OTP | ✅ Implementado | Migration 0010+0020, InviteButton, InviteAccept.tsx, fluxo completo |
| C3 — Cadastro restrito por papel | ✅ Implementado | Migration 0016_c3_c4_rbac.sql, Settings.tsx com aba autorizacoes |
| C4 — RBAC granular por funcao | ✅ Implementado | useProjectRole hook, RLS policies por papel no banco |

**Trilha C: 4/4 concluida (100%)**

---

### TRILHA D — "Modulos novos" (8 itens)

| Item V3 | Status | Observacao |
|---|---|---|
| D1 — Figurino + Arte | ✅ Implementado | Migration 0013, FigurinoArte.tsx com pecas, objetos cenicos, status |
| D2 — Elenco separado da equipe tecnica | ✅ Implementado | Migration 0014, Cast.tsx com personagens + atores escalados |
| D3 — Analise tecnica / decupagem | ✅ Implementado | Migration 0015+0023, Roteiro.tsx com upload + decupagem IA via Claude Vision |
| D4 — Check-in manual (hora in/out) | ✅ Implementado | Migration 0008, PlanejamentoDetalhe.tsx com botoes Check-in/Check-out |
| D5 — Canal comunicacao texto + audio | ✅ Implementado | Migration 0009, Communication.tsx com Supabase Realtime + Storage audio |
| D6 — OCR onboarding (PDF tabelado) | ✅ Implementado | Migrations 0017+0018, Onboarding.tsx com OCR real |
| D7 — OCR OD/cronograma antigos | ⚠️ Parcial | OCR generico implementado mas sem template especifico para OD/cronograma |
| D8 — OCR notas fiscais | ⚠️ Parcial | OCR disponivel mas sem parser especifico para NF |

**Trilha D: 6/8 concluida (75%) — D7 e D8 precisam de templates OCR especificos**

---

## 3. ITENS DO ROADMAP V3 AINDA PENDENTES OU PARCIAIS

### Pendencias de qualidade (nao sao features ausentes, sao refinamentos)

| # | Item | Situacao | Prioridade |
|---|---|---|---|
| P1 | `git commit` sistematico ao final de cada sprint | Nao feito — mudancas nao estao no historico git | Alta (risco de perda) |
| P2 | OCR com template para notas fiscais | Parcial — OCR existe mas parse NF especifico nao | Media |
| P3 — Perguntas abertas V3 | 8 perguntas do secao 8 do V3 sem resposta | Media |
| P4 | Validacao A9 como bloqueio rigido vs alerta | Implementado como alerta; decisao de bloqueio rigido pendente |
| P5 | Backfill B1: como tratar pessoas org vs projeto | Implementado; porem sem backfill automatico para projetos existentes |

### Perguntas abertas do Roadmap V3 (secao 8) — ainda sem resposta:
1. A9: alerta ou bloqueio rigido ao ultrapassar teto?
2. B1: backfill de pessoas existentes para projeto_pessoas?
3. A7: funcao do organograma — opcional ou obrigatorio ao vincular pessoa?
4. ODs de ensaio/reuniao: mesma listagem ou aba separada?
5. Notificacao na publicacao da OD: email, in-app ou ambos?
6. Audio D5: gravar no app ou so upload? Limite de duracao?
7. OCR engine: Claude Vision (paga) ou alternativa gratuita?
8. Excluir projeto: soft-delete (recuperar 30d) ou hard-delete?

---

## 4. ONDE ESTAMOS: POSICAO NA LINHA DO TEMPO

```
Sprint 1A ─── Sprint 1B ─── Sprint 1C ─── [AQUI] ─── Sprint 1D (proposto)
  Trilha A      Trilha B      Polimento      85%       Qualidade + Pitch
  completa      completa      conexoes       MVP       + Perguntas abertas
```

O app tem **todas as funcionalidades de uma plataforma profissional** de gestao de producao audiovisual. O que falta agora nao sao mais "modulos ausentes" — sao **refinamentos de qualidade, estabilidade e preparacao para usuarios reais**.

---

## 5. ANALISE DE GAPS REMANESCENTES

### Gap 1 — Qualidade dos fluxos de convite
A implementacao de convites (C2) existe no banco e no codigo, mas o fluxo ponta-a-ponta (email de convite chegando na caixa do colaborador → clique → onboarding → acesso ao projeto) nao foi testado em producao real. O SMTP do Supabase tem limite de 3 emails/h no plano free.

### Gap 2 — RBAC no front-end
O `useProjectRole` hook existe e o banco tem RLS. Mas varios componentes ainda nao checam o role antes de mostrar botoes destrutivos (editar/deletar). Um colaborador com papel "viewer" pode ver botoes que nao deveria.

### Gap 3 — Performance em projetos grandes
As queries em varios componentes fazem SELECT * sem paginacao. Em producao com 100+ despesas ou 50+ membros de equipe, isso vai ficar lento. Nao e critico agora (demo/pitch), mas precisa ser tratado antes de onboarding real.

### Gap 4 — Estado offline / tratamento de erros
Varios mutates nao tem feedback de erro adequado — ou mostram apenas o erro bruto do Supabase. Para uma demo com a banca do Porto Digital, um erro "relation does not exist" ou "JWT expired" visivel para o avaliador seria critico.

### Gap 5 — Mobile responsividade
As tabelas (Finance, Team, Accountability) nao sao responsivas. Em tela menor que 768px ficam cortadas. Dado que producao audiovisual e feita em campo (celular), isso e relevante para o produto real — mas pode ser adiado para apos o pitch.

---

## 6. COBERTURA FRENTE AOS CRITERIOS DO PORTO DIGITAL

Com base no `Cineflow_Documento_Pre-Incubacao.docx` e contexto da trilha de pre-incubacao:

| Criterio tipico de pre-incubacao | Status |
|---|---|
| Produto funcionando (MVP demonstravel) | ✅ Sim — app em producao em glauber.app.br |
| Problema real validado | ✅ Sim — pesquisa com producoes AV (CINEFLOW_Relatorio_Pesquisa.docx) |
| Diferencial claro vs. Google Sheets/WhatsApp | ✅ Sim — validacao edital, OD estruturada, decupagem IA |
| Time tecnico competente | ✅ Sim — MVP funcional em ~2 semanas |
| Modelo de negocio esboçado | ⚠️ Parcial — billing por projeto definido mas sem implementacao real |
| Roadmap claro | ✅ Sim — V3 com 27 itens priorizados |
| Metricas de uso | ⚠️ Ausente — sem analytics/telemetria implementada |

---

## 7. PROXIMO SPRINT RECOMENDADO

Ver secao "Proposta Sprint 1D" na resposta do consultor — aguardando validacao do Thiago antes de executar.
