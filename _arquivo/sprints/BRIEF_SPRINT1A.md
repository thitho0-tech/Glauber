# 📋 BRIEF SPRINT 1A — GLAUBER

**Data:** 26 de maio de 2026  
**Status:** ✅ Completo — Pronto para Claude Code  
**Duração Estimada:** 2-3 semanas  
**Total:** 18 tasks | 50 story points

---

## 🎯 VISÃO GERAL

**Command Center + Auth** — Dashboard em tempo real como home de cada projeto.

Usuário loga → vê dashboard bonito, em tempo real, exatamente o que precisa saber sobre seu projeto → "Isso é útil! Continuo usando"

**Impacto:** Retenção imediata + diferencial vs concorrentes (ninguém no Brasil tem isso)

---

## 🏗️ ARQUITETURA

```
/projetos/[id]/dashboard (Home Page)
├─ Supabase Realtime (WebSocket)
│  └─ projeto_kpis table (triggers automáticos)
├─ 4 Visões Segmentadas:
│  ├─ DP/Produtor: % roteiro filmado | % orçamento | datas críticas | alertas edital
│  ├─ Diretor: próximas reuniões | tarefas pendentes | decupagem status
│  ├─ AD: stripboard próximos 3 dias | OD status | dependências equipe
│  └─ Colaborador: minhas tarefas | prazos | notificações
├─ KPIs dinâmicos (recalculados por triggers)
│  ├─ roteiro_filmado_pct (via dia_cenas)
│  ├─ orcamento_comprometido_pct (via despesa)
│  ├─ prazos_criticos (via vencimentos)
│  └─ proximos_eventos (via calendar)
└─ Sucesso: < 2s load, < 500ms realtime, 50+ usuários
```

---

## 📊 TABELA PRINCIPAL: `projeto_kpis`

```sql
create table projeto_kpis (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id),
  roteiro_filmado_pct decimal(5,2),        -- 0-100
  orcamento_comprometido_pct decimal(5,2), -- 0-100
  prazos_criticos jsonb,                   -- ["2026-06-15", "2026-07-20"]
  proximos_eventos jsonb,                  -- [{tipo, data, responsavel}]
  updated_at timestamp default now(),
  updated_by uuid references auth.users(id),
  constraint projeto_kpis_pct_check check (
    roteiro_filmado_pct between 0 and 100
    and orcamento_comprometido_pct between 0 and 100
  )
);

-- Índices
create index idx_projeto_kpis_projeto_id on projeto_kpis(projeto_id);
create index idx_projeto_kpis_updated_at on projeto_kpis(updated_at desc);
```

### Triggers Automáticos

**Trigger 1: Recalcular `roteiro_filmado_pct` ao inserir/atualizar `dia_cenas`**
- Contar: (cenas filmadas / total cenas) * 100

**Trigger 2: Recalcular `orcamento_comprometido_pct` ao inserir/atualizar `despesa`**
- Contar: (soma despesas / orçamento total) * 100

**Trigger 3: Atualizar `prazos_criticos` ao inserir/atualizar `editais`**
- Array de datas de vencimento > agora

### Row-Level Security (RLS)

```sql
alter table projeto_kpis enable row level security;

create policy "usuarios_veem_proprios_kpis"
on projeto_kpis for select
using (
  exists (
    select 1 from participantes
    where projeto_id = projeto_kpis.projeto_id
      and user_id = auth.uid()
  )
);
```

**Leia:** arquivo `SCHEMA_SPRINT1A.md` para SQL completo com triggers.

---

## ⚙️ TIPOS TYPESCRIPT

```typescript
type ProjectKPIs = {
  id: string;
  projeto_id: string;
  roteiro_filmado_pct: number;
  orcamento_comprometido_pct: number;
  prazos_criticos: string[];              // ISO dates
  proximos_eventos: ProximoEvento[];
  updated_at: string;
  updated_by: string;
};

type ProximoEvento = {
  tipo: 'edital' | 'pagamento' | 'evento_criativo';
  data: string;
  responsavel: string;
  titulo: string;
};

type UserRole = 'dp' | 'produtor' | 'diretor' | 'ad' | 'colaborador';
```

**Leia:** arquivo `REACT_INTERFACES_SPRINT1A.md` para tipos completos.

---

## 🪝 HOOKS PRINCIPAIS

### `useProjectKPIs(projectId: string)`

```typescript
const { kpis, loading, error } = useProjectKPIs(projectId);
```

- Subscribe a Supabase Realtime
- Fallback: polling a cada 5s
- Return: kpis | loading | error
- Cleanup: unsubscribe on unmount

### `useAuth()`

```typescript
const { user, loading } = useAuth();
```

- Get user + role
- Return: user | loading

---

## 🧩 COMPONENTES

### `<CommandCenter projectId="..." userRole="dp" />`

Renderiza a view correta baseado no userRole:
- `dp` / `produtor` → `<DPView />`
- `diretor` → `<DirectorView />`
- `ad` → `<ADView />`
- `colaborador` → `<CollaboratorView />`

### `<DPView kpis={...} />`

Cards:
1. KPI Card: % Roteiro Filmado (verde/amarelo/vermelho)
2. KPI Card: % Orçamento Comprometido
3. Alerts Card: Prazos Críticos (top 5)
4. Events Card: Próximos Eventos (top 5)

### `<DirectorView kpis={...} />`

Cards:
1. Creative Events Card
2. Tasks Card
3. Decuping Status Card
4. Lookbook Card

### `<ADView kpis={...} />`

Cards:
1. Stripboard Card (próximos 3 dias)
2. OD Status Card
3. Dependencies Card
4. Checklist Card

### `<CollaboratorView kpis={...} />`

Cards:
1. My Tasks Card
2. Deadlines Card
3. Notifications Card
4. Profile Card

---

## 📋 18 TASKS (Ordem de Execução)

### **1A.1: Dashboard + Realtime Setup (3 dias)**

- [ ] 1A.1.1 — Setup pasta `/dashboard` (2 pts)
  - AC: arquivo `[id]/dashboard.tsx` existe, sem erros

- [ ] 1A.1.2 — Layout base dashboard (3 pts) [Depende: 1A.1.1]
  - AC: grid 4 colunas, responsive, funciona em mobile

- [ ] 1A.1.3 — Conectar Supabase Realtime (3 pts) [Depende: 1A.1.2]
  - AC: dados chegam <500ms, sem erros console

### **1A.2: Schema SQL + Triggers (1.5 dias)**

- [ ] 1A.2.1 — Criar migration 0024 (2 pts)
  - AC: migration roda, rollback funciona

- [ ] 1A.2.2 — Definir schema `projeto_kpis` (3 pts) [Depende: 1A.2.1]
  - AC: schema criada, constraints validam

- [ ] 1A.2.3 — Criar triggers automáticos (3 pts) [Depende: 1A.2.2]
  - AC: triggers disparam, KPIs recalculam automaticamente

### **1A.3: Hook + Realtime (1 dia)**

- [ ] 1A.3.1 — Hook `useProjectKPIs()` (3 pts) [Depende: 1A.1.3, 1A.2.3]
  - AC: hook roda, dados atualizam <500ms, fallback em 5s

- [ ] 1A.3.2 — Testes do hook (2 pts) [Depende: 1A.3.1]
  - AC: `npm run test` passa, coverage >80%

### **1A.4: 4 Visões Segmentadas (2 dias)**

- [ ] 1A.4.1 — Visão DP/Produtor (3 pts) [Depende: 1A.3.1]
  - AC: renderiza 4 cards, KPIs atualizam realtime

- [ ] 1A.4.2 — Visão Diretor (3 pts) [Depende: 1A.3.1]
  - AC: renderiza 4 cards, dados de teste mostram correto

- [ ] 1A.4.3 — Visão AD (3 pts) [Depende: 1A.3.1]
  - AC: renderiza 4 cards, stripboard exibe cenas

- [ ] 1A.4.4 — Visão Colaborador (2 pts) [Depende: 1A.3.1]
  - AC: renderiza 4 cards, filtra por user_id correto

### **1A.5: Auth (1 dia)**

- [ ] 1A.5.1 — Validação senha 8 chars (1 pt)
  - AC: validação roda, erro message aparece

- [ ] 1A.5.2 — Magic Link flow (3 pts) [Depende: 1A.5.1]
  - AC: email enviado, link funciona, session criada

- [ ] 1A.5.3 — RLS por projeto (3 pts) [Depende: 1A.2.2]
  - AC: RLS ativa, usuário vê apenas seus KPIs

### **1A.6: Testes (1.5 dias)**

- [ ] 1A.6.1 — Unit tests (2 pts) [Depende: 1A.3.2]
  - AC: `npm run test` passa, coverage >80%

- [ ] 1A.6.2 — Integration tests (3 pts) [Depende: 1A.4.4]
  - AC: `npm run test:integration` passa

- [ ] 1A.6.3 — Performance test (3 pts) [Depende: 1A.6.2]
  - AC: load <2s, realtime <500ms, lighthouse >90

### **1A.7: Load Testing (1 dia)**

- [ ] 1A.7.1 — Setup load test 50+ users (3 pts) [Depende: 1A.6.3]
  - AC: load test roda, zero crashes, latência OK

### **1A.8: Deploy + Validação (1 dia)**

- [ ] 1A.8.1 — Deploy staging (2 pts) [Depende: 1A.7.1]
  - AC: URL staging acessível, Realtime funciona

- [ ] 1A.8.2 — Validação com DP (2 pts) [Depende: 1A.8.1]
  - AC: DP validou, "é isso que esperava!" ✅

---

## ✅ DEFINITION OF DONE

Cada task é "Pronto" quando:
- ✅ Código escrito, commitado
- ✅ Testes passam
- ✅ Sem `console.log()` / `debugger`
- ✅ Code review (1 pessoa)
- ✅ Deployado em staging
- ✅ Documentação atualizada
- ✅ DP validou (se feature)

---

## 🎯 SUCCESS CRITERIA (Fim Sprint 1A)

- ✅ Dashboard carrega em < 2s
- ✅ Realtime atualiza < 500ms após mudança
- ✅ 4 visões segmentadas funcionam sem erros
- ✅ Zero crashes em 50+ usuários simultâneos em staging
- ✅ DP + Produtor dizem "é isso que esperava"
- ✅ Alertas de edital aparecem corretamente
- ✅ RLS funciona (usuário não vê dados de outros)

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

| Arquivo | Conteúdo |
|---------|----------|
| `SPRINT1A_TASKS.md` | 18 tasks com checkboxes simples |
| `SCHEMA_SPRINT1A.md` | SQL completo com triggers e RLS |
| `REACT_INTERFACES_SPRINT1A.md` | TypeScript types e componentes |
| `GUIA_EFICIENCIA_SPRINT1A.md` | Como usar Cowork vs Claude Code |
| `ROADMAP_ATUALIZADO_V2_SPRINT1A_PRIORIDADE.md` | Roadmap completo (7 sprints) |

---

## 🚀 COMO USAR ESTE BRIEF

**Pro Claude Code:**

```
"Ler arquivo BRIEF_SPRINT1A.md (este arquivo).
Implementar Sprint 1A seguindo as 18 tasks.
Usar SCHEMA_SPRINT1A.md para SQL e REACT_INTERFACES_SPRINT1A.md para componentes.
Não pergunte; arquivo tem tudo. Só implementa e avisa quando pronto pra teste."
```

**Checklist Pre-Implementação:**
- [ ] Leu BRIEF_SPRINT1A.md completamente
- [ ] Entendeu arquitetura (Realtime + 4 visões)
- [ ] Entendeu dependências entre tasks
- [ ] Entendeu Definition of Done
- [ ] Pronto pra começar com 1A.1.1

---

**Mercado está esperando. Você está pronto. Vamos nessa! 🚀**
