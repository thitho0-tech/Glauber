# Sprint 3C — Spec de Execução · Bloco de PDFs

**Data:** 05/06/2026 · **Base:** obs 16, 17 + gap 3B.6 (prestação PDF + paginação Finance)
**Pré-requisito:** Sprint 3B.5 em produção (commit 85d660b) · **Migration:** nenhuma (tudo front-end)

---

## 1. Descoberta importante (evita retrabalho)

O **PDF da OD (obs 17) já está implementado** desde a Sprint 2C: `CallSheetEditor.tsx`
tem botão "PDF" chamando `window.print()`, e o `index.css` já traz o bloco
`@media print` que esconde sidebar/nav/botões (classe `.no-print`). **Não refazer** —
só validar que ainda funciona e, se preciso, melhorar o layout impresso.

Logo, o trabalho novo da 3C é: **PDF da decupagem (16)**, **PDF da prestação (3B.6)**
e **paginação do Finance**. Todos reusam o mesmo padrão de impressão já existente.

---

## 2. Padrão de PDF do projeto (reusar — não inventar outro)

Técnica única, já validada na OD, sem bibliotecas (jsPDF/html2canvas ficam de fora):

- Botão "PDF" com `onClick={() => window.print()}` e ícone `Printer`.
- Marcar tudo que NÃO deve sair no PDF (sidebar, header, botões, filtros) com a
  classe `no-print` — o `@media print` do `index.css` já oculta esses elementos.
- Onde precisar de layout de impressão dedicado, criar um bloco visível só na
  impressão (classe utilitária `print-only` / `hidden print:block` no Tailwind).
- O usuário escolhe "Salvar como PDF" no diálogo de impressão do navegador.

Vantagem: consistente com a OD, sem dependência nova, sem custo de bundle.

---

## 3. Escopo

| # | Item | Observação | Detalhe |
|---|---|---|---|
| 3C.1 | Botão **PDF da decupagem** em Roteiro | 16 | Imprime a lista de cenas (roteiro_cenas: nº, cabeçalho, ordem, dia) em layout limpo |
| 3C.2 | Botão **PDF da prestação de contas** | 3B.6 | Relatório de despesas agrupado por rubrica, com totais e status |
| 3C.3 | **Paginação** na lista de despesas (Finance) | gap #6 | 50 por página via range() do Supabase; crítico acima de 100 registros |
| 3C.4 | **Validar** PDF da OD existente | 17 | Só conferir/ajustar layout — já implementado na 2C |

---

## 4. Prompt para o Claude Code

`cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp"` → `claude` → cole:

```
Sprint 3C — Bloco de PDFs. Leia ../SPRINT_STATE.md e ../SPRINT_3C_SPEC.md.
Sem migration. REUSE o padrão de impressão que já existe: CallSheetEditor.tsx usa
window.print() + classe no-print + @media print do index.css. Não adicione
bibliotecas de PDF (jsPDF/html2canvas).

1. (obs 16) Roteiro.tsx: botão "PDF" (ícone Printer) que abre a impressão da
   DECUPAGEM — uma view limpa da lista de cenas (roteiro_cenas: numero_cena,
   cabecalho, ordem, dia_id). Esconder UI de edição com a classe no-print;
   criar o layout de impressão com cabeçalho do projeto + tabela de cenas.

2. (3B.6) Prestação/Accountability: botão "PDF" gerando um relatório de
   prestação de contas — despesas do projeto agrupadas por rubrica/linha de
   orçamento, com subtotais, total geral, e coluna de status
   (pendente/aprovada/rejeitada/paga). Cabeçalho com nome do projeto e edital.
   Mesmo padrão window.print() + print-only.

3. (gap) Finance.tsx: paginação na lista de despesas — 50 por página usando
   .range() do supabase-js, com controles "anterior/próxima" e contador.
   Manter os filtros existentes funcionando com a paginação.

4. (obs 17) Verifique que o botão PDF da OD em CallSheetEditor.tsx ainda
   funciona; ajuste o layout impresso só se estiver quebrado. Não reescrever.

Adicione no index.css o que faltar de print-only/print:block. PowerShell sem &&;
.tsx grande via python3 se truncar. Rode npx tsc --noEmit ao final. Não faça deploy.
```

---

## 5. Teste de fumaça

1. Roteiro → botão PDF → diálogo de impressão mostra só a decupagem limpa (sem sidebar/botões)? *(16)*
2. Prestação → PDF → despesas agrupadas por rubrica, com subtotais e total? *(3B.6)*
3. Finance com muitas despesas → navega entre páginas e os filtros continuam valendo? *(paginação)*
4. OD → PDF → continua gerando certo? *(17)*

---

## 6. Fechamento (deploy único)

```powershell
cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp"
git add .
git commit -m "Sprint 3C: PDF decupagem, PDF prestacao, paginacao Finance"
git push
vercel --prod
```

---

## 7. Depois da 3C — o que resta das 19 observações

Sobra só o módulo novo **Mapa de Transporte (18 + PDF 19)** → vira **Sprint 3D**
(precisa de migration: tabela do mapa associando equipe×locação×deslocamento,
horários, ordem de chegada/saída). A coluna LOGÍSTICA da matriz já está reservada.
