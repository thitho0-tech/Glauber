# ⚡ COMANDO IMEDIATO: SPRINT 1A — Command Center é Máxima Prioridade AGORA

**Data:** 26 de maio de 2026  
**Status:** 🔴 CRÍTICO — Rearranja roadmap, Command Center na frente

---

## Por Que Command Center Primeiro?

**Dois fundamentos que DEVEM estar juntos, mas em ordem:**

### 1️⃣ **Fundação Psicológica (Sprint 1A: Command Center)**
- Usuário loga → vê dashboard bonito, em tempo real, útil → **continua usando**
- É a "primeira impressão" que faz ficar ou sair
- **Nenhum concorrente tem isso no Brasil**: Movie Magic não, StudioBinder não
- Retenção imediata = diferencial claro desde semana 1

### 2️⃣ **Fundação Técnica (Sprint 1B: Fiscal)**
- Storage, NF, fornecedores, audit = confiança legal
- Precisa estar sólido, mas não precisa ser lindo
- É o "motor" que sustenta a ferramenta
- Entra APÓS o usuário estar vendo valor

---

## Nova Estrutura Sprint 1

### **SPRINT 1A — Command Center + Auth (2-3 semanas)**

**Foco:** Dashboard em tempo real + infra de auth  
**Objetivo:** Usuário loga → vê Command Center robusto

#### Arquitetura
```
Dashboard (/projetos/[id]/dashboard)
├─ Supabase Realtime (WebSocket)
├─ Schema: projeto_kpis (com triggers automáticos)
├─ 4 Visões Segmentadas:
│  ├─ DP/Produtor: KPIs + alertas edital
│  ├─ Diretor: próximos eventos criativos
│  ├─ AD: stripboard próximos dias + OD status
│  └─ Colaborador: minhas tarefas + notificações
└─ Sucesso: < 2s load, < 500ms realtime, 50+ usuários
```

#### Tasks Principais
1. Scaffold `/projetos/[id]/dashboard`
2. Setup Supabase Realtime
3. Schema `projeto_kpis` com triggers
4. 4 visões segmentadas funcionando
5. Auth: senha 8 chars + Magic Link + RLS
6. Testes de carga (50+ usuários simultâneos)

#### Métricas de Sucesso
- ✅ Dashboard carrega em < 2s
- ✅ Realtime atualiza < 500ms após mudança
- ✅ 4 visões segmentadas funcionam
- ✅ Zero erros em 50+ usuários em staging
- ✅ DP + Produtor dizem "é isso que eu esperava"

---

### **SPRINT 1B — Fundação Fiscal (2-3 semanas)**

**Foco:** Dados indo pro Command Center  
**Objetivo:** Dashboard abastecido com realidade do projeto

Quando Command Center estiver robusto:

#### Tasks (do Sprint 1 Guia original)
- F1: Storage privado (buckets, signed URLs)
- Locações por projeto
- Fornecedores + cotação + OC
- Upload NF/RPA (sem parsing XML ainda)
- Regime de contratação + dados bancários
- Audit log polimórfico
- Integração com dashboard

#### Métricas de Sucesso
- ✅ Storage 100% seguro (RLS testado)
- ✅ Upload NF funcionando
- ✅ Dados alimentando KPIs em realtime
- ✅ Audit trail completo

---

## Por Que Essa Ordem?

| Aspecto | Sprint 1A | Sprint 1B |
|---------|-----------|----------|
| **Psicologia do usuário** | "Vejo valor aqui?" | "Confio nessa ferramenta?" |
| **Visibilidade** | Dashboard bonito = retenção | Dados corretos = confiança |
| **ROI percebido** | Dia 1 da semana 1 | Semana 2-3 do mês 1 |
| **Concorrentes** | Nenhum tem isso | Todos têm versões piores |
| **Destranca personas** | DP + Produtor imediato | DP + Produtor completo |

---

## Novo Sequenciamento Total (28 semanas)

```
Sprint 1A (2-3 sem): Command Center ⭐ + Auth
Sprint 1B (2-3 sem): Fundação Fiscal (Storage, NF, Locações, Fornecedores, Audit)
Sprint 2 (3 sem): Conversa Criativa
Sprint 3 (4 sem): Decupagem Viva
Sprint 4 (4 sem): Stripboard + DOOD + OD
Sprint 5 (6 sem): Frame.io Brasileiro
Sprint 6 (5 sem): Folha + Pacote Funcultura
Sprint 7 (3 sem): Refinamentos + Lançamento

Total: ainda ~28 semanas (Sprint 1 dividido em 2 fases, mas mesma duração)
```

---

## 🚀 Ação Imediata (Próximos 2 dias)

### **Tech Lead:**
1. Validar Supabase Realtime (websocket em staging)
2. Testar carga: 50+ usuários simultâneos
3. Planejar load test

### **PM:**
1. Comunicar para DP (Tereza) + Produtor (Chico):
   - "Command Center sai em Sprint 1A (semanas 1-3), não depois"
   - "Isso é o diferencial — ninguém tem"
2. Validar que é isso que querem como "primeira coisa"

### **Designer:**
1. Mockups das 4 visões (DP, Diretor, AD, Colaborador)
2. Paleta para KPIs (alertas, warnings, neutro)
3. Iconografia de métricas

### **Codebase:**
1. Criar migration `0024_projeto_kpis.sql`
2. Criar componente `<CommandCenter />`
3. Criar hook `useProjectKPIs(projectId)`
4. Setup realtime subscription logic

---

## 📋 Checklist Sprint 1A

- [ ] Tech Lead: validou Supabase Realtime + load test plan
- [ ] PM: comunicou com DP/Produtor sobre prioridade
- [ ] Designer: mockups das 4 visões
- [ ] Criar migration `0024_projeto_kpis.sql`
- [ ] Criar componente `<CommandCenter />`
- [ ] Criar lib `useProjectKPIs()` hook
- [ ] Setup CI/CD para staging deploy
- [ ] Teste com 50+ usuários simultâneos

---

## 🎁 Resultado Esperado (Fim de Sprint 1A - Semana 3)

Usuário loga no GLAUBER → vê um dashboard bonito, em tempo real, que mostra exatamente o que precisa saber sobre seu projeto.

**Impacto:**
- ✅ Retenção imediata ("Isso é útil!")
- ✅ Diferencial claro vs concorrentes
- ✅ DP + Produtor já veem valor

**Depois disso:**
- Sprint 1B: coloca dados no Command Center
- Sprint 2+: mais funcionalidades

---

## ⚠️ Possíveis Objeções (E Respostas)

**"Mas precision fiscal primeiro!"**  
→ Fiscal é importante, mas sem usuário retido, não importa. Command Center = retenção. Fiscal = confiança. Ambos precisam, mas nesta ordem.

**"Supabase Realtime é novo demais?"**  
→ Sim, é novo. Por isso testamos em staging com 50+ usuários. Se cair, fallback a polling a cada 5s.

**"Devia ser em paralelo?"**  
→ Não: 1A precisa estar robusto antes de colocar dados nele em 1B. Sequencial é mais seguro.

---

## 📞 Perguntas Frequentes

**P: Command Center é realmente prioridade máxima?**  
R: Sim. Mudança estratégica. Fundação psicológica > fundação técnica na ordem de execução.

**P: Quanto tempo Sprint 1A vai tomar?**  
R: 2-3 semanas se equipe dedicada + nenhuma interrupção.  
Risco: Realtime é novo; reservar 20% para debugging.

**P: E depois de Sprint 1A?**  
R: Imediatamente Sprint 1B. DP/Produtor continuam usando 1A enquanto você coloca dados nele.

---

**Este é o pivô estratégico. Command Center é a "porta de entrada". Fiscal é o "motor".**

**Pronto para começar?**
