# ⚡ GLAUBER — PRIORIDADE MÁXIMA: COMMAND CENTER

**Data:** 26 de maio de 2026  
**Status:** 🔴 CRÍTICO — Inserir AGORA no roadmap  
**Impacto:** Retenção de usuário + diferencial competitivo

---

## 🎯 Por Que Command Center é Prioridade Máxima?

Do **Relatório Master de Avaliação Técnica:**

> "A ausência de uma visão centralizada é o maior gargalo para a eficiência da equipe."

> "Este bloco deve ser a página inicial de cada projeto. Ele não deve apenas exibir dados, mas sim refletir o estado vivo da produção."

**Impacto direto:**
- ✅ **Retenção de usuário** — primeira coisa que vê ao abrir projeto
- ✅ **Diferencial competitivo** — Movie Magic + StudioBinder não têm isso
- ✅ **Satisfação imediata** — DP/Produtor veem ROI no dia 1
- ✅ **Destranca múltiplas personas** — Diretor, AD, DP precisam de dashboard em tempo real

---

## 🏗️ Novo Roadmap com Command Center em Prioridade Máxima

### **SPRINT 1 — FASE A: Command Center + Auth (2-3 semanas)**

**Foco:** Dashboard em tempo real + infraestrutura de auth  
**Objetivo:** Usuário loga → vê Command Center robusto

#### Tasks:

**1A.1: Command Center — Scaffold + Realtime (3 dias)**
- [ ] Criar página `/projetos/[id]/dashboard`
- [ ] Setup Supabase Realtime (websocket)
- [ ] Schema para KPIs:
  ```sql
  create table projeto_kpis (
    id uuid primary key,
    projeto_id uuid references projetos(id),
    roteiro_filmado_pct decimal,      -- % cenas rodadas
    orcamento_comprometido_pct decimal, -- % gasto
    prazos_criticos jsonb,            -- datas importantes
    proximos_eventos jsonb,           -- reuniões, diárias
    updated_at timestamp default now(),
    updated_by uuid                   -- quem fez última mudança
  );
  ```
- [ ] Trigger: ao atualizar `dia_cenas`, recalcula KPI "roteiro_filmado_pct"
- [ ] Trigger: ao lançar despesa, recalcula "orcamento_comprometido_pct"

**1A.2: Visões Segmentadas do Command Center (2 dias)**
- [ ] **Visão DP/Produtor:** KPIs principais + alertas de edital
  - % roteiro filmado
  - % orçamento comprometido
  - Datas críticas (prestação, pagamentos)
  - Alertas de conformidade Funcultura
  
- [ ] **Visão Diretor:** Próximos eventos criativos
  - Reuniões agenda
  - Tarefas pendentes (aprovações)
  - Decupagem status
  
- [ ] **Visão AD:** Stripboard próximos dias + OD status
  - Dias com maior volume de cenas
  - Dependências de equipe
  
- [ ] **Visão Colaborador:** Minhas tarefas + notificações
  - O que foi atribuído a mim
  - Prazos
  - Status

**1A.3: Auth Corrigido (1 dia)**
- [ ] Senha 8 chars
- [ ] Magic Link recovery
- [ ] RLS por projeto

**1A.4: Testes + Deploy Staging (1 dia)**
- [ ] Command Center carrega em < 2s
- [ ] Realtime atualiza < 500ms após mudança
- [ ] Sem lag em 50+ usuários simultâneos

---

### **SPRINT 1 — FASE B: Fundação Fiscal (2-3 semanas)**

Quando Command Center estiver robusto:

**1B.1-1B.5:** Storage, Locações, Fornecedores, Despesas, Audit Log  
(Conforme guia técnico original)

---

### **Novo Sequenciamento de Sprints**

```
Sprint 1A (2-3 sem): Command Center ⭐ + Auth
Sprint 1B (2-3 sem): Fundação Fiscal (Storage, NF, Locações, Fornecedores, Audit)
Sprint 2 (3 sem): Conversa Criativa
Sprint 3 (4 sem): Decupagem Viva
Sprint 4 (4 sem): Stripboard + DOOD + OD
Sprint 5 (6 sem): Frame.io Brasileiro
Sprint 6 (5 sem): Folha + Pacote Funcultura
Sprint 7 (3 sem): Refinamentos + Lançamento

Total: ainda ~28 semanas (dividido em 2 fases de Sprint 1)
```

---

## 💡 Por Que Isso Funciona

### Command Center é a **Fundação Psicológica**

1. **Retenção:** Usuário abre GLAUBER → vê dashboard bonito e útil → continua usando
2. **Realtime:** Mudanças aparecem em tempo real → sensação de "ferramenta viva"
3. **Contexto:** Cada persona vê o que importa para ela → reduz cognitive load
4. **Diferencial:** Nenhum concorrente tem isso no mercado BR

### Fundação Fiscal é a **Fundação Técnica**

- Storage privado, RLS, Audit Log são pré-requisitos para confiança legal
- Mas não precisam ser bonitos no Sprint 1 — precisam funcionar

**Estratégia:** Command Center bonito + Fiscal funcional = usuário confiante + seguro

---

## 🔧 Impacto no Stack Técnico

### Novo pré-requisito: Supabase Realtime

```typescript
// Lib para subscribe a KPIs em realtime
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useProjectKPIs(projectId: string) {
  const [kpis, setKPIs] = useState(null);
  
  useEffect(() => {
    const subscription = supabase
      .from(`projeto_kpis`)
      .on('*', (payload) => {
        if (payload.new.projeto_id === projectId) {
          setKPIs(payload.new);
        }
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [projectId]);
  
  return kpis;
}
```

### Componentes principais do Command Center

```
<CommandCenter projeto_id={id}>
  <KPIRow> {/* 4 números principais */}
    <KPI title="Roteiro Filmado" value="70%" trend="↗" />
    <KPI title="Orçamento" value="65%" trend="→" />
    <KPI title="Datas Críticas" value="3" trend="⚠" />
    <KPI title="Tarefas Pendentes" value="8" trend="→" />
  </KPIRow>
  
  <SegmentedView role={user.role}>
    {/* Visão DP: alertas + cronograma */}
    {/* Visão AD: stripboard visual */}
    {/* Visão Diretor: tarefas + aprovações */}
    {/* Visão Colaborador: minhas atividades */}
  </SegmentedView>
  
  <AlertBanner>
    {/* Alertas de conformidade, prazos vencidos, etc */}
  </AlertBanner>
</CommandCenter>
```

---

## 📊 Métricas de Sucesso — Command Center

**Sprint 1A termina quando:**

- ✅ Dashboard carrega em < 2s
- ✅ Realtime atualiza < 500ms após qualquer mudança
- ✅ 4 visões segmentadas funcionam corretamente
- ✅ Zero erros em 50+ usuários simultâneos em staging
- ✅ DP + Produtor dizem "é isso que eu esperava"
- ✅ Alertas de edital aparecem corretamente

---

## ⚠️ Riscos — Command Center

| Risco | Mitigação |
|-------|-----------|
| Supabase Realtime instável | Testar com load test; fallback a polling a cada 5s |
| KPI calculations lentas | Usar triggers, não fazer cálculo no frontend |
| Muitos usuários = performance | Índices em `projeto_kpis`; pagination em alertas |
| RLS complexo em dashboard | Code review rigoroso; teste de segurança |

---

## 🚀 Ação Imediata

### Hoje:

1. **Tech Lead:** Validar stack Supabase Realtime
   - Testar websocket em staging
   - Calcular custo (realtime está incluído no plano Supabase)
   - Planejar load testing

2. **PM:** Comunicar mudança de prioridade
   - Informar que Command Center sai em Sprint 1A (não depois)
   - Validar com DP/Produtor que é isso que querem como "primeira coisa"

3. **Designer:** Sketchar as 4 visões
   - Mockups Command Center por persona
   - Paleta de cores para alertas/warnings
   - Iconografia de KPIs

### Dentro de 2 dias:

1. Atualizar GLAUBER_Roadmap_Consolidado_V1.docx com Sprint 1A/1B
2. Criar task "Command Center — Scaffold + Realtime" em Jira/Linear
3. Estimar pontos (provavelmente 8-13 story points)

---

## 📋 Checklist para Começar Sprint 1A

- [ ] Tech Lead: validou Supabase Realtime + load test plan
- [ ] PM: comunicou com DP/Produtor que Command Center é semana 1-3
- [ ] Designer: mockups das 4 visões
- [ ] Criar migration `0024_projeto_kpis.sql`
- [ ] Criar componente `<CommandCenter />` scaffold
- [ ] Criar lib `useProjectKPIs()` hook
- [ ] Setup CI/CD para staging deploy
- [ ] Criar test environment com 50+ usuários simulados

---

## 🎁 Resultado Esperado

**Fim de Sprint 1A (semana 3):**

Usuário loga no GLAUBER → vê um dashboard bonito, em tempo real, que mostra exatamente o que precisa saber sobre seu projeto. 

**Impacto:**
- ✅ Retenção imediata ("Isso é útil!")
- ✅ Diferencial claro vs. concorrentes
- ✅ DP + Produtor já veem valor

**Depois disso:**
- Sprint 1B: Coloca os dados no Command Center (Fiscal, Locações, Fornecedores)
- Sprint 2+: Mais funcionalidades (Conversa, Decupagem, etc)

---

**Este é o pivô estratégico. Command Center é a "porta de entrada" que faz o usuário ficar. Fiscal é o "motor" que faz ele confiar. Ambos precisam, mas nesta ordem.**

**Pronto para começar?**
