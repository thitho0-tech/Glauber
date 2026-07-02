# Glauber — Regras de Editais Brasileiros

> Referência para validações automáticas de despesas.
> Última atualização: 30/06/2026

## Editais Seedados no Banco

| Nome | Órgão | Migrations |
|------|-------|-----------|
| Funcultura PE | Secretaria de Cultura de Pernambuco | 0001, 0002 |
| Lei Paulo Gustavo | Federal | 0001, 0002 |
| SIC Recife 2024 — FIC | Secretaria de Cultura do Recife | 0002 |
| SIC Recife 2024 — MIC | Secretaria de Cultura do Recife | 0002 |

---

## SIC Recife 2024 (referência principal de testes)

### Tipos de Projeto
- **FIC** — Ficção (longas, curtas, séries)
- **MIC** — Minissérieset/webséries e conteúdo para internet

### Categorias de Despesa (rubricas_edital)

| Código | Rubrica | Observações |
|--------|---------|-------------|
| 1.1 | Roteirista | Profissional registrado |
| 1.2 | Diretor | — |
| 1.3 | Produtor Executivo | — |
| 2.1 | Equipe Técnica | CLT/MEI/RPA |
| 2.2 | Elenco | Contrato de cena |
| 3.1 | Locação | Com nota fiscal |
| 3.2 | Equipamento | Aluguel ou compra |
| 4.1 | Material de Produção | Consumível |
| 4.2 | Serviços de Pós-Produção | Edição, color, som |
| 5.1 | Divulgação | Marketing, EPK |
| 5.2 | Prestação de Contas | Contador, auditoria |

### Regras de Validação (função validar_despesa)

1. **Comprovante obrigatório** — toda despesa acima de R$100 precisa de NF ou recibo
2. **CNPJ válido** — verificação do dígito verificador
3. **Valor dentro do teto da rubrica** — cada rubrica tem limite % do orçamento total
4. **Data da despesa no período do projeto** — entre periodo_inicio e periodo_fim
5. **Regime de contratação compatível** — equipe técnica deve ter CLT/MEI/RPA; figuração pode ter RPA simples
6. **Prazo de prestação** — Funcultura exige prestação em até 60 dias do término

### Status de Validação

```
OK    — despesa dentro das regras
WARN  — despesa com ressalva (ex: valor próximo do teto)
FAIL  — despesa fora das regras (bloqueia prestação)
```

---

## Funcultura PE

- Prestação em até 60 dias após o término do projeto
- Comprovante de pagamento obrigatório para valores acima de R$200
- RPA requer dados do prestador (CPF, banco, agência, conta)
- Diárias de locação precisam de contrato ou declaração do local

---

## Lei Paulo Gustavo

- Projetos de 2022 (edital federal emergencial)
- Regras similares ao Funcultura mas com categorias próprias
- Exige relatório de público/impacto para projetos de exibição

---

## Integração no Código

```typescript
// Validação automática ao criar/editar despesa
// Trigger after-insert em despesas → valida e popula validacoes_edital

// Hook no front para exibir status
const { data: validacao } = useQuery({
  queryKey: ['validacao', despesaId],
  queryFn: () => supabase
    .from('validacoes_edital')
    .select('*')
    .eq('despesa_id', despesaId)
    .single()
})
```

Badge de status: verde (OK), amarelo (WARN), vermelho (FAIL) na lista de despesas.
