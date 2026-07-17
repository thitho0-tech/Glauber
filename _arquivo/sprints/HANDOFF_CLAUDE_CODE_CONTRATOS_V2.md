# HANDOFF → Claude Code · Contratos v2 (3 melhorias)

> Cole no Claude Code rodando em `cineflow-mvp/`. Continua a leva anterior (commit e5d16b1, já em produção).
> **Sem migration** nesta leva — todas as colunas de `contratos` já são nullable e a FK de anexos já tem `on delete cascade`.
> Backend novo já pronto: edge function **`analisar-contrato`** (deployada, `verify_jwt: true`).

Arquivos-alvo: `src/pages/Contracts.tsx`, `src/pages/ContractForm.tsx`, `src/components/contracts/ContratoAnexos.tsx` (referência de padrão de upload/storage).

---

## ITEM 1 — Excluir contrato na lista (com confirmação)

Em `Contracts.tsx`, cada linha/card ganha ação **Excluir** (ícone lixeira), visível só com `can('contratos','editar')`.

- Abrir **AlertDialog** (shadcn) de confirmação: "Excluir contrato? Esta ação remove o contrato e todos os anexos. Não pode ser desfeita." → Cancelar / Excluir.
- Ao confirmar:
  1. Buscar os anexos: `select arquivo_path from contrato_anexos where contrato_id = :id`.
  2. **Remover os arquivos do storage:** `supabase.storage.from('documentos').remove(paths)` (evita órfãos — o cascade só apaga as linhas, não os objetos do bucket).
  3. `supabase.from('contratos').delete().eq('id', id)` (o `on delete cascade` limpa as linhas de `contrato_anexos`).
  4. `invalidateQueries` da lista + toast "Contrato excluído".
- Radix Select em qualquer lugar: nunca `value=""` (sentinela `"__none__"`).

---

## ITEM 2 — Anexar contrato pronto/assinado direto na lista (com leitura por IA)

Botão **"Anexar contrato pronto"** no cabeçalho da sub-aba `Contracts.tsx` (ao lado de "Novo contrato"), visível só com `can('contratos','editar')`.

Fluxo (dialog dedicado):
1. **Selecionar arquivo** (PDF/JPG/PNG, ≤10 MB).
2. **Upload** ao bucket `documentos` no path `contratos/${projetoId}/pending/${crypto.randomUUID()}.${ext}` → gerar **signed URL** (`createSignedUrl(path, 300)`).
3. **Ler o contrato:** `supabase.functions.invoke('analisar-contrato', { body: { arquivo_url: signedUrl } })`.
   - Retorno: `{ ok, tipo, contratada, valor }` (qualquer campo pode vir `null`). Mostrar um estado de "Analisando documento…" enquanto roda (a IA + OCR levam alguns segundos).
   - Se `invoke` falhar ou vier tudo `null`: não bloquear — seguir com os campos vazios pro usuário preencher à mão (toast discreto "Não consegui ler automaticamente, preencha os campos").
4. **Diálogo de confirmação/edição** — o "enquadramento" do documento, **sempre editável** (pré-preenchido pela IA, mas o usuário corrige):
   - **Tipo** (Select — mesmo domínio do form) · **Contratada** (Input texto) · **Valor** (Input number) · **Status** (Select: rascunho/enviado_assinatura/assinado/vigente/encerrado/cancelado — default `assinado`) · **Rótulo do anexo** (Select: assinado/minuta/aditivo/outro — default `assinado`).
5. **Salvar:**
   - `insert` em `contratos`: `{ projeto_id, tipo, valor, status, partes: { contratada: { razao_social: contratada } }, origem: 'upload' }` → pegar o `id` gerado (`.select().single()`).
   - **Mover/registrar o anexo:** inserir em `contrato_anexos` `{ contrato_id, projeto_id, rotulo, arquivo_path: <path final>, mime, tamanho, enviado_por: auth.uid }`. Reaproveite o path do upload (pode manter `pending/…` ou copiar para `contratos/${projetoId}/${contratoId}/…`; se copiar, remova o pending).
   - Fechar dialog, `invalidateQueries`, toast, e a linha aparece na lista igual às demais (badge de status + 📎).
6. **Abrir para visualização:** clicar no contrato abre o `ContractForm` normal — lá o anexo aparece no Bloco H com **Visualizar** (signed URL). Como é uma linha `contratos` comum, **Tipo/Contratada/Valor/Status ficam editáveis para sempre** (é a correção de "leitura errada da IA" pedida — reeditar o enquadramento a qualquer momento).

> Nota: `origem: 'upload'` é opcional — a coluna não existe no banco. **Não** envie `origem` no insert (evita erro de coluna inexistente); se quiser diferenciar visualmente, deduza pela ausência de `objeto`/`partes.contratante` ou simplesmente não diferencie. Para esta leva, **não** mande `origem`.

---

## ITEM 3 — Salvar contrato incompleto quando Status = "Rascunho"

Em `ContractForm.tsx`, a validação de salvar passa a depender do status:

- **Se `status === 'rascunho'`:** permitir salvar com qualquer campo vazio (só exige `projeto_id`, que é implícito). Nenhum campo obrigatório trava o "Salvar".
- **Se `status !== 'rascunho'`:** manter/aplicar as validações essenciais mínimas antes de salvar (ex.: exigir ao menos **tipo** e **contratada** — `partes.contratada.razao_social` — e, se possível, **valor**). Se faltar, `toast.error` apontando o que falta e não salvar.
- O botão pode chamar-se "Salvar rascunho" quando status = rascunho e "Salvar contrato" nos demais.
- O banco já aceita tudo nulo (colunas nullable), então é só validação de front.

---

## REGRAS DO PROJETO (obrigatório)
- `.tsx` grande → escrever com Write/heredoc, **nunca patch parcial** (Edit trunca).
- Radix `<SelectItem>` nunca com `value=""` → sentinela `"__none__"`, converter p/ null ao salvar.
- `npx tsc --noEmit` limpo antes de terminar.
- **Não** faça deploy; o fundador roda `vercel --prod` de `cineflow-mvp`. Não use `git add -A`.

## ENTREGA
Ajustes em `Contracts.tsx` (excluir + anexar pronto), `ContractForm.tsx` (validação por status), e o dialog de anexar-pronto (pode ser componente novo em `src/components/contracts/`). `tsc --noEmit` limpo. Resuma os arquivos alterados ao final.
