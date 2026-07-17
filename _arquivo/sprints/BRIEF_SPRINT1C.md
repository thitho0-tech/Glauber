# BRIEF — Sprint 1C: "Polimento & Fluxos Completos"
**Data:** 27/05/2026  
**Autor:** Claude (consultor de implementação)  
**Base:** gap analysis do código real vs. Roadmap V3 + estado pós-Sprint 1B  
**Deploy alvo:** glauber.app.br via `vercel --prod`

---

## Diagnóstico: o que existe vs. o que falta

O app está surpreendentemente avançado. As sprints 1A e 1B cobriram toda a Trilha A, B, C e D do Roadmap V3. O que resta são **gaps de conexão** entre partes que foram implementadas isoladamente mas ainda não conversam entre si, mais **4 melhorias de UX de alto impacto** identificadas na inspeção do código.

### O que JÁ funciona end-to-end
- Cronograma com fases (pre_producao / producao / dia_filmagem / pos_producao) ✅
- PlanejamentoDetalhe com equipe escalada + check-in/out ✅
- Ordem do Dia completa (CallSheetEditor) com publicação + link público ✅
- Financeiro com rubricas, fornecedor, upload de comprovante, alerta de teto ✅
- Audit log imutável em despesas ✅
- Prestação de contas com validações vs. edital ✅
- Roteiro com upload + decupagem IA ✅
- Elenco + personagens ✅
- Figurino & Arte ✅
- Comunicação por canal/departamento com áudio ✅
- Equipe por projeto (projeto_pessoas) com funções do organograma ✅
- Contratos ✅
- Fornecedores + regimes de contratação ✅
- Command Center com KPIs realtime ✅
- Settings com autorizações de papel por projeto ✅
- Delete de projeto com 2FA email ✅
- Onboarding de documentos com OCR ✅
- Convites com token ✅

### Gaps identificados (base da Sprint 1C)

| # | Gap | Tipo | Impacto |
|---|---|---|---|
| C1 | `validar_despesa()` nunca é chamada ao salvar uma despesa | Integração ausente | Alto — as regras SIC existem mas ficam mudas |
| C2 | Finance.tsx não tem busca/filtro — em projetos com 30+ despesas fica inutilizável | UX | Alto |
| C3 | Sidebar sem atalho para Command Center — usuário nunca descobre a página `/dashboard` | UX | Alto |
| C4 | Dashboard global não mostra alertas de validação falha | UX | Médio |
| C5 | ProjectDetail mostra atalhos para páginas D (Roteiro, Elenco, Figurino) mas não para Command Center | UX | Médio |
| C6 | InviteButton em Team.tsx não está conectado — `InviteButton` importado mas não renderizado na tabela | Integração ausente | Alto |
| C7 | Settings → aba "Autorizações" só lista papéis, não tem acesso para editar convites pendentes | UX | Médio |
| C8 | `regimes_contratacao` tem `valor_liquido` calculado mas o campo nunca é recalculado via `fn_calcular_liquido_rpa` ao salvar | Integração ausente | Médio |
| C9 | Accountability.tsx mostra Audit Log mas não chama `validar_despesa()` manualmente para re-validar lote | UX | Médio |
| C10 | PublicCallSheet existe mas não tem link de acesso visível na OD publicada no CallSheets.tsx | UX | Alto |

---

## Sprint 1C — 8 tasks em ordem de dependência

### C1.1 — Chamar `validar_despesa()` ao salvar despesa
**Arquivo:** `src/pages/Finance.tsx`  
**O que está faltando:**  
Na mutation `salvarDespesa` (linha ~127), após o `insert` na tabela `despesas`, chamar:
```ts
await supabase.rpc("validar_despesa", { p_despesa_id: data.id });
```
Depois de salvar e antes de invalidar queries. Isso popula `validacoes_edital` para aquela despesa, permitindo que o ícone `AlertCircle` na tabela acenda imediatamente.

**Também:** Na edição de despesa (se existir update), chamar igualmente.  
**Teste:** Criar despesa com data anterior à NF — deve aparecer ícone de alerta vermelho na tabela.

---

### C1.2 — Botão "Re-validar todas" na Accountability
**Arquivo:** `src/pages/Accountability.tsx`  
**O que está faltando:**  
Adicionar botão "Re-validar despesas" que chama `validar_despesa()` para cada despesa do projeto em sequência (via Promise.all). Mostrar toast com resumo `"X ok, Y alertas, Z falhas"`.  
**Posição:** header do card de validações, ao lado do título.

---

### C2 — Filtros e busca no Financeiro
**Arquivo:** `src/pages/Finance.tsx`  
**O que está faltando:**  
Acima da tabela de despesas, adicionar barra com:
- Input de busca por descrição (filtro local no array `despesas`)
- Select de status (todos / pendente / aprovado / reprovado)
- Select de rubrica (popular com `rubricasEdital`)
- Badge com total filtrado: `"Mostrando X de Y despesas — R$ ZZZ,ZZ"`

Tudo filtro local (sem nova query) — os dados já estão no array.

---

### C3 — Command Center no Sidebar + ProjectDetail
**Arquivo 1:** `src/components/layout/Sidebar.tsx`  
**Mudança:** O item `Command Center` já existe em `projectItems` (linha `{ to: /projetos/${id}/dashboard, icon: Gauge, label: "Command Center" }`). Verificar se está presente — se sim, só mover para ficar logo abaixo de "Visão geral" (segunda posição).

**Arquivo 2:** `src/pages/ProjectDetail.tsx`  
**Mudança:** Adicionar `Command Center` no array `atalhos` (atualmente tem 11 atalhos, falta o dashboard). Adicionar:
```ts
{ to: `/projetos/${id}/dashboard`, label: "Command Center", icon: Gauge, descricao: "KPIs, eventos e alertas em tempo real" },
```
Importar `Gauge` de lucide-react se não estiver importado.

---

### C4 — Dashboard global: painel de alertas de validação
**Arquivo:** `src/pages/Dashboard.tsx`  
**O que está faltando:**  
A query `validacoes` já existe (linha ~19: `.from("validacoes_edital").select("*").eq("status", "fail")`).  
Mas não há card/seção renderizando os resultados.  

Adicionar seção "Alertas de prestação" abaixo dos 4 KPI cards com:
- Lista das validações `fail`, agrupadas por projeto
- Badge vermelho com contagem
- Link para `/projetos/:id/prestacao`
- Se vazio: estado vazio verde "Nenhuma pendência de prestação"

---

### C5 — Conectar InviteButton na tabela de equipe
**Arquivo:** `src/pages/Team.tsx`  
**O que está faltando:**  
`InviteButton` está importado mas não está renderizado na tabela. Localizar o `import InviteButton` (já existe) e adicionar na coluna de ações da tabela:
```tsx
<InviteButton
  projetoPessoaId={v.id}
  pessoaEmail={v.pessoa?.email}
  pessoaNome={v.pessoa?.nome}
/>
```
Adicionar após o botão de regime na coluna de ações. Também adicionar coluna "Acesso" na tabela para mostrar se a pessoa já tem `user_id` (vinculada ao auth) ou não — `Badge` verde "Ativo" ou cinza "Sem acesso".

**Dado necessário:** a query de `projeto_pessoas` precisa incluir `pessoa:pessoas(id, nome, email, funcao, user_id)` — adicionar `user_id` no select.

---

### C6 — Recalcular `valor_liquido` ao salvar regime RPA
**Arquivo:** `src/pages/Team.tsx`  
**O que está faltando:**  
Na mutation `salvarRegime` (linha ~194), quando `tipo === 'rpa'`, após o insert/update chamar:
```ts
const { data: liquido } = await supabase.rpc("fn_calcular_liquido_rpa", {
  p_bruto: payload.valor_bruto,
  p_inss_pct: parseFloat(form.get("inss_pct") as string) / 100 || 0.20,
});
if (liquido !== null) {
  await supabase.from("regimes_contratacao")
    .update({ valor_liquido: liquido })
    .eq("id", regimeId);
}
```
Mostrar `valor_liquido` no Badge de regime na tabela (ex: `"RPA — R$ 3.200,00 líq."`).

---

### C7 — Link público da OD visível em CallSheets.tsx
**Arquivo:** `src/pages/CallSheets.tsx`  
**O que está faltando:**  
A rota pública `/od/:token` existe e `PublicCallSheet.tsx` funciona, mas não há como o usuário descobrir o link a partir da lista de ODs.

Na tabela/lista de ODs publicadas (status = 'publicado'), adicionar botão "Ver link público" que:
1. Faz query `select token from ordens_do_dia where id = :odId`
2. Mostra o link `{window.location.origin}/od/{token}` em um Dialog com botão Copiar

Botão só aparece quando `od.status === 'publicado'`.

---

### C8 — Build check + deploy
**Comando:** `npx vite build` no diretório `cineflow-mvp/`  
Zero erros TypeScript e de bundling antes de `vercel --prod`.

---

## Migrações necessárias nesta sprint

**Nenhuma migration nova** — todos os gaps da Sprint 1C são de código front-end e chamadas RPC já existentes no banco. As funções `validar_despesa()` e `fn_calcular_liquido_rpa()` já estão aplicadas (migrations 0003 e 0027).

---

## Ordem de execução recomendada

```
C1.1 → C1.2 → C2 → C3 → C4 → C5 → C6 → C7 → C8
```

Sem dependências cruzadas — todos os itens podem ser feitos em sequência ou paralelo.  
Arquivos tocados: `Finance.tsx`, `Accountability.tsx`, `Dashboard.tsx`, `Team.tsx`, `CallSheets.tsx`, `Sidebar.tsx`, `ProjectDetail.tsx`.

---

## Critérios de aceite da Sprint 1C

1. **C1.1:** Salvar despesa com data antes da NF → ícone ⚠ aparece imediatamente na tabela, sem recarregar
2. **C1.2:** Botão "Re-validar" em Accountability → toast `"X ok, Y alertas, Z falhas"` 
3. **C2:** Campo busca filtra despesas em tempo real; Select de rubrica funciona
4. **C3:** Command Center aparece 2ª posição na sidebar do projeto; card de atalho na ProjectDetail
5. **C4:** Dashboard global lista falhas de validação agrupadas por projeto
6. **C5:** Coluna "Acesso" com badge verde/cinza + botão convite funcional
7. **C6:** Badge de regime mostra valor líquido para tipo RPA
8. **C7:** Botão "Ver link público" visível para ODs publicadas; link copiável
9. **C8:** Build clean, zero erros, deploy em produção

---

## Nota de metodologia

Todas as alterações desta sprint são no front-end (`src/`). Nenhum SQL precisa ser aplicado no Supabase Editor. O Thiago só precisará rodar `vercel --prod` ao final.

**Tempo estimado:** 3-5 horas de implementação.
