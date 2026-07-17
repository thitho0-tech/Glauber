# Sprint 3B — Spec de Execução · Financeiro robusto

**Data:** 05/06/2026 · **Base:** Destaques (obs 08, 09, 10, 11, 12) + gaps SPRINT_STATE (prestação PDF, paginação)
**Pré-requisito:** Sprint 3A em produção (commit d70cbb8)

---

## 1. Escopo

| # | Item | Observação | Onde |
|---|---|---|---|
| 3B.1 | Migration: `despesas.fornecedor_id` + status `paga` + reload schema | 09, 11 | **Cowork** (gerada) → SQL Editor |
| 3B.2 | Selecionar fornecedor na despesa + **autofill CNPJ** | 09, 10 | **Claude Code** |
| 3B.3 | Campo de **upload de comprovante** (PNG/PDF/JPEG) no form de despesa | 08 | **Claude Code** |
| 3B.4 | **Status editável** da despesa (Pendente→Aprovada/Rejeitada/Paga), gated por RBAC | 11 | **Claude Code** |
| 3B.5 | Separar **Configurações**: aba do usuário × aba de gestão do projeto | 12 | **Claude Code** |
| 3B.6 *(stretch)* | Exportar **prestação em PDF** + paginação na lista de Finance | gaps | **Claude Code** |

3B.1→3B.4 são o núcleo (fecham o Financeiro do dia a dia). 3B.5 e 3B.6 entram se sobrar tempo antes do prazo da trilha; senão viram 3C.

---

## 2. Fatos de schema (já verificados — não re-descobrir)

- `despesas`: `id, projeto_id, linha_orcamento_id, descricao, valor, data, departamento, comprovante_url, cnpj_emitente, numero_nf, status, forma_pagamento, data_emissao_nf, criado_por, criado_em`. **Coluna de comprovante = `comprovante_url`** (não `comprovante_path`).
- Após a 0038: existe `despesas.fornecedor_id` (FK→fornecedores) e `status` aceita `pendente|aprovada|rejeitada|paga`.
- `fornecedores` é **org-scoped** (`org_id`, não `projeto_id`): `id, org_id, nome, cnpj, cpf, tipo, email, telefone, dados_bancarios, ativo`. Ao listar fornecedores no form de despesa, filtrar pela org do usuário (RLS já faz isso).
- Bucket de Storage **`comprovantes`** (privado) já existe desde a migration 0025 — usar para o upload.
- RBAC: `canEdit` vem de `useProjectRole` / `tem_perm_projeto`. Só `owner/admin/producao` mudam status de despesa.

---

## 3. Passo 1 — aplicar a migration (Cowork → Supabase, agora)

1. SQL Editor: https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/sql
2. Cole o conteúdo de `0038_despesas_fornecedor_status.sql` e **Run**.
3. Rode a Verificação no rodapé (coluna existe + check inclui `paga`).
4. O `notify pgrst, 'reload schema'` no fim já cura o erro "schema cache" da obs 09 na hora.

---

## 4. Passo 2 — prompt para o Claude Code (núcleo 3B.2–3B.4)

`cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp"` → `claude` → cole:

```
Sprint 3B (núcleo) — Financeiro. Leia ../SPRINT_STATE.md e ../SPRINT_3B_SPEC.md.
A migration 0038 já foi aplicada: despesas.fornecedor_id existe (FK→fornecedores)
e status aceita pendente|aprovada|rejeitada|paga.

Em Finance.tsx (e componentes do form de despesa), implemente:

1. (obs 09/10) Campo "Fornecedor": <select> dos fornecedores da org (RLS já
   filtra). Ao gravar a despesa, setar despesas.fornecedor_id. Ao escolher um
   fornecedor, AUTO-PREENCHER o campo cnpj_emitente com fornecedor.cnpj
   (editável). Se o fornecedor só tiver CPF, preencher com o CPF.

2. (obs 08) Campo de UPLOAD de comprovante aceitando PNG, JPEG e PDF: subir pro
   bucket privado "comprovantes" (caminho sugerido: <projeto_id>/<despesa_id ou
   uuid>.<ext>), salvar o caminho em despesas.comprovante_url. Mostrar
   preview/link do arquivo já enviado. Validar tipo e tamanho (<10MB).

3. (obs 11) STATUS editável: a despesa nasce 'pendente'. Quem tem canEdit
   (owner/admin/producao via useProjectRole) pode mudar para aprovada/rejeitada/
   paga direto na lista (dropdown ou badge clicável). Quem não tem canEdit vê o
   status como badge somente-leitura.

Regras: PowerShell sem &&; editar .tsx grande via python3 se o editor truncar;
vínculo auth por email match. Rode npx tsc --noEmit ao final e me diga se há SQL
manual pendente. Não faça deploy — eu testo antes.
```

Depois do núcleo OK e testado, abrimos um segundo prompt para 3B.5 (split Settings) e 3B.6 (prestação PDF + paginação).

---

## 5. Teste de fumaça (após o núcleo)

1. Lançar despesa escolhendo um fornecedor → o CNPJ preenche sozinho? *(09/10)*
2. Anexar um PDF e um JPEG de comprovante → sobem e aparece o link? *(08)*
3. Despesa nasce como **Pendente**; como produção, mudar para **Paga** → persiste? *(11)*
4. Como leitor (sem canEdit) → status aparece travado (sem dropdown)? *(RBAC)*
5. O erro "fornecedor_id ... schema cache" **não** acontece mais? *(09)*

---

## 6. Fechamento (deploy único no fim)

```powershell
cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp"
git add .
git commit -m "Sprint 3B: fornecedor+CNPJ, upload comprovante, status editavel"
git push
vercel --prod
```
