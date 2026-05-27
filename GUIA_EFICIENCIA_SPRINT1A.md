# 🎯 GUIA DE EFICIÊNCIA PARA SPRINT 1A
## Quando Usar Cowork vs Claude Code

**Data:** 26 de maio de 2026  
**Propósito:** Maximizar eficiência, economizar tokens, manter segurança  
**Público:** Você (programador iniciante) + Tech Lead + Time

---

## 📊 VISÃO GERAL

```
FASE 1: Cowork (1-2 semanas)     FASE 2: Local Setup (24-48h)     FASE 3: Claude Code (2-3 semanas)
├─ Specs                         ├─ Clone repo                     ├─ Implementar tasks
├─ Documentação                  ├─ npm install                    ├─ Testar realtime
├─ Artifacts visuais             ├─ Supabase local                 ├─ Deploy staging
└─ Definition of Done            └─ 1º commit

TOKEN ECONOMY:
Fase 1: 5-10K (conversação, specs)
Fase 2: 0 tokens (local, grátis)
Fase 3: 20-50K (código reutiliza Fase 1) = 25-60K TOTAL vs 100K+ se desordenado
```

---

## FASE 1: COWORK — Specs & Documentação (1-2 semanas)

### ✅ Quando Usar Cowork Nesta Fase

**USE COWORK quando:**
1. **Você está documentando requisitos** — Specs, arquitetura, schema BD
2. **Você está planejando** — Quebrar Sprint 1A em 15-20 micro-tasks
3. **Você precisa de feedback rápido** — Validar prioridades com DP/Produtor
4. **Você cria artifacts visuais** — Kanban, fluxogramas, decision trees

### 📋 Tarefas Concretas (Cowork)

#### Tarefa 1.1: Criar Artifact Visual — Sprint 1A Kanban
```
Duração: 1 dia
Resultado: Kanban interativo mostrando todas as 15-20 tasks do Sprint 1A
Como fazer:
  • Criar HTML artifact com Grid.js (tabela sortável)
  • Colunas: Task ID | Descrição | Story Points | Status | Owner
  • Integrar com dados locais (localStorage)
  • Permitir arrastar tasks entre colunas (não formal, só visual)
```

#### Tarefa 1.2: Quebrar Sprint 1A em Micro-Tasks
```
Duração: 2-3 dias
Resultado: 15-20 tasks detalhadas com story points e acceptance criteria
Como fazer:
  • Usar ROADMAP_ATUALIZADO_V2_SPRINT1A_PRIORIDADE.md como referência
  • Para cada task:
    - ID: 1A.1, 1A.2, ... 1A.15
    - Título claro (verbo + objeto)
    - Descrição (2-3 linhas)
    - Story points (estimativa)
    - Acceptance criteria (3-5 pontos)
    - Dependências (se houver)
  • Exemplo:
    Task 1A.1: Criar Migration 0024_projeto_kpis.sql
    - Story points: 3
    - Descrição: Adicionar table projeto_kpis com triggers de atualização
    - AC: 
      ✓ Migration executa sem erros
      ✓ Triggers automáticos no lugar
      ✓ RLS configurado por projeto
      ✓ Índices criados em updated_at
    - Depende de: nada (primeira tarefa)
```

#### Tarefa 1.3: Documentar SQL Schema Completo
```
Duração: 1 dia
Resultado: Arquivo SCHEMA_SPRINT1A.md com DDL + explicações
Como fazer:
  • Copiar do ROADMAP_ATUALIZADO_V2_SPRINT1A_PRIORIDADE.md (seção "Schema Novo")
  • Expandir com:
    - Comentários inline explicando cada coluna
    - Índices necessários
    - Triggers detalhados
    - RLS policies (quem vê o quê)
  • Exemplo:
    ```sql
    create table projeto_kpis (
      id uuid primary key default gen_random_uuid(),
      projeto_id uuid not null references projetos(id),
      -- % do roteiro que já foi filmado (0-100)
      roteiro_filmado_pct decimal(5,2),
      -- % do orçamento já comprometido em despesas (0-100)
      orcamento_comprometido_pct decimal(5,2),
      -- Datas de vencimentos críticos (editais, pagamentos)
      prazos_criticos jsonb,           -- ["2026-06-15", "2026-07-20"]
      -- Próximos eventos criados/atualizados
      proximos_eventos jsonb,          -- [{tipo, data, responsavel}]
      updated_at timestamp default now(),
      updated_by uuid references auth.users(id),
      constraint projeto_kpis_pct_check check (
        roteiro_filmado_pct between 0 and 100
        and orcamento_comprometido_pct between 0 and 100
      )
    );
    
    -- RLS: cada usuário vê apenas KPIs dos projetos que tem acesso
    alter table projeto_kpis enable row level security;
    create policy "usuarios_veem_proprios_kpis"
      on projeto_kpis for select
      using (existe_acesso_projeto(auth.uid(), projeto_id));
    ```
```

#### Tarefa 1.4: Documentar React Interfaces
```
Duração: 1 dia
Resultado: Arquivo REACT_INTERFACES_SPRINT1A.md com tipos + componentes
Como fazer:
  • TypeScript interfaces para cada componente
  • Props esperadas
  • Estados internos
  • Hooks customizados
  • Exemplo:
    ```typescript
    // useProjectKPIs.ts
    type ProjectKPIs = {
      id: string;
      roteiro_filmado_pct: number;      // 0-100
      orcamento_comprometido_pct: number; // 0-100
      prazos_criticos: string[];        // ISO dates
      proximos_eventos: Array<{
        tipo: "edital" | "pagamento" | "evento_criativo";
        data: string;                   // ISO date
        responsavel: string;            // user name
      }>;
      updated_at: string;
      updated_by: string;
    };
    
    export function useProjectKPIs(
      projectId: string,
      options?: { pollInterval?: number }
    ): {
      kpis: ProjectKPIs | null;
      loading: boolean;
      error: Error | null;
      refetch: () => Promise<void>;
    }
    
    // CommandCenter.tsx
    type CommandCenterProps = {
      projectId: string;
      userRole: "dp" | "produtor" | "diretor" | "ad" | "colaborador";
    };
    
    export function CommandCenter({ projectId, userRole }: CommandCenterProps) {
      const { kpis, loading, error } = useProjectKPIs(projectId);
      
      if (loading) return <CommandCenterSkeleton />;
      if (error) return <ErrorCard error={error} />;
      
      return (
        <div className="command-center">
          {renderViewByRole(userRole, kpis)}
        </div>
      );
    }
    ```
```

#### Tarefa 1.5: Criar Definition of Done (DoD)
```
Duração: 0.5 dias
Resultado: Checklist que cada task deve completar
Como fazer:
  Cada task deve ter:
  ✓ Código escrito e comentado
  ✓ Testes passando (unit ou integration)
  ✓ Sem console.log() ou debugger deixados
  ✓ Code review por 1 pessoa
  ✓ Merge em sprint-1a branch
  ✓ Deployment em staging
  ✓ Validação com DP (se feature, não infra)
  ✓ Documentação atualizada se necessário
  ✓ Performance: <2s load, <500ms realtime (para tasks de realtime)
  ✓ RLS testado manualmente (para tasks de segurança)
```

#### Tarefa 1.6: Validar Supabase Realtime
```
Duração: 1 dia
Resultado: Confiança que Supabase Realtime funcionará em produção
Como fazer:
  • Ler documentação oficial: https://supabase.com/docs/guides/realtime
  • Testar em staging:
    - Criar 2 abas do navegador
    - Login em ambas
    - Atualizar KPI em uma
    - Verificar se atualiza na outra em <500ms
    - Tentar com 10+ abas simultâneas
  • Documentar no arquivo VALIDACAO_SUPABASE_REALTIME.md:
    - Tempo observado (deve ser <500ms)
    - Número de usuários testado
    - Fallback se cair (polling cada 5s)
    - Recomendação final (libera ou bloqueia)
```

#### Tarefa 1.7: Criar BRIEF_SPRINT1A.md
```
Duração: 2 dias
Resultado: Arquivo único com TUDO que Claude Code precisa saber
Como fazer:
  • Consolidar em 1 arquivo:
    - Visão geral (1 parágrafo)
    - 7 sprints resumidos (1 linha cada)
    - Sprint 1A detalhado:
      * Arquitetura (com diagrama)
      * Schema SQL completo
      * React interfaces
      * 15-20 tasks com AC
      * Success criteria
      * Riscos + mitigações
    - Definition of Done
    - Métricas de sucesso
    - Próximas ações após 1A
  • Objetivo: Enviar BRIEF_SPRINT1A.md para Claude Code e ele entender 100%
    sem precisar voltar pra perguntar
```

### 🎯 Checklist Fase 1

- [ ] Artifact Kanban criado
- [ ] 15-20 tasks quebradas com story points
- [ ] Schema SQL documentado
- [ ] React interfaces documentadas
- [ ] Definition of Done definido
- [ ] Supabase Realtime validado em staging
- [ ] BRIEF_SPRINT1A.md pronto (1 arquivo com tudo)
- [ ] DP/Produtor validaram prioridades

**Resultado esperado:** Você tem um "playbook" completo; pronto para ir pro Claude Code.

---

## FASE 2: LOCAL SETUP — Preparo do Ambiente (24-48 horas)

### ✅ Quando Usar Cowork Nesta Fase

**USE COWORK quando:**
- Você precisa de ajuda para instalar tools (Node.js, Git, etc.)
- Você tem dúvidas sobre próximos passos
- Você precisa rever Fase 1 (specs)

**❌ NÃO use Cowork para:**
- Terminal, npm commands, git (faça localmente)
- Debugging de conexões (terminal)

### 🛠️ Tarefas Concretas (Você, Localmente)

#### Setup 1: Instalar Node.js, npm, Git, VS Code
```bash
# macOS
brew install node git

# Windows
# Baixar de nodejs.org + git-scm.com + code.visualstudio.com
# Seguir instaladores padrão

# Verificar instalação
node --version    # v20+ OK
npm --version     # v10+ OK
git --version     # v2.40+ OK
```

#### Setup 2: Clonar GLAUBER Repo
```bash
cd ~/projects
git clone https://github.com/seu-user/glauber.git
cd glauber
git branch -a    # Verificar branches
git checkout -b sprint-1a  # Ou trocar pro sprint-1a se já existe
```

#### Setup 3: Instalar Dependências
```bash
npm install      # Instala tudo do package.json
npm run dev      # Começar servidor local
# Deve aparecer: "Listening on localhost:3000"
```

#### Setup 4: Setup Supabase Localmente
```bash
# Opção A: Usar Supabase Cloud (mais fácil)
# 1. Ir a supabase.com
# 2. Criar projeto "glauber-staging"
# 3. Copiar SUPABASE_URL + SUPABASE_KEY
# 4. Colar em .env.local:
#    NEXT_PUBLIC_SUPABASE_URL=seu_url
#    NEXT_PUBLIC_SUPABASE_KEY=sua_key

# Opção B: Supabase Local (mais caro em tokens, não recomendado agora)
# supabase start
```

#### Setup 5: Testar Conexão Realtime
```bash
# Enquanto npm run dev está rodando:
# 1. Abra http://localhost:3000 em 2 abas
# 2. Login em ambas com email de teste
# 3. Uma aba: clique "atualizar KPI"
# 4. Outra aba: verificar se atualiza em <500ms
# Se sim: ✅ Realtime funcionando
# Se não: Debug no arquivo VALIDACAO_SUPABASE_REALTIME.md
```

#### Setup 6: Criar Branch & 1º Commit
```bash
git checkout -b sprint-1a
# Ou se já existe: git checkout sprint-1a

# Fazer 1º commit com BRIEF_SPRINT1A.md
cp ../BRIEF_SPRINT1A.md docs/
git add docs/BRIEF_SPRINT1A.md
git commit -m "docs: adicionar brief completo Sprint 1A

- Arquitetura detalhada
- Schema SQL com triggers
- React interfaces com tipos
- 15-20 tasks com acceptance criteria
- Definition of Done
- Success metrics

Prepara equipe para implementação."

git push origin sprint-1a
```

### ⏱️ Timeline Setup

```
Dia 1 (4 horas):
- Instalação ferramentas: 1h
- Clone + npm install: 0.5h
- Setup Supabase: 0.5h
- Teste Realtime: 0.5h
- 1º commit: 0.5h

Dia 2 (1-2 horas):
- Revisar Fase 1 docs se necessário
- Fazer 2º commit com pequenos ajustes
- Notificar time que está ready
```

---

## FASE 3: CLAUDE CODE — Implementação (2-3 semanas)

### ✅ Quando Usar Claude Code Nesta Fase

**USE CLAUDE CODE quando:**
1. **Você está codificando** — Implementar tasks com specs
2. **Você precisa executar código** — Testes, deployment
3. **Você referencia Fase 1** — Ler BRIEF_SPRINT1A.md, implementar task por task

**❌ NUNCA use Claude Code para:**
- Perguntar "o que é Supabase Realtime?" (leia BRIEF_SPRINT1A.md)
- Escrever specs do zero (faça em Cowork primeiro)
- Decidir prioridades (pergunte no Cowork)

### 📋 Processo Implementação

#### Antes de Cada Task

1. **Ler task no BRIEF_SPRINT1A.md**
   ```
   Tarefa 1A.1: Criar Migration 0024_projeto_kpis.sql
   Story points: 3
   AC: 
     ✓ Migration executa sem erros
     ✓ Triggers automáticos no lugar
     ✓ RLS configurado por projeto
     ✓ Índices criados em updated_at
   ```

2. **Brief Claude Code uma só vez**
   ```
   "Ler arquivo BRIEF_SPRINT1A.md e implementar task 1A.1 seguindo AC.
   Não me pergunte o que fazer; arquivo tem tudo. Só implementa e avisa 
   quando pronto pra teste."
   ```

3. **Claude Code entrega código** — Você testa localmente

#### Durante Implementação (Seu Workflow)

```
Dia de trabalho típico:

MANHÃ (2-3 horas):
  1. npm run dev (servidor local)
  2. "Claude, implementar tasks 1A.1 até 1A.3 hoje"
  3. Claude entrega código
  4. Você testa em http://localhost:3000
  5. Se OK: git add . && git commit -m "feat: tasks 1A.1-1A.3"
  6. Se erro: "Claude, erro em 1A.2. Vê aí" (mostra erro do console)

TARDE (2-3 horas):
  1. Continuar próximas tasks (1A.4 até 1A.7)
  2. Cycle: Claude implementa → você testa → commit
  3. Se 50+ usuários em staging: "Claude, roda load test"

FIM DO DIA:
  1. git push origin sprint-1a
  2. Deploy staging: "Claude, fazer deploy"
  3. Validar em staging URL
```

#### Exemplo: Conversa com Claude Code

```
Você:
"Implementar tasks 1A.1 a 1A.3 do BRIEF_SPRINT1A.md:
- 1A.1: Migration 0024_projeto_kpis.sql
- 1A.2: Hook useProjectKPIs com Realtime
- 1A.3: Componente CommandCenter scaffold

Arquivo tem AC e schema completo. Só implementa. Avisa quando pronto."

Claude Code:
"Criando migration... Criando hook... Criando componente...
Pronto! Tudo em /app/components/CommandCenter.tsx.

Próximas etapas:
1. npm run dev
2. Testar login
3. Abrir http://localhost:3000/projetos/[id]/dashboard
4. Deve estar vazio mas sem erros

Pronto pra teste?"

Você:
[Testa localmente, vê que funcionou, mas colorido ficou feio]

"Ficou função correto! Mas CSS está feio. Continua com 1A.4 (4 visões segmentadas).
Usa Tailwind + Shadcn conforme BRIEF."

Claude Code:
[Implementa 1A.4 com design]
```

### 🔄 Ciclo Implementação

```
SEMANA 1 (Tasks 1A.1-1A.5):
Dia 1-2: Migration + Hook + CommandCenter scaffold
Dia 3-4: 4 visões segmentadas (DP, Diretor, AD, Colaborador)
Dia 5:   Auth (senha + Magic Link)
         → Deploy staging
         → Validar com DP/Produtor

SEMANA 2 (Tasks 1A.6-1A.8):
Dia 1-2: Testes (unit, integration, E2E)
Dia 3:   Load testing (50+ usuários)
Dia 4-5: Polish + deploy production
         → Celebrar 🎉
         → Iniciar Sprint 1B

SEMANA 3 (Se préciso mais time):
Dia 1-3: Refinar baseado em feedback
```

### 📊 Quando Voltar Pro Cowork (Durante Claude Code)

Use Cowork para:
- **Dúvida técnica grande** — "Realtime está caindo; o que faço?"
  → Volte pro Cowork, converse
- **Feedback DP mudou prioridades** — Ajuste BRIEF_SPRINT1A.md em Cowork
- **Bloqueado em task** — Descreva em Cowork, falta spec
- **Revisão arquitetura** — Parar, planejar, voltar

**Não volte ao Cowork para:**
- CSS não está bonito (resolve no Claude Code)
- Validação simples (resolve localmente)
- Log do npm (resolve no terminal)

---

## 🎯 SUMÁRIO: Decisão Rápida

### Você tem dúvida "X — uso Cowork ou Claude Code?"

| Pergunta | Resposta |
|----------|----------|
| "Como escrevo a migration?" | Cowork (spec) + Claude Code (código) |
| "Realtime está lento, por quê?" | Claude Code (debug local) ou Cowork se trancado |
| "Preciso de mais detalhes sobre KPIs?" | Cowork (leia BRIEF_SPRINT1A.md) |
| "Componente 1A.4 está feio" | Claude Code (styling, Tailwind) |
| "DP quer mudar prioridade de tasks" | Cowork (atualizar BRIEF) |
| "Não sei como rodar testes" | Claude Code (comanda: npm run test) |
| "Quero arquitetura mais robusta" | Cowork (planejamento) depois Claude Code |
| "Erro no login, como debugo?" | Claude Code (terminal, console.log) |
| "Quando faço deploy?" | Cowork (specs) + Claude Code (executa) |

---

## 💡 Pro Tips: Economizar Tokens

### 1. **Uma Spec Bem Feita = 50% Menos Tokens no Código**
   - Gaste 10K tokens em Fase 1 (Cowork)
   - Economize 50K tokens em Fase 3 (Claude Code)
   - NET: -40K tokens (economia!)

### 2. **BRIEF_SPRINT1A.md é Seu Tesouro**
   - Sempre que vai briefinando Claude Code, diga:
     "Vê BRIEF_SPRINT1A.md, seção X, task Y."
   - Não repita especificação
   - Economiza ~2-3K tokens por conversa

### 3. **Testes Locais Antes de Briefingi Claude Code**
   ```
   ❌ CARO:
   Você: "Não funciona"
   Claude: "Qual é o erro?"
   Você: "Vê no console"
   Claude: "Qual exatamente?"
   → 5 mensagens, 2K tokens, 30 min

   ✅ BARATO:
   Você: "Erro em useProjectKPIs:
          ReferenceError: supabase is not defined
          Arquivo: hooks/useProjectKPIs.ts linha 12"
   Claude: [Fixa em 1 resposta, 500 tokens]
   ```

### 4. **Git Commits Descrevem Contexto**
   ```
   ❌ BAD:
   git commit -m "fix: bug"

   ✅ GOOD:
   git commit -m "fix: useProjectKPIs não atualiza em realtime

   - Subscribe não estava ativo
   - Adicionado useEffect cleanup
   - Testado com 10+ usuários simultâneos
   - AC atendido: realtime <500ms"
   
   → Quando volta pro Claude Code depois, lê commit e economiza context
   ```

### 5. **1-2 Tasks por Dia (Não Tudo de Uma Vez)**
   ```
   ❌ CARO:
   "Implementa todas as 15 tasks"
   → Claude inventa specs, erro, refaz

   ✅ BARATO:
   "Implementa tasks 1A.1 até 1A.3"
   → Focado, menos erro, mais rápido
   ```

---

## 📅 Próximas Ações (AGORA)

### HOJE/AMANHÃ (24 horas)

- [ ] Ler este guia completamente
- [ ] Ler ROADMAP_ATUALIZADO_V2_SPRINT1A_PRIORIDADE.md
- [ ] Validar que entendeu diferença Cowork vs Claude Code

### DENTRO DE 2 DIAS

Comece **FASE 1: Cowork** — Especificar Sprint 1A:

- [ ] Tarefa 1.1: Artifact Kanban
- [ ] Tarefa 1.2: Quebrar em 15-20 micro-tasks
- [ ] Tarefa 1.3: Schema SQL
- [ ] Tarefa 1.4: React interfaces
- [ ] Tarefa 1.5: Definition of Done

### DENTRO DE 7-10 DIAS

Complete **Fase 1** + comece **Fase 2: Local Setup**:

- [ ] Tarefa 1.6: Validar Supabase Realtime
- [ ] Tarefa 1.7: BRIEF_SPRINT1A.md (arquivo único com tudo)
- [ ] Setup 1-6 (Node, repo, npm, Supabase, teste realtime, commit)

### SEMANA QUE VEM

Inicie **Fase 3: Claude Code** — Implementação Sprint 1A:

- [ ] Briefingi Claude Code com BRIEF_SPRINT1A.md
- [ ] Implementar tasks 1A.1-1A.3 (dia 1-2)
- [ ] Implementar tasks 1A.4-1A.5 (dia 3-4)
- [ ] Testes + staging deploy (dia 5+)

---

## 🆘 Se Ficar Trancado

**Situação:** "Não sei o que fazer"  
→ Leia este guia, seção "Quando Usar Cowork vs Claude Code"

**Situação:** "Spec está confuso"  
→ Volte ao Cowork, clarifique com DP/Produtor, atualize BRIEF

**Situação:** "Código não funciona"  
→ Terminal + console.log localmente ANTES de chamar Claude Code

**Situação:** "Realtime lento"  
→ Volte ao VALIDACAO_SUPABASE_REALTIME.md, rodar load test

**Situação:** "Não sei se é Cowork ou Claude Code"  
→ Tabela "Decisão Rápida" acima

---

## 🎁 Resultado Esperado

Fim de Fase 1 (semana 2):
- ✅ Specs 100% claros
- ✅ 15-20 tasks prontas
- ✅ Ambiente local rodando
- ✅ Time sincronizado

Fim de Fase 3 (semana 5):
- ✅ Sprint 1A funcionando
- ✅ Dashboard realtime < 2s load, < 500ms atualização
- ✅ 50+ usuários simultâneos sem erro
- ✅ DP/Produtor validam "é isso que esperava"

---

**Mercado está esperando. Você está pronto. Vamos nessa! 🚀**
