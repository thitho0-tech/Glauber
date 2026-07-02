# Glauber — Roadmap e Estado das Sprints

> Última atualização: 30/06/2026
> Estado vivo das migrations: ver `cineflow-mvp/supabase/migrations/` (atual: 0070)

## Estado Geral

O produto está em produção em https://glauber.app.br com 36 telas e 70 migrations.
Fase atual: testes com equipe real + ajustes pós-leva 2 (24/06/2026).

---

## Sprints Concluídas

| Sprint | Tema | Migrations | Status |
|--------|------|-----------|--------|
| 1A | Base auth, projetos, OD, equipe, roteiro | 0001–0008 | ✅ prod |
| 1B | Financeiro, contratos, figurino/arte, escalas | 0009–0022 | ✅ prod |
| 1C | Dashboard KPI, RBAC, audit log, fornecedores, roteiro | 0023–0024 | ✅ prod |
| 1D | Lixeira geral, agenda, notificações in-app, depto obrigatório | 0025–0032 | ✅ prod |
| 2A | Bucket áudio, RBAC front, Edge Function email, pg_cron | 0033–0034 | ✅ prod |
| 2B | Command Center dados reais (todas as views) | 0035 | ✅ prod |
| 2C | Stripboard, PDF OD, mobile Finance+Team | 0036 | ✅ prod |
| 3A | Multi-função equipe, função do owner, fix notif, views | 0037 | ✅ prod |
| 3B | Financeiro: fornecedor+autofill CNPJ, upload comprovante | 0038 | ✅ prod |
| 3B.5 | Separar Configurações: Conta × Gestão do Projeto | 0039–0040 | ✅ prod |
| Hotfixes | Radix Select crash, botão excluir projeto | 0041–0048 | ✅ prod |
| Sprint 4 | Fases 4A–4D: sidebar, Mural, Agenda, OD completa, decupagem→vínculos | 0049* | ✅ prod |
| Sprint 5 — Segurança | pode(), perm_recursos, RLS cutover, hardening anon | 0050–0057 | ✅ prod |
| Sprint 5 — Features | C1 aprovação OD, aprovação Arte, C2 editar OD publicada | 0058–0062 | ✅ prod |
| Leva pós-teste 23/06 | Fix RLS canais, notif agenda, rebrand emails, /privacidade | 0063–0068 | ✅ prod |
| Leva 2 (24/06) | Email timeout, função por projeto via catálogo | 0069–0070 | ✅ prod |

*0049 (agenda_prep) propositalmente não aplicada ainda — entra junto do C4.

---

## Funcionalidades Implementadas

- Auth (email+senha, magic link, convite com link)
- Multi-tenant por organização (produtora)
- Projetos CRUD com período, edital, status
- Equipe por projeto (multi-função, catálogo funcoes_av, isolamento entre projetos)
- Dias de filmagem + Ordem do Dia (criação, aprovação, publicação, edição pós-publicação, link público sem login)
- Escalas por dia
- Orçamento por rubrica + validação de edital (Funcultura PE, Lei Paulo Gustavo, SIC Recife 2024)
- Despesas com comprovante (upload PDF/imagem) + validação automática
- Prestação de contas (consolidado visual)
- Roteiro + Decupagem IA (Tesseract + Mistral) + edição + vínculos personagens/locações
- Chat de produção (Mural) por departamento — texto + áudio
- Agenda unificada (eventos por departamento)
- Notificações in-app (sino) + email
- RBAC composite: pode() + perm_recursos + perm_funcao_grants + perm_overrides
- Command Center com 4 views segmentadas (DP/Produtor, Diretor, AD, Colaborador)
- Soft-delete com lixeira (purge automático 30d via pg_cron)
- PDF da OD (via @media print)
- Mapa de Transporte
- Figurino e Arte com fluxo de aprovação
- Locações com Google Maps URL
- Elenco separado de equipe técnica
- Configurações de conta + gestão de projeto (aba Zona de Perigo)
- Página /privacidade
- Social login (desativado — flag SOCIAL_LOGIN_ENABLED=false)

---

## Pendentes / Próximos Passos

### Testes Leva 2 (a validar em produção)
- [ ] Item 4: Som de notificação + toggle em Settings
- [ ] Item 5: Clicar evento Mural → abre detalhe na Agenda
- [ ] Item 7: Função por projeto (0070) — criar projeto novo com mesma pessoa em função diferente

### Fix Conhecido
- [ ] send-email retornando 401 → re-deployar com `supabase functions deploy send-email --no-verify-jwt`

### Backlog (pós-Porto Digital)
- [ ] C3 Mural "Próximos eventos" personalizado por usuário/depto
- [ ] C4 Fusão Agenda + Planejamento completa (calendário Dia/Semana/Mês; depende de 0049)
- [ ] OCR NF específico (parser XML NFe + Nota Carioca)
- [ ] Push-to-Talk (LiveKit)
- [ ] Check-in com GPS opcional
- [ ] Stripboard drag-and-drop completo (dnd-kit)
- [ ] DOOD gerado automaticamente do stripboard
- [ ] Player de vídeo com timecode (Frame.io Brasileiro)
- [ ] Folha de pagamento + RPA emissão
- [ ] Pacote prestação 1-clique (ZIP Funcultura)
- [ ] Paginação (crítico acima de 100 registros)
- [ ] Gov.br assinatura digital
- [ ] Multi-produtora (seletor de org)
- [ ] Módulo Continuidade (script supervisor)

---

## Roadmap Original (7 Sprints → 28 semanas)

O roadmap original do GLAUBER_CONTEXTO.md previa 7 sprints. O desenvolvimento
real foi mais iterativo e orientado por testes de campo. Sprints 1-5 foram concluídas.

| Sprint original | Foco | Estado |
|----------------|------|--------|
| 1A | Command Center + Auth | ✅ completo |
| 1B | Fundação Fiscal | ✅ completo |
| 2 | Conversa Criativa | ✅ completo (Mural) |
| 3 | Decupagem Viva | ✅ completo |
| 4 | Stripboard + DOOD + OD | ✅ parcial (sem stripboard drag-and-drop) |
| 5 | Segurança + features OD/Arte | ✅ completo |
| 6 | Folha + Pacote Funcultura | ⏳ pós-piloto |
| 7 | Refinamentos + Lançamento | ⏳ pós-piloto |
