# 📝 CONVERSA: Sessão GLAUBER Sprint 1A Setup

**Data:** 26-27 de maio de 2026  
**Projeto:** GLAUBER (rebranding de CINEFLOW)  
**Fase:** 1 + 2 (Specs + Local Setup)  
**Status:** ✅ Completa (pronto para Fase 3: Claude Code)

---

## 📋 CONTEXTO

### O Que Foi Feito Nesta Sessão

1. **Consolidação de Roadmap**
   - Integrou: Auditoria 4 Personas + Relatório Técnico
   - Resultado: ROADMAP_ATUALIZADO_V2_SPRINT1A_PRIORIDADE.md
   - Decisão: **Command Center como MÁXIMA PRIORIDADE** (fundação psicológica antes de técnica)

2. **Decisão: 3-Phase Workflow**
   - FASE 1 (Cowork): Specs & Documentação (1-2 semanas)
   - FASE 2 (Local): Setup Ambiente (24-48 horas)
   - FASE 3 (Claude Code): Implementação (2-3 semanas)
   - **Token Economy:** 25-60K total vs 100K+ se desordenado

3. **FASE 1 Concluída**
   - ✅ Tarefa 1.1: 18 tasks quebradas com checkboxes
   - ✅ Tarefa 1.2: AC básica + dependências
   - ✅ Tarefa 1.3: Schema SQL completo (3 triggers)
   - ✅ Tarefa 1.4: React interfaces (TypeScript)
   - ✅ Tarefa 1.5: BRIEF_SPRINT1A.md (arquivo único com TUDO)

4. **FASE 2 Em Andamento**
   - ✅ Git instalado (v2.54.0)
   - ✅ Node.js, npm prontos
   - ✅ Pasta Cineflow renomeada para Glauber
   - 🔄 Próximos: git init, conectar GitHub, fazer push

---

## 📚 ARQUIVOS CRIADOS/MODIFICADOS

| Arquivo | Tipo | Status | Descrição |
|---------|------|--------|-----------|
| **BRIEF_SPRINT1A.md** | 📄 Novo | ✅ Pronto | Arquivo único com TUDO (enviar pro Claude Code) |
| **SPRINT1A_TASKS.md** | 📄 Novo | ✅ Pronto | 18 tasks com checkboxes + AC básica |
| **SCHEMA_SPRINT1A.md** | 📄 Novo | ✅ Pronto | SQL completo (tabela, 3 triggers, RLS) |
| **REACT_INTERFACES_SPRINT1A.md** | 📄 Novo | ✅ Pronto | TypeScript types, hooks, 5 componentes |
| **GUIA_EFICIENCIA_SPRINT1A.md** | 📄 Novo | ✅ Pronto | Manual 3 fases (quando usar Cowork vs Claude Code) |
| **PROXIMO_PASSO_AGORA.md** | 📄 Novo | ✅ Pronto | Checklist + timeline |
| **ROADMAP_ATUALIZADO_V2_SPRINT1A_PRIORIDADE.md** | 📄 Novo | ✅ Pronto | Roadmap completo 7 sprints |
| **GLAUBER_COMANDO_IMEDIATO_SPRINT1A.md** | 📄 Novo | ✅ Pronto | Operacional (para comunicar com DP/time) |

**Total:** 13+ arquivos | ~85KB | 100% Pronto

---

## 🎯 O QUE É SPRINT 1A

**Command Center + Auth** — Dashboard em tempo real como home de cada projeto.

```
Usuário loga → vê dashboard bonito + atualiza <500ms → "É útil!"
├─ 4 visões segmentadas (DP, Diretor, AD, Colaborador)
├─ KPIs dinâmicos (roteiro %, orçamento %, prazos, eventos)
├─ Realtime via Supabase WebSocket
└─ Auth: Senha 8 chars + Magic Link + RLS por projeto
```

---

## 🏗️ ARQUITETURA SPRINT 1A

```sql
Tabela: projeto_kpis
├─ id, projeto_id
├─ roteiro_filmado_pct (0-100, via trigger dia_cenas)
├─ orcamento_comprometido_pct (0-100, via trigger despesa)
├─ prazos_criticos (array JSON, via trigger editais)
├─ proximos_eventos (array JSON)
└─ Realtime subscription (WebSocket)

Triggers:
├─ recalcular_roteiro_filmado_pct()
├─ recalcular_orcamento_comprometido_pct()
└─ atualizar_prazos_criticos()

RLS:
└─ Usuário vê apenas KPIs de seus projetos
```

---

## 📋 18 TASKS SPRINT 1A

```
Group 1A.1: Dashboard + Realtime (3 dias)
  ☐ 1A.1.1 — Setup pasta `/dashboard` (2 pts)
  ☐ 1A.1.2 — Layout base dashboard (3 pts)
  ☐ 1A.1.3 — Conectar Supabase Realtime (3 pts)

Group 1A.2: Schema SQL + Triggers (1.5 dias)
  ☐ 1A.2.1 — Criar migration 0024 (2 pts)
  ☐ 1A.2.2 — Definir schema projeto_kpis (3 pts)
  ☐ 1A.2.3 — Criar triggers automáticos (3 pts)

Group 1A.3: Hook + Realtime (1 dia)
  ☐ 1A.3.1 — Hook useProjectKPIs() (3 pts)
  ☐ 1A.3.2 — Testes do hook (2 pts)

Group 1A.4: 4 Visões (2 dias)
  ☐ 1A.4.1 — Visão DP/Produtor (3 pts)
  ☐ 1A.4.2 — Visão Diretor (3 pts)
  ☐ 1A.4.3 — Visão AD (3 pts)
  ☐ 1A.4.4 — Visão Colaborador (2 pts)

Group 1A.5: Auth (1 dia)
  ☐ 1A.5.1 — Validação senha 8 chars (1 pt)
  ☐ 1A.5.2 — Magic Link flow (3 pts)
  ☐ 1A.5.3 — RLS por projeto (3 pts)

Group 1A.6: Testes (1.5 dias)
  ☐ 1A.6.1 — Unit tests (2 pts)
  ☐ 1A.6.2 — Integration tests (3 pts)
  ☐ 1A.6.3 — Performance test (3 pts)

Group 1A.7: Load Testing (1 dia)
  ☐ 1A.7.1 — Setup load test 50+ users (3 pts)

Group 1A.8: Deploy (1 dia)
  ☐ 1A.8.1 — Deploy staging (2 pts)
  ☐ 1A.8.2 — Validação com DP (2 pts)

Total: 18 tasks | 50 pts | 2-3 semanas
```

---

## 🚀 3-PHASE WORKFLOW

### FASE 1: Cowork — Specs ✅ COMPLETA

**Resultado:** BRIEF_SPRINT1A.md pronto  
**Token Cost:** ~5-10K

### FASE 2: Local Setup 🔄 ANDANDO

**O fazer:**
1. ✅ Instalar ferramentas
2. ✅ Renomear pasta
3. 🔄 `git init`
4. 🔄 Conectar GitHub
5. 🔄 Push
6. 🔄 Vercel

**Token Cost:** 0

### FASE 3: Claude Code ⏳ PRÓXIMA

**O fazer:**
1. Brief: BRIEF_SPRINT1A.md
2. Implementar 18 tasks
3. Testes + load test
4. Deploy + validação

**Token Cost:** ~20-50K

**Total:** 25-60K (barato!)

---

## ✅ PRÓXIMOS PASSOS IMEDIATOS

PowerShell:

```powershell
cd "C:\Users\Thiago França\Documents\Claude\Projects\Glauber"

git init
git config user.name "Thiago França"
git config user.email "thitho0@gmail.com"

git remote add origin https://github.com/thitho0-tech/glauber.git
git remote -v

git add .
git commit -m "initial: renomear CINEFLOW para GLAUBER"
git branch -M main
git push -u origin main
```

Depois:
- Vercel: https://vercel.com → New Project → glauber repo

---

## 📊 STATUS

```
✅ FASE 1: 100% Completa
🔄 FASE 2: 70% (próximo: git init + push)
⏳ FASE 3: Aguardando Fase 2
```

---

## 💡 KEY DECISION: Por que Command Center Primeiro?

**Duas fundações em ORDEM:**

1. **Psicológica (1A):** Usuário vê valor → continua
2. **Técnica (1B):** Dados corretos → confia

**Ordem:** Retenção primeiro, depois confiança

---

**Arquivo salvo em:** `Glauber/CONVERSAS_SESSAO_GLAUBER_SPRINT1A.md`

**Para futuras conversas:** Leia este arquivo para retomar contexto!
