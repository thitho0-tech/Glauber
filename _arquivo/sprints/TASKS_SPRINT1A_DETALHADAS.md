# 📋 Tasks Detalhadas Sprint 1A (18 Tasks)

**Fase 1: Cowork - Specs & Documentação**

## Group 1A.1: Dashboard + Realtime Setup (3 dias)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.1.1 | Setup pasta `/dashboard` | Criar estrutura de pastas e arquivo `[id]/dashboard.tsx` | 2 | Nenhuma |
| 1A.1.2 | Layout base dashboard | Criar grid layout responsivo com 4 colunas | 3 | 1A.1.1 |
| 1A.1.3 | Conectar Supabase Realtime | Setup cliente Realtime, subscribe a `projeto_kpis` | 3 | 1A.1.2 |

## Group 1A.2: Schema SQL + Triggers (1.5 dias)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.2.1 | Criar migration 0024 | File `migrations/0024_projeto_kpis.sql` | 2 | Nenhuma |
| 1A.2.2 | Definir schema `projeto_kpis` | Columns, tipos, constraints, índices | 3 | 1A.2.1 |
| 1A.2.3 | Criar triggers automáticos | Triggers p/ atualizar KPIs ao inserir dados | 3 | 1A.2.2 |

## Group 1A.3: Hook + Realtime Subscribers (1 dia)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.3.1 | Hook `useProjectKPIs()` | TypeScript, realtime subscription, cleanup | 3 | 1A.1.3, 1A.2.3 |
| 1A.3.2 | Testes do hook | Unit tests, mock Supabase | 2 | 1A.3.1 |

## Group 1A.4: 4 Visões Segmentadas (2 dias)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.4.1 | Visão DP/Produtor | KPIs + alertas edital, layout | 3 | 1A.3.1 |
| 1A.4.2 | Visão Diretor | Próximos eventos criativos, paleta cores | 3 | 1A.3.1 |
| 1A.4.3 | Visão AD | Stripboard próximos dias + OD status | 3 | 1A.3.1 |
| 1A.4.4 | Visão Colaborador | Minhas tarefas + notificações | 2 | 1A.3.1 |

## Group 1A.5: Auth (1 dia)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.5.1 | Validação senha 8 chars | Regex, error messages | 1 | Nenhuma |
| 1A.5.2 | Magic Link flow | Email send, verify link | 3 | 1A.5.1 |
| 1A.5.3 | RLS por projeto | Policies em `projeto_kpis` + testes | 3 | 1A.2.2 |

## Group 1A.6: Testes Performance (1.5 dias)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.6.1 | Unit tests | Hooks, utils | 2 | 1A.3.2 |
| 1A.6.2 | Integration tests | Componentes + Realtime | 3 | 1A.4.4 |
| 1A.6.3 | Performance test | Verificar < 2s load, < 500ms realtime | 3 | 1A.6.2 |

## Group 1A.7: Load Testing (1 dia)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.7.1 | Setup load test | K6 ou similar, 50+ usuários simultâneos | 3 | 1A.6.3 |

## Group 1A.8: Deploy + Validação (1 dia)

| ID | Task | Descrição | Story Points | Dependências |
|----|------|-----------|--------------|--------------|
| 1A.8.1 | Deploy staging | Vercel preview deployment | 2 | 1A.7.1 |
| 1A.8.2 | Validação com DP | Tela com DP/Produtor, feedback | 2 | 1A.8.1 |

---

## 📊 Resumo

- **Total de tasks:** 18
- **Total de story points:** ~50 pontos
- **Duração estimada:** 2-3 semanas (se 1 dev full-time)
- **Velocidade:** ~8-12 pontos/semana (ajustar conforme aprende)

## Kanban Status Inicial

Todos começam em **Não Iniciado**:
```
[ Não Iniciado ] [ Em Progresso ] [ Review ] [ Pronto ]
      18 tasks          0             0         0
```
