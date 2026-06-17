# RELATORIO — Sprint 1C: Polimento & Fluxos Completos
**Data de encerramento:** 27/05/2026  
**Deploy:** glauber.app.br  
**Duracao:** ~1 sessao (~4h de implementacao)  
**Status:** Concluida — build limpo, deploy em producao

---

## 1. Objetivo da Sprint

A Sprint 1C surgiu de uma gap analysis do codigo real apos 1A e 1B. O app estava funcionalmente completo (todas as trilhas A-D do Roadmap V3 implementadas), mas varias partes implementadas em isolamento nao se "falavam". Validacoes existiam mas nunca eram chamadas, links existiam mas nao apareciam na UI, colunas existiam no banco mas nao eram mostradas. O objetivo foi **conectar os pontos soltos** e entregar 8 melhorias de alto impacto sem nenhuma migration nova.

---

## 2. Alteracoes entregues

### C1.1 — Validacao automatica ao salvar despesa
**Arquivo:** `src/pages/Finance.tsx`  
**Mudanca:** Apos o insert na tabela `despesas`, adicionada chamada:
```ts
await supabase.rpc("validar_despesa", { p_despesa_id: data.id });
```
A RPC `validar_despesa()` (migration 0003_trilha_a.sql) existia no banco desde Sprint 1A mas nunca era acionada. A partir de agora, ao salvar qualquer despesa, as regras do edital SIC sao verificadas imediatamente e o icone de alerta aparece na tabela sem reload.

### C1.2 — Botao "Re-validar todas" na Prestacao de Contas
**Arquivo:** `src/pages/Accountability.tsx`  
**Mudanca:** Nova funcao `revalidarTodas()` que itera todas as despesas do projeto via `Promise.all` e chama `validar_despesa()` para cada uma. Botao com spinner durante execucao e toast de resumo `"X ok, Y alertas, Z falhas"`.  
**Impacto:** Permite re-checar em lote despesas cadastradas antes da Sprint 1C.

### C2 — Filtros e busca no Financeiro
**Arquivo:** `src/pages/Finance.tsx`  
**Mudanca:** Barra de filtros local (sem nova query) com Input de busca, Select de status, Select de rubrica (auto-populado), badge dinamico `X de Y despesas — R$ ZZZ` e botao limpar.  
**Impacto:** Com 30+ despesas em projetos reais, a tabela era inutilizavel. Filtros locais garantem resposta instantanea.

### C3 — Command Center em destaque
**Arquivo:** `src/pages/ProjectDetail.tsx`  
**Mudanca:** `Command Center` adicionado como primeiro item no array `atalhos`, com icone `Gauge`. O item ja existia na sidebar na 2a posicao — verificado, sem mudanca necessaria.  
**Impacto:** A tela de KPIs realtime estava invisivel para quem entrava pelo projeto. Agora e o primeiro atalho visivel.

### C4 — Alertas de prestacao no Dashboard global
**Arquivo:** `src/pages/Dashboard.tsx`  
**Mudanca:** A query `validacoes` ja existia mas nao rendia nada na UI. Adicionado painel completo com lista de falhas, badge vermelho com contagem e links diretos para cada projeto.  
**Impacto:** Gestores veem todos os problemas de conformidade de todos os projetos numa tela so.

### C5 — Coluna "Acesso" + InviteButton conectado
**Arquivo:** `src/pages/Team.tsx`  
**Mudanca:** Query de `projeto_pessoas` inclui `user_id` no select. Nova coluna "Acesso" com badge verde "Ativo" ou cinza "Sem acesso". `InviteButton` renderizado por linha.  
**Impacto:** Coordenadores sabem de relance quem ja tem acesso ao app.

### C6 — Calculo de liquido RPA ao salvar regime
**Arquivo:** `src/pages/Team.tsx`  
**Mudanca:** Na mutation `salvarRegime` para tipo RPA, chamada a RPC `fn_calcular_liquido_rpa(p_bruto, p_inss_pct)` (migration 0027). Badge mostra `"RPA — R$ 3.200,00 liq."`.  
**Impacto:** Tabela de IR progressiva aplicada automaticamente.

### C7 — Link publico visivel nas ODs publicadas
**Arquivo:** `src/pages/CallSheets.tsx`  
**Mudanca:** Query inclui campo `token`. Botao "Link publico" com `e.stopPropagation()`. Dialog com URL completa, Input somente-leitura, botao copiar com animacao Check e botao Abrir.  
**Impacto:** `PublicCallSheet.tsx` existia e funcionava, mas era completamente inacessivel.

---

## 3. Migracoes aplicadas

**Nenhuma.** Esta sprint inteira foi front-end. As RPCs `validar_despesa()` e `fn_calcular_liquido_rpa()` ja existiam (migrations 0003 e 0027).

---

## 4. Pontos criticos

### CRITICO: Edit/Write trunca arquivos .tsx
**Problema:** A ferramenta Edit/Write do Cowork trunca arquivos `.tsx` ao encontrar sequencias `</` (fechamento JSX). Gerou 4 builds quebrados durante a sprint (Dashboard, CallSheets, ProjectDetail, Team).

**Solucao definitiva (REGRA PERMANENTE):**
```bash
# No PowerShell, rodar no diretorio cineflow-mvp:
# Nunca usar Write/Edit direto em .tsx grandes.
# Sempre usar python3 via bash para reescritas completas.
```
No shell do sandbox: arquivo escrito via `python3 -` com heredoc de string Python com raw string `r'''...'''`.

### Team.tsx — reconstruicao completa
O git HEAD de `Team.tsx` era a versao pre-Sprint-1B (367 linhas). Mudancas de 1B nao estavam comitadas. Reconstrucao combinou: git + mudancas 1B + mudancas 1C = 551 linhas.

**Licao aprendida:** Rodar `git add . && git commit -m "Sprint 1C"` ao final de cada sprint, no PowerShell dentro de `cineflow-mvp/`.

---

## 5. Localizacao de documentos

| Documento | Caminho |
|---|---|
| Roadmap V3 (referencia principal) | `Glauber/CINEFLOW_Roadmap_V3.md` |
| Roadmap V2 (historico) | `Glauber/CINEFLOW_Roadmap_V2.md` |
| Brief Sprint 1A | `Glauber/BRIEF_SPRINT1A.md` |
| Brief Sprint 1B | `Glauber/BRIEF_SPRINT1B.md` |
| Brief Sprint 1C | `Glauber/BRIEF_SPRINT1C.md` |
| Schema base | `cineflow-mvp/supabase/migrations/0001_init.sql` |
| Todas as migrations (29) | `cineflow-mvp/supabase/migrations/` |
| Organograma AV | `Glauber/ORGANOGRAMA_COMPLETO_FUNCIONAMENTO_AUDIOVISUAL.docx` |
| Pitch deck | `Glauber/CineFlow_Pitch_2026.pptx` |
| Documento tecnico MVP | `Glauber/CINEFLOW_Documento_Tecnico_MVP.docx` |
| Guia setup local | `Glauber/CINEFLOW_Setup_Passo_a_Passo.md` |
| Este relatorio | `Glauber/RELATORIO_SPRINT1C.md` |
| Diagnostico vs Roadmap | `Glauber/DIAGNOSTICO_ESTADO_ATUAL_VS_ROADMAP.md` |

---

## 6. Links uteis

| Recurso | URL |
|---|---|
| App em producao | https://glauber.app.br |
| Vercel dashboard | https://vercel.com/cineflow-s-projects/glauber-mvp |
| Supabase projeto | https://supabase.com/dashboard |
| Ultimo inspect Vercel | https://vercel.com/cineflow-s-projects/glauber-mvp/2TRP3Kr9hfFzryhc1VRC9ZzUMCHn |

---

## 7. Estado do app apos Sprint 1C

**26 paginas** em `src/pages/`: Accountability, CallSheetEditor, CallSheets, Cast, Communication, Contract, Dashboard, FigurinoArte, Finance, Fornecedores, InviteAccept, Locations, Login, Onboarding, PlanejamentoDetalhe, ProjectDashboard, ProjectDetail, Projects, PublicCallSheet, ResetPassword, Roteiro, Schedule, Settings, Signup, Team, UpdatePassword

**29 migrations aplicadas** no Supabase (0001 init → 0029 kpi_eventos)

**5 hooks customizados:** useAuth, useOrg, useProjectKPIs, useProjectRole, useSidebar

---

## 8. Proximo passo

Ver `DIAGNOSTICO_ESTADO_ATUAL_VS_ROADMAP.md` para posicionamento e proposta do proximo bloco.

**LEMBRETE:** Ao aplicar o proximo sprint, sempre finalizar com `vercel --prod` no PowerShell dentro de `cineflow-mvp/`.
