# Sprint 1A — Task List (Simples & Funcional)

**Status:** Não Iniciado  
**Data Início:** 2026-05-27  
**Duração Estimada:** 2-3 semanas  
**Total:** 18 tasks | 50 story points

---

## 📋 TASKS

### Group 1: Dashboard + Realtime Setup (3 dias)

- [ ] **1A.1.1** — Setup pasta `/dashboard` (2 pts)
  - [ ] Criar estrutura de pastas: `/app/projetos/[id]/dashboard/`
  - [ ] Criar arquivo `dashboard.tsx`
  - [ ] Importar componentes base (Layout, Header)
  - AC: arquivo existe, sem erros

- [ ] **1A.1.2** — Layout base dashboard (3 pts) [Depende: 1A.1.1]
  - [ ] Grid responsivo com 4 colunas
  - [ ] Header com projeto info
  - [ ] Footer com timestamp
  - AC: layout renderiza, responsive em mobile

- [ ] **1A.1.3** — Conectar Supabase Realtime (3 pts) [Depende: 1A.1.2]
  - [ ] Setup cliente Supabase
  - [ ] Subscribe a tabela `projeto_kpis`
  - [ ] Handle reconnect automático
  - AC: dados chegam em <500ms, sem erros console

---

### Group 2: Schema SQL + Triggers (1.5 dias)

- [ ] **1A.2.1** — Criar migration 0024 (2 pts)
  - [ ] Arquivo: `migrations/0024_projeto_kpis.sql`
  - [ ] Executar sem erros
  - [ ] Rollback funciona
  - AC: migration roda, sem constraint errors

- [ ] **1A.2.2** — Definir schema `projeto_kpis` (3 pts) [Depende: 1A.2.1]
  - [ ] Columns: id, projeto_id, roteiro_filmado_pct, orcamento_comprometido_pct, prazos_criticos, proximos_eventos, updated_at, updated_by
  - [ ] Constraints: check 0-100%, foreign key projeto_id
  - [ ] Índices: projeto_id, updated_at
  - AC: schema criada, select retorna 0 linhas

- [ ] **1A.2.3** — Criar triggers automáticos (3 pts) [Depende: 1A.2.2]
  - [ ] Trigger: ao inserir em `dia_cenas`, atualizar `roteiro_filmado_pct`
  - [ ] Trigger: ao inserir em `despesa`, atualizar `orcamento_comprometido_pct`
  - [ ] Trigger: atualizar `updated_at` ao modificar
  - AC: triggers disparam, KPIs recalculam

---

### Group 3: Hook + Realtime Subscribers (1 dia)

- [ ] **1A.3.1** — Hook `useProjectKPIs()` (3 pts) [Depende: 1A.1.3, 1A.2.3]
  - [ ] TypeScript interfaces: `ProjectKPIs` type
  - [ ] Supabase Realtime subscription
  - [ ] Cleanup ao desmontar componente
  - [ ] Fallback: polling cada 5s se Realtime cai
  - AC: hook roda, dados atualizam <500ms

- [ ] **1A.3.2** — Testes do hook (2 pts) [Depende: 1A.3.1]
  - [ ] Unit test: mock Supabase
  - [ ] Test: subscribe/unsubscribe
  - [ ] Test: cleanup on unmount
  - AC: testes passam, 100% coverage

---

### Group 4: 4 Visões Segmentadas (2 dias)

- [ ] **1A.4.1** — Visão DP/Produtor (3 pts) [Depende: 1A.3.1]
  - [ ] Componente: `DPView.tsx`
  - [ ] Cards: % roteiro filmado, % orçamento, datas críticas, alertas edital
  - [ ] Cores: verde (ok), amarelo (atenção), vermelho (risco)
  - AC: renderiza, KPIs atualizam realtime

- [ ] **1A.4.2** — Visão Diretor (3 pts) [Depende: 1A.3.1]
  - [ ] Componente: `DirectorView.tsx`
  - [ ] Cards: próximos eventos criativos, tarefas pendentes, decupagem status
  - [ ] Timeline com datas
  - AC: renderiza, dados de testes mostram correto

- [ ] **1A.4.3** — Visão AD (3 pts) [Depende: 1A.3.1]
  - [ ] Componente: `ADView.tsx`
  - [ ] Cards: stripboard próximos 3 dias, OD status, dependências equipe
  - [ ] Grid com dias
  - AC: renderiza, stripboard exibe cenas

- [ ] **1A.4.4** — Visão Colaborador (2 pts) [Depende: 1A.3.1]
  - [ ] Componente: `CollaboratorView.tsx`
  - [ ] Cards: minhas tarefas, prazos, notificações
  - [ ] Filter por user_id
  - AC: renderiza, filtra por user correto

---

### Group 5: Auth (1 dia)

- [ ] **1A.5.1** — Validação senha 8 chars (1 pt)
  - [ ] Regex: mín 8 chars, 1 maiúscula, 1 número
  - [ ] Error message claro
  - [ ] Test: válida/invalida
  - AC: validação roda, msg aparece

- [ ] **1A.5.2** — Magic Link flow (3 pts) [Depende: 1A.5.1]
  - [ ] Email form com validação
  - [ ] Send email com Supabase Auth
  - [ ] Verify link redireciona
  - [ ] Session criada
  - AC: flow completo, user logado

- [ ] **1A.5.3** — RLS por projeto (3 pts) [Depende: 1A.2.2]
  - [ ] Policy: usuário vê apenas `projeto_kpis` de projetos que participa
  - [ ] Policy: update apenas seu próprio user_id
  - [ ] Test: RLS bloqueia acesso indevido
  - AC: RLS ativa, testes passam

---

### Group 6: Testes Performance (1.5 dias)

- [ ] **1A.6.1** — Unit tests (2 pts) [Depende: 1A.3.2]
  - [ ] Tests: hooks (useProjectKPIs, custom utils)
  - [ ] Tests: utils (calcs, formatters)
  - [ ] Coverage: >80%
  - AC: `npm run test` passa

- [ ] **1A.6.2** — Integration tests (3 pts) [Depende: 1A.4.4]
  - [ ] Tests: CommandCenter com Realtime mock
  - [ ] Tests: 4 visões renderizam
  - [ ] Tests: dados atualizam ao mudar
  - AC: `npm run test:integration` passa

- [ ] **1A.6.3** — Performance test (3 pts) [Depende: 1A.6.2]
  - [ ] Verificar: load <2s
  - [ ] Verificar: realtime <500ms
  - [ ] Verificar: zero memory leaks
  - AC: lighthouse score >90

---

### Group 7: Load Testing (1 dia)

- [ ] **1A.7.1** — Setup load test 50+ users (3 pts) [Depende: 1A.6.3]
  - [ ] K6 script: simula 50+ usuários simultâneos
  - [ ] Rodar em staging
  - [ ] Verificar: zero crashes
  - [ ] Verificar: latência <500ms persiste
  - AC: load test roda, resulta OK

---

### Group 8: Deploy + Validação (1 dia)

- [ ] **1A.8.1** — Deploy staging (2 pts) [Depende: 1A.7.1]
  - [ ] Build Vercel preview
  - [ ] Verificar: deploy sucesso
  - [ ] Verificar: Realtime funciona em staging
  - AC: URL staging acessível, tudo roda

- [ ] **1A.8.2** — Validação com DP (2 pts) [Depende: 1A.8.1]
  - [ ] Mostrar para DP (Tereza) + Produtor (Chico)
  - [ ] Coletar feedback
  - [ ] Registrar: "é isso que esperava?" ✅
  - AC: DP validou, feedback documentado

---

## 📊 Progress

```
[ ] Não iniciado (18 tasks, 50 pts)
[x] Em progresso (0 tasks, 0 pts)
[x] Review (0 tasks, 0 pts)
[x] Pronto (0 tasks, 0 pts)
```

**Progress:** 0 de 50 pts (0%)

---

## ✅ Definition of Done

Cada task só conta como "Pronto" se:
- ✅ Código escrito e commitado
- ✅ Testes passam (unit ou integration)
- ✅ Sem `console.log()` ou `debugger`
- ✅ Code review (1 pessoa)
- ✅ Deployado em staging
- ✅ Validação com DP se feature (não infra)
- ✅ Documentação atualizada se necessário

---

## 🚀 Como Usar Este Doc

1. **Diariamente:** Atualize checkboxes conforme avança
2. **Ao completar task:** marque `[x]`
3. **Se bloqueado:** adicione nota ao lado
4. **No final:** tudo `[x]` = Sprint 1A done!

---

**Próximo passo:** Começar **Tarefa 1.2** (Expandir cada task com Acceptance Criteria detalhado)

Pronto pra continuar? ✅
