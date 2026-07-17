# GLAUBER — Contexto do Projeto

**Última atualização:** 26 de maio de 2026  
**Status:** Roadmap consolidado, pronto para Sprint 1  
**Marca:** CINEFLOW → GLAUBER (rebranding em andamento)

---

## 🎯 Missão

Ser a ferramenta definitiva para produção audiovisual brasileira, fechando o ciclo **roteiro → cronograma → OD → execução → prestação de contas** em uma plataforma única, em português, com compreensão de editais (Funcultura/SIC) e IA de decupagem inédita.

---

## 🏆 Diferenciais Competitivos

1. **Compreensão de edital brasileiro** — rubricas Funcultura/SIC, teto de despesas, validações legais
2. **Decupagem por IA** — Mistral large em JSON mode, gera personagens/locação/art/figurino automaticamente
3. **Chat de produção integrado** — conversa criativa, tarefas, aprovações, atas — tudo no mesmo lugar
4. **Não necessita 3+ ferramentas:** Movie Magic + Conta Simples + Wrapbook + Frame.io + Milanote + WhatsApp = **GLAUBER**

---

## 👥 As 4 Personas Chave

| Persona | Papel | Necessidade Principal | Status |
|---------|-------|----------------------|--------|
| **Chico** (Produtor) | Viabilização, contratos, prestação | Upload NF + costura roteiro/OD | Veredito: "resolvam NF e costura; têm meu sim" |
| **Mariana** (1º AD) | Cronograma (DOOD), OD, gerência tempo | Stripboard + DOOD + OD puxando cenas | Veredito: "decupagem IA excita, precisa fechar ciclo" |
| **Tereza** (DP) | Orçamento, folha, prestação | Pacote prestação Funcultura 1-clique | Veredito: "10 primeiros itens = não preciso de mais nada" |
| **Caio** (Diretor) | Aprovação criativa, decisões, lookbook | Player timecode, tarefas, atas, versionamento | Veredito: "preciso conversar, não só operar" |

---

## 📊 Severidade Catalogada

- **34 bloqueantes** — impede uso em produção média
- **41 graves** — força workarounds (Movie Magic, Wrapbook, Conta Simples)
- **24 atritos** — custa tempo
- **8 cosméticos** — visuais/UX

**Total: 107 itens**

---

## 🚀 Roadmap em 7 Sprints + 2 Fases Sprint 1 (28 semanas)

### Sprint 1A: Command Center + Auth (2-3 sem) — ⭐ MÁXIMA PRIORIDADE ⭐
Dashboard em tempo real como home de cada projeto. Realtime via Supabase WebSocket. 4 visões segmentadas (DP/Produtor, Diretor, AD, Colaborador). KPIs dinâmicos calculados por triggers. Auth: senha 8 chars, Magic Link, RLS por projeto.  
**Destrava:** Produtor + DP (retenção imediata + diferencial vs Movie Magic/StudioBinder)  
**Entrega:** Usuário loga e vê dashboard bonito, útil, em tempo real

### Sprint 1B: Fundação Fiscal (2-3 sem)
Storage privado, locações/projeto, upload NF/RPA, regime contratação, fornecedores, conta bancária, audit_log.  
**Destrava:** Produtor + DP (infraestrutura de confiança)  
**Entrega:** Dashboard abastecido com dados reais (prestação Funcultura defensável em telas)

### Sprint 2: Conversa Criativa (3 sem)
Tarefas, atas, aprovação criativa, @menção, anexo imagem.  
**Destrava:** Diretor + AD  
**Entrega:** Pré-produção criativa sem WhatsApp

### Sprint 3: Decupagem Viva (4 sem)
IA→registros, edição planos, re-decupagem não-destrutivo, personagens, versionamento roteiro, lookbook.  
**Destrava:** Diretor + AD  
**Entrega:** Roteiro vive com versionamento; IA não morre em ilhinha

### Sprint 4: Stripboard + DOOD + OD (4 sem)
dia_cenas + UI stripboard, DOOD auto-gerado, páginas/eighths, breakdown, OD puxando cenas, ficha locação, DPR.  
**Destrava:** AD + DP  
**Entrega:** AD opera completo; não precisa Movie Magic

### Sprint 5: Frame.io Brasileiro (6 sem)
Player timecode, rushes, registro takes, comparativo takes, versionamento corte.  
**Destrava:** Diretor  
**Entrega:** Pós-produção rola dentro de GLAUBER

### Sprint 6: Folha + Pacote Funcultura (5 sem)
Orçamento 3 níveis, unit×qty×rate, fringes, folha+RPA, petty cash, pacote prestação 1-clique.  
**Destrava:** DP  
**Entrega:** **Killer feature** — fechar prestação sem sair da tela

### Sprint 7: Refinamentos + Lançamento (3 sem)
Multi-produtora, validação CNPJ, onboarding renomeado, nascer/pôr+clima, versões orçamento/corte, festivais, polish.  
**Destrava:** Todas  
**Entrega:** v1.0 GLAUBER estável, diferenciada, pronta para mercado

---

## 🏗️ As 5 Fundações Estruturais

Blocos reutilizáveis que destravam múltiplos sprints:

**F1 — Storage Privado + Helpers**  
Buckets, lib useAnexo, edge functions, player.

**F2 — Schema Central de Produção**  
dia_cenas (nexo), roteiro_cenas, roteiro_planos, elementos_cena, dpr_dia.

**F3 — Esfera Fiscal/Contratual**  
fornecedores, cotacoes, ordens_compra, contas_bancarias, versoes_orcamento, fringes, audit_log.

**F4 — Conversa Criativa**  
tarefas, atas, aprovacoes, comentarios, mensagens com @menção/anexos.

**F5 — Lookbook + Referências Visuais**  
lookbook (cena/personagem/sequência/geral), roteiros_versoes com diff.

---

## 🎨 Rebranding: CINEFLOW → GLAUBER

### Timeline

- **AGORA (Sprint 1):** Código base (migrations, variáveis, docs)
- **Sprint 2:** UI/UX (labels, mensagens)
- **Sprint 3+:** Públicos como GLAUBER
- **Sprint 7:** Lançamento v1.0 com identidade nova

### Por Que GLAUBER?

- Nome memorável; conecta à visão criativa (Glauber Rocha)
- Messaging: "Onde a criação encontra a produção"
- Diferencia de ferramentas genéricas
- Repositioning: não é um "app de gestão", é uma ferramenta de *autores*

### Migração de Dados

Early users com CINEFLOW continuam funcionando. Dados migrados transparentemente via migration script (Sprint 7).

---

## 💡 Princípios de Design e Implementação

### Limpeza
- ❌ Banir código legacy; migrar CINEFLOW completamente
- ❌ Remover 50% dos inputs desnecessários
- ✅ 1 tela = 1 decisão criativa ou operacional
- ✅ Schema limpo; sem colunas deprecated; enums controlados
- ✅ Rebase ao invés de merge; histórico legível

### Eficiência
- ✅ Realtime-first: Supabase Realtime (não HTTP polling)
- ✅ Lazy-loading: componentes renderizam sob demanda
- ✅ Edge Functions: parsing NFe, OCR, compressão PDF
- ✅ Caching agressivo (SWR com revalidation)
- ✅ N+1 banido; índices criados em migrations

### Intuitividade
- **Antecipação:** Sistema prevê próximo passo
  - Se decupa "Vestiário" → sugere criar locação "Vestiário"
- **Versionamento:** Tudo é versionado; usuário nunca "perde"
- **Labels usuário:** "Onboarding" → "Documentos"; "Convite" → "Status"
- **Fluxos reduzidos:** Criar Fornecedor + Cotação + OC = 1 wizard
- **Erros informativos:** "CNPJ inválido" → "Deseja criar novo fornecedor?"
- **Segurança invisível:** RLS/RBAC sem pedir; Gov.br = 1 clique

---

## ⚙️ Stack Técnico

### Backend
- **DB:** Supabase PostgreSQL (RLS, realtime)
- **Auth:** Supabase Auth (magic link, session-based)
- **Edge Functions:** Supabase Edge Functions (deno)
  - Parsing NFe (XML)
  - OCR cupom (Tesseract)
  - Compressão PDF (ImageMagick)
- **Storage:** Supabase Storage (buckets privados, signed URLs)

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **UI:** Tailwind CSS + Shadcn/ui
- **State:** SWR + Zustand (simple state)
- **Forms:** React Hook Form + Zod
- **Real-time:** Supabase Realtime client
- **Video player:** HLS.js (timecode, comments)

### Infra
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **CI/CD:** GitHub Actions
- **Analytics:** Supabase Analytics / Vercel Analytics
- **Monitoring:** Sentry (error tracking)

---

## 📋 Checklist de Decisões Resolvidas

- ✅ Nome: GLAUBER (não CINEFLOW mais)
- ✅ Storage: Supabase (não S3)
- ✅ Realtime: Supabase Realtime (não Socket.io)
- ✅ Auth: Supabase Auth + Magic Link
- ✅ RLS: Row-level security obrigatória por projeto
- ✅ Audit: Tabela polimórfica imutável
- ✅ Primeiro alvo: DP + Produtor (Sprint 1)
- ✅ Não usar Movie Magic como referência de UX (fazer melhor)
- ✅ Não fazer genérico; ser específico Brasil/Funcultura
- ✅ IA não é feature highlight; é integrada (não siloed)

---

## 🚨 Riscos Conhecidos

| Risco | Impacto | Mitigation |
|-------|---------|-----------|
| Decupagem IA destrói anotações | Alto | Sprint 3: merge inteligente + dry-run |
| RLS complexo = bugs segurança | Crítico | Sprint 1: code review + pentest |
| Folha errada = glosa Funcultura | Crítico | Sprint 6: mock auditoria |
| Performance (1000 cenas) | Médio | Pagination + lazy-load + índices |
| Migração CINEFLOW→GLAUBER | Médio | Script + staging test |
| Gov.br assinatura cai | Médio | Fallback local + aviso |
| Mistral large indisponível | Médio | Fallback upload manual |

---

## 📞 Decisões Culturais

### Ninguém Trabalha Sozinho
- Code review obrigatório (2 aprovações)
- Puxar para dentro o máximo: não usar serviços 3º (OCR local, não via API paga)
- IA é ferramenta, não oráculo (staging layer sempre)

### Documentação é Código
- ADR (Architecture Decision Record) obrigatório por decisão técnica > 2 horas
- Schema migrations com comentário explicando "por quê"
- Commit messages descrevem "por quê", não "o quê"

### Qualidade > Velocidade
- Melhor lancar devagar e robusto do que rápido e bugado
- Sprint 1 pode ser 4 semanas se necessário (melhor que 3 com débito)

### Usuário Vem Primeiro
- Beta com produtoras reais (não stakeholders)
- Feedback incorporado em real-time (não "Sprint X")
- DP (Tereza) tem voto em cada feature

---

## 🎯 Métricas de Sucesso por Sprint

### Sprint 1
- ✅ Zero erros auth
- ✅ Upload funcionando
- ✅ Audit log completo

### Sprint 3
- ✅ IA não destrói anotações
- ✅ Personagens criados via IA
- ✅ Diretor edita decupagem

### Sprint 4
- ✅ AD não abre Movie Magic
- ✅ DOOD gera em < 2s

### Sprint 6
- ✅ Prestação Funcultura gera em < 30s
- ✅ DP não usa Wrapbook

### Sprint 7
- ✅ v1.0 zero bugs críticos
- ✅ Produtora média adota GLAUBER como central

---

## 📚 Documentação de Referência

### Auditoria & Roadmap
- `GLAUBER_Roadmap_Consolidado_V1.docx` — 20+ páginas, tudo
- `GLAUBER_Sumario_Executivo.md` — cheat sheet para decisões rápidas
- `Auditoria_Usabilidade_4Personas.md` — 750 linhas, detalhes de cada persona
- `Relatório Master de Avaliação Técnica e Estratégica - Cineflow MVP.pdf` — análise técnica

### Implementação
- `GLAUBER_Sprint1_Guia_Tecnico.md` — tasks detalhadas, migrations, DoD
- `CINEFLOW_Roadmap_V3.md` — versão anterior (histórico)

### Organização
- `Organograma_AV_Completo.md` — 60+ funções, 9 departamentos (RBAC reference)
- `Edital_SIC_Recife_2024.md` — validações automáticas
- Este arquivo (`GLAUBER_CONTEXTO.md`) — referência rápida do projeto

---

## 🔗 Próximos Passos Imediatos

1. **Renomear base CINEFLOW → GLAUBER** (1 dia)
   - Código, BD, docs, git
   - PR para `sprint-1` branch

2. **Quebrar Sprint 1 em tarefas Jira/Linear** (0.5 dia)
   - Usar guia técnico como template
   - Assinar a equipe

3. **Kick-off com DP + Produtor** (1 reunião)
   - Validar prioridades
   - Alinhar sobre uploads NF
   - Explicar timeline

4. **Iniciar Task 1.1 (Supabase Storage)** (hoje/amanhã)
   - Bucket setup
   - RLS config
   - Testes

---

## 📅 Próxima Review

**Pós-Sprint 1:** Semana 4  
**Pós-Sprint 3:** Semana 11 (beta convidado com diretor + AD)  
**Pós-Sprint 7:** Semana 28 (lançamento v1.0)

---

**Mercado está esperando. Vamos entregar.**

---

*Última revisão: 26/05/2026 por Thiago França*  
*Próxima revisão: Pós-Sprint 1*
