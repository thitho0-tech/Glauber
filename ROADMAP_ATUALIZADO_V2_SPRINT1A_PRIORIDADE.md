# GLAUBER — Roadmap V2 com Sprint 1A/1B (Command Center Máxima Prioridade)

**Data:** 26 de maio de 2026  
**Status:** ✅ Atualizado com estratégia Command Center first  
**Alteração Principal:** Sprint 1 dividido em 1A (dashboard) + 1B (fiscal)

---

## 📊 Resumo Executivo da Mudança

### Antigo (V1)
```
Sprint 1 (3-4 sem): Fundação Fiscal & Auth → ENTREGA: Prestação Funcultura
```

### Novo (V2) — ⭐ RECOMENDADO
```
Sprint 1A (2-3 sem): Command Center + Auth → ENTREGA: Dashboard realtime (retenção)
Sprint 1B (2-3 sem): Fundação Fiscal → ENTREGA: Dashboard abastecido (confiança)
```

**Por quê?** Duas fundações que DEVEM estar juntas, mas em ordem:
1. **Psicológica (1A):** Usuário vê valor → continua usando (diferencial vs concorrentes)
2. **Técnica (1B):** Dados corretos → confia na ferramenta (prestação legal)

---

## 🚀 Os 7 Sprints + 2 Fases (28 semanas)

| Sprint | Foco | Duração | Personas | Destrava |
|--------|------|---------|----------|----------|
| **1A** | **Command Center + Auth** ⭐ | **2-3 sem** | DP + Produtor | Dashboard realtime, retenção imediata |
| **1B** | **Fundação Fiscal** | **2-3 sem** | DP + Produtor | Upload NF, locações, fornecedores, audit |
| 2 | Conversa Criativa | 3 sem | Diretor + AD | Tarefas, atas, aprovação, @menção |
| 3 | Decupagem Viva | 4 sem | Diretor + AD | IA→registros, edição planos, versionamento |
| 4 | Stripboard + DOOD + OD | 4 sem | AD + DP | dia_cenas, DOOD, OD puxando cenas |
| 5 | Frame.io Brasileiro | 6 sem | Diretor | Player timecode, rushes, takes |
| 6 | Folha + Pacote Funcultura | 5 sem | DP | Orçamento 3 níveis, folha, RPA, pacote prestação |
| 7 | Refinamentos + Lançamento | 3 sem | Todas | Multi-produtora, CNPJ, versões, festivais |

**Total:** ~28 semanas (Sprint 1 = 4-6 semanas em 2 fases)

---

## 🏗️ Sprint 1A — Command Center + Auth (NOVO)

### Objetivo
Dashboard em tempo real como **home de cada projeto**. Usuário loga → vê exatamente o que precisa saber.

### Arquitetura
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

### Schema Novo
```sql
create table projeto_kpis (
  id uuid primary key,
  projeto_id uuid references projetos(id),
  roteiro_filmado_pct decimal,
  orcamento_comprometido_pct decimal,
  prazos_criticos jsonb,           -- ["2026-06-15", "2026-07-20"]
  proximos_eventos jsonb,          -- [{tipo, data, responsavel}]
  updated_at timestamp default now(),
  updated_by uuid
);

-- Triggers automáticos
create trigger atualizar_kpi_roteiro after insert/update on dia_cenas
  for each row execute function recalcular_roteiro_filmado_pct();

create trigger atualizar_kpi_orcamento after insert/update on despesa
  for each row execute function recalcular_orcamento_comprometido_pct();
```

### React Hook
```typescript
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

### Tasks Detalhadas
| # | Task | Duração | Responsável |
|---|------|---------|-------------|
| 1A.1 | Criar página `/dashboard` + Supabase Realtime setup | 3 dias | Dev Lead |
| 1A.2 | Schema `projeto_kpis` + triggers | 1.5 dias | Backend |
| 1A.3 | Hook `useProjectKPIs()` + subscribers | 1 dia | Frontend |
| 1A.4 | 4 visões segmentadas (DP, Dir, AD, Col) | 2 dias | Frontend |
| 1A.5 | Auth: senha 8 chars + Magic Link + RLS | 1 dia | Auth |
| 1A.6 | Testes: < 2s load, < 500ms realtime | 1.5 dias | QA |
| 1A.7 | Load test: 50+ usuários simultâneos | 1 dia | DevOps |
| 1A.8 | Deploy staging + validação com DP | 1 dia | PM |

**Total 1A:** 2-3 semanas

### Métricas de Sucesso Sprint 1A
- ✅ Dashboard carrega em < 2s
- ✅ Realtime atualiza < 500ms após mudança
- ✅ 4 visões funcionam sem erros
- ✅ Zero crashes em 50+ usuários simultâneos
- ✅ DP + Produtor dizem "é isso que esperava"
- ✅ Alertas de edital aparecem corretamente

---

## 🏗️ Sprint 1B — Fundação Fiscal (REFORMULADO)

### Objetivo
Colocar dados reais no Command Center. Quando 1A estiver robusto.

### Tasks
| # | Task | Duração | Responsável |
|---|------|---------|-------------|
| 1B.1 | F1: Storage privado + buckets + signed URLs | 2 dias | Backend |
| 1B.2 | Locações por projeto com ficha | 2 dias | DB + Frontend |
| 1B.3 | Fornecedores + cotação + OC | 2 dias | DB + Frontend |
| 1B.4 | Upload NF/RPA com validação | 2 dias | Backend |
| 1B.5 | Regime contratação + dados bancários | 1.5 dias | DB + Frontend |
| 1B.6 | Audit log polimórfico | 1 dia | Backend |
| 1B.7 | Integração com KPIs (triggers) | 1.5 dias | Backend |
| 1B.8 | Testes + validação DP | 1 dia | QA |

**Total 1B:** 2-3 semanas

### Métricas de Sucesso Sprint 1B
- ✅ Storage 100% seguro (RLS testado)
- ✅ Upload NF funcionando (sem parsing XML ainda)
- ✅ KPIs alimentados por dados reais
- ✅ Audit trail completo e imutável
- ✅ Prestação Funcultura defensável em telas

---

## 📋 Por Quê Essa Ordem?

### Psicologia do Usuário
| Estágio | Sprint 1A | Sprint 1B |
|---------|----------|----------|
| **Semana 1** | "Que legal, tem dashboard!" | n/a |
| **Semana 2** | "Tá bonito, funciona rápido" | "Já tem dados meus aqui!" |
| **Semana 3** | "Continuo usando" ← **RETENÇÃO** | "Confio nessa coisa" ← **CONFIANÇA** |

### Diferencial Competitivo
- **Movie Magic:** Não tem dashboard como home
- **StudioBinder:** Dashboard genérico, não em português, sem edital
- **GLAUBER 1A:** "Aqui é meu projeto em tempo real" ← **Nunca visto no mercado BR**

### ROI Imediato
- Semana 1-3 (1A): Usuário vê valor → continua voltando
- Semana 4-6 (1B): Usuário confia nos dados → não precisa de outras ferramentas

---

## 🚀 Próximas Ações Imediatas (24-48h)

### Tech Lead
- [ ] Validar Supabase Realtime (websocket em staging)
- [ ] Testar load: 50+ usuários simultâneos
- [ ] Planejar load testing infrastructure
- [ ] Estimar pontos para Sprint 1A

### Product Manager
- [ ] Comunicar mudança de prioridade com DP (Tereza) + Produtor (Chico)
- [ ] Validar que Command Center é "primeira coisa" que querem
- [ ] Schedular kick-off para início Sprint 1A

### Designer
- [ ] Sketchar 4 visões do Command Center
- [ ] Paleta de cores para KPIs (verde/amarelo/vermelho para alertas)
- [ ] Iconografia para métricas

### DevOps/DevEx
- [ ] Preparar CI/CD para staging deploy rápido
- [ ] Setup para testes de carga (load generation)

---

## 📚 Documentação Atualizada

Todos esses arquivos foram atualizados:
- ✅ `GLAUBER_Sumario_Executivo.md` — Sprint 1A/1B na tabela
- ✅ `GLAUBER_CONTEXTO.md` — Seção "Roadmap em 7 Sprints"
- ✅ `README_GLAUBER.md` — Matriz de decisão rápida
- ✅ `GLAUBER_PRIORIDADE_MAXIMA_COMMAND_CENTER.md` — Documento estratégico
- ✅ `GLAUBER_COMANDO_IMEDIATO_SPRINT1A.md` — Guia operacional

Documentos NÃO mudaram (permanecem válidos):
- `GLAUBER_Sprint1_Guia_Tecnico.md` — Migrar tarefas fiscais para seção 1B

---

## ⚠️ Riscos Sprint 1A + Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Supabase Realtime instável | Alto | Testar em staging com 50+ usuários. Fallback a polling a cada 5s |
| KPI calculations lentas | Médio | Usar database triggers (não frontend). Índices em projeto_kpis |
| Muitos usuários = lag | Médio | Pagination em alertas. Lazy-load de dados |
| RLS complexo = bugs | Crítico | Code review rigoroso. Teste de segurança |

---

## 🎁 Resultado Esperado

### Fim de Sprint 1A (Semana 3)
```
Usuário loga em GLAUBER 
  → vê dashboard bonito, em tempo real, exatamente o que precisa saber
  → "Isso é útil, não preciso de Movie Magic + Conta Simples + Wrapbook"
  → continua usando
```

**Impacto:**
- ✅ Retenção imediata
- ✅ Diferencial claro vs concorrentes
- ✅ DP + Produtor já veem valor no dia 1

### Fim de Sprint 1B (Semana 6)
```
Dashboard abastecido com dados reais
  → DP confia nos números
  → Prestação Funcultura defensável em telas
  → "Não preciso de mais nada além disso"
```

**Impacto:**
- ✅ Confiança total
- ✅ 2 personas completamente satisfeitos
- ✅ Destranca path para Sprints 2-7

---

## 📞 Perguntas Frequentes

**P: Command Center é realmente prioridade máxima?**  
R: Sim. Mudança estratégica. Fundação psicológica (usuário retido) vem antes de fundação técnica (dados corretos) na execução.

**P: Fiscal não deveria vir primeiro?**  
R: Não. Sem usuário retido, não importa fiscal. Ambos precisam, mas esta ordem garante retenção rápida + confiança depois.

**P: Quanto tempo mesmo vai levar?**  
R: 2-3 semanas Sprint 1A + 2-3 semanas Sprint 1B = 4-6 semanas total (mesma duração que Sprint 1 antigo, só dividido).

**P: E depois?**  
R: Sprint 2 em paralelo com 1B se quiser acelerar. Mas melhor sequencial: 1A → 1B → 2.

**P: Supabase Realtime é production-ready?**  
R: Sim, está em produção em muitos projetos. Mas é novo para GLAUBER, então testamos bem em staging.

---

**Este é o pivô estratégico. Command Center é a "porta de entrada" que faz o usuário ficar. Fiscal é o "motor" que sustenta.**

**Mercado está esperando. Vamos entregar.**
