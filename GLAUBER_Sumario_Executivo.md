# GLAUBER — Sumário Executivo

**Data:** 26 de maio de 2026  
**Status:** Roadmap Consolidado V1.0  
**Próximo Passo:** Iniciar Sprint 1 (Fundação Fiscal & Auth)

---

## 🎯 Visão em Uma Frase

**"GLAUBER é a ferramenta que fecha o ciclo roteiro → cronograma → OD → execução → prestação de contas em português, com compreensão de editais e IA de decupagem inédita no mercado brasileiro."**

---

## 📊 Números

- **107 itens** de melhoria identificados (4 personas)
  - 34 bloqueantes (impede produção)
  - 41 graves (força workarounds)
  - 24 atritos (custa tempo)
  - 8 cosméticos

- **13 itens transversais** que destravam ~40% sozinhos

- **5 fundações estruturais** que reaproveitam-se em múltiplos sprints

- **7 sprints** = ~28 semanas de desenvolvimento focado

---

## 🏗️ As 5 Fundações (que destravam tudo)

### F1 — Storage Privado + Helpers de Mídia
- Buckets para documentos_fiscais, referencias_visuais, rushes
- Lib `useAnexo()` com signed URLs
- Edge Function para parsear XML NFe
- Player com comentário no timecode

### F2 — Schema Central de Produção
- Tabela `dia_cenas` (o nexo do sistema)
- roteiro_cenas com eighths, intext, diaornoite, intencao
- roteiro_planos_sugeridos com referencias, take_boa
- elementos_cena e dpr_dia

### F3 — Esfera Fiscal/Contratual
- fornecedores, cotacoes, ordens_compra
- contas_bancarias_projeto, extratos, pagamentos
- versoes_orcamento, linhas_orcamento (3 níveis)
- fringes_padrao; audit_log (polimórfico)
- Edge Function gerar-pacote-prestacao → ZIP

### F4 — Conversa Criativa
- tarefas (polimórficas: cena, dept, pessoa)
- atas com decisões → tarefas automáticas
- aprovacoes (status: pendente/aprovado/ajuste)
- comentarios com timecode_seg e anexos

### F5 — Lookbook + Referências Visuais
- lookbook (por cena, personagem, sequência, geral)
- roteiros_versoes com snapshot + commit_message
- Diff visual entre versões

---

## 🚀 Os 7 Sprints

| Sprint | Foco | Duração | Persona | Destrava |
|--------|------|---------|---------|----------|
| 1A | **Command Center + Auth** (MÁXIMA PRIORIDADE) | 2-3 sem | DP + Produtor | Dashboard realtime, retenção, diferencial |
| 1B | Fundação Fiscal | 2-3 sem | DP + Produtor | Upload NF, locações, fornecedores, audit |
| 2 | Conversa Criativa | 3 sem | Diretor + AD | Tarefas, atas, aprovação, @menção |
| 3 | Decupagem Viva | 4 sem | Diretor + AD | IA→registros, edição planos, versionamento, lookbook |
| 4 | Stripboard + DOOD + OD | 4 sem | AD + DP | dia_cenas, DOOD, breakdown, OD puxando cenas |
| 5 | Frame.io Brasileiro | 6 sem | Diretor | Player timecode, rushes, registro takes |
| 6 | Folha + Pacote Funcultura | 5 sem | DP | Orçamento 3 níveis, folha, RPA, pacote prestação |
| 7 | Refinamentos + Lançamento | 3 sem | Todas | Multi-produtora, CNPJ, nascer/pôr, versões, festivais |

**Total: 28 semanas**

---

## 📍 Marcos Públicos Sugeridos

- **Pós-Sprint 1 (Semana 4):** Alpha fechado com produtoras parceiras (foco em prestação)
- **Pós-Sprint 3 (Semana 11):** Beta convidado (diretor + AD podem testar)
- **Pós-Sprint 5 (Semana 21):** Beta aberto (mais personas)
- **Pós-Sprint 7 (Semana 28):** Lançamento público v1.0 GLAUBER

---

## 🎨 Rebranding: CINEFLOW → GLAUBER

### Quando Mudar

1. **AGORA** — Base de código: variáveis, BD, docs, git
   - `CINEFLOW` → `GLAUBER` em todas as referências
   - Migrations: schema, enums, nomes de tabelas
   - API: `/api/cineflow/*` → `/api/glauber/*` (com redirects)

2. **Sprint 2** — UI/UX: migrar gradualmente
   - Labels em telas
   - Mensagens de boas-vindas
   - Documentação interna

3. **Sprint 3+** — Públicos: beta convidado como "GLAUBER" exclusivamente

4. **Sprint 7** — Lançamento v1.0 com identidade visual nova

### Por Que GLAUBER?

- **Memorável:** Nome próprio, conecta à visão criativa
- **Contexto:** Glauber Rocha (cineasta brasileiro referência)
- **Messaging:** "Onde a criação encontra a produção"
- **Diferenciação:** Não é mais um genérico; é uma ferramenta de *autores*

---

## 🔑 Os 13 Itens Transversais (Quick Wins)

| # | Item | Personas | Gravidade |
|----|------|----------|-----------|
| T1 | Storage privado + signed URL | Todas | Bloqueante |
| T2 | Decupagem IA cria registros | Todas | Bloqueante |
| T3 | Tabela dia_cenas | AD/DP/Dir | Bloqueante |
| T4 | Locações por projeto | Prod/AD/DP | Bloqueante |
| T5 | Multi-produtora real | Prod/DP | Grave |
| T6 | Trilha de auditoria | Prod/DP | Bloqueante |
| T7 | Anexo de imagem + @menção | Prod/AD/Dir | Bloqueante |
| T8 | Status de convite visível | Prod/DP | Atrito |
| T9 | Tarefas/compromissos | AD/DP/Dir | Bloqueante |
| T10 | Senha mínima 8 chars | Todas | Bloqueante |
| T11 | Upload NF/RPA + parsing | Prod/DP | Bloqueante |
| T12 | Versionamento | DP/Dir | Grave |
| T13 | Validade prestação + prazos | Prod/DP | Grave |

---

## 💡 Princípios de Implementação

### Limpeza (Code + UX)
- Banir código legacy; migrar CINEFLOW completamente
- Remover 50% dos inputs desnecessários
- Schema limpo; sem colunas deprecated; enums controlados
- Rebase ao invés de merge; histórico legível

### Eficiência (Arquitetura + Performance)
- Realtime-first: Supabase Realtime para dashboards (não HTTP polling)
- Lazy-loading: componentes renderizam sob demanda
- Edge Functions para parsing NFe, OCR, compressão PDF
- Caching agressivo no client (SWR com revalidation)
- Índices criados com migrations; N+1 banido

### Intuitividade (Padrões Mentais do Usuário)
- **Antecipação:** Se decupa "Vestiário", sugere criar locação "Vestiário"
- **Versionamento:** Tudo é versionado; usuário nunca "perde" dados
- **Labels consistentes:** "Onboarding" → "Documentos"; "Convite" → "Status"
- **Fluxos reduzidos:** Criar Fornecedor + Cotação + OC = 1 wizard
- **Erros informativos:** "CNPJ inválido" → "Deseja criar novo fornecedor?"
- **Segurança invisível:** RLS/RBAC sem pedir confirmação; Gov.br login = 1 clique

---

## ⚠️ Riscos e Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Re-decupagem destrói anotações | Alto | Sprint 3: merge inteligente + dry-run |
| IA gera lixo no banco | Alto | Sprint 3: staging layer + validação manual |
| RLS complexo = bugs de segurança | Crítico | Sprint 1: code review + teste penetração |
| Folha + RPA errada = glosa | Crítico | Sprint 6: validação com DP + mock auditoria |
| Performance: 1000 cenas = congelamento | Médio | Sprint 4: pagination + lazy-load + índices |
| Usuário antigo não consegue logar | Médio | Sprint 7: migration script + redirect |
| Gov.br assinatura indisponível | Médio | Sprint 6: fallback local + aviso "não-vinculativo" |
| Mistral large cai | Médio | Todos: fallback upload manual + aviso claro |

---

## 📋 Checklist de Início (Próximos 2 Dias)

- [ ] Renomear base CINEFLOW → GLAUBER em código
- [ ] Atualizar docs do projeto
- [ ] Criar branch `sprint-1` com plano de trabalho
- [ ] Quebrar Sprint 1 em tarefas Jira/Linear
- [ ] Inicial F1 (Storage privado)
  - [ ] Criar buckets Supabase
  - [ ] Lib useAnexo com hooks
  - [ ] Edge Function parsear-xml-nfe
- [ ] Inicial correção Auth
  - [ ] Padronizar senha 8 chars
  - [ ] Magic Link para recuperação
  - [ ] Mensagens de erro genéricas
- [ ] Inicial schema de locações por projeto
  - [ ] Criar migrations
  - [ ] Atualizar models
- [ ] Schedular reunião com DP (Tereza) para validar uploads NF

---

## 🎁 Deliverables

### Documento Completo
📄 **GLAUBER_Roadmap_Consolidado_V1.docx**  
Arquivo Word com 20+ páginas, cobrindo:
- Consolidação de insights (107 itens)
- 4 personas e vereditos
- 13 transversais
- 5 fundações
- 7 sprints detalhados
- Rebranding
- Princípios de implementação
- Matriz de riscos

### Este Sumário
📄 **GLAUBER_Sumario_Executivo.md**  
Cheat sheet para decisões rápidas

---

## 🎯 Próximo Passo Imediato

**Comece pelo Sprint 1 (Fundação Fiscal & Auth)** — 3-4 semanas

Quando **F1 + F3 + Auth** estiverem sólidos:
1. Paralelize Sprints 2-4
2. Sprint 5-6 destravam Frame.io brasileiro e killer feature (pacote prestação)
3. Sprint 7 é afinação e lançamento

**Mercado está esperando. Vamos entregar.**

---

## 📞 Dúvidas Frequentes

**P: Por que não começar com UI/UX?**  
R: Fundações estruturais (storage, schema, fiscal) deslocam a maior parte dos itens bloqueantes. UI vem depois de ter dados corretos.

**P: Quanto tempo Sprint 1 vai tomar really?**  
R: 3-4 semanas se equipe dedicada + nenhuma interrupção.  
Risco: Storage + NF parsing + Supabase RLS é novo; reservar 20% para debugging.

**P: E se Mistral large cair?**  
R: Fallback: usuário faz upload de arquivo, decupagem é input manual. Não bloqueia Sprint 3 (basta ter staging layer pronto).

**P: GLAUBER é nome definitivo?**  
R: Sim. Rebranding é agora; marca sai como GLAUBER no lançamento.

---

**Versão:** 1.0  
**Data:** 26 de maio de 2026  
**Próxima Review:** Pós-Sprint 1
