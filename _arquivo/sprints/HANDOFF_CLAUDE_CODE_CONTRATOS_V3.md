# HANDOFF → Claude Code · Contratos v3 (correções pós-teste)

> Cole no Claude Code em `cineflow-mvp/`. Continua as levas v1/v2 (commits e5d16b1, e8b9c2f).
> **Migration 0075 já aplicada em produção** (dropou o UNIQUE(projeto_id) e criou `contratos.origem text` default `'formulario'`, check `'formulario'|'upload'`). **Assuma como existente.**

Contexto do teste: o erro `duplicate key value violates unique constraint "contratos_projeto_id_key"` que aparecia ao **criar** e ao **anexar** contrato era a UNIQUE herdada (1 contrato/projeto). A 0075 já resolveu no banco — logo o "Erro ao gerar contrato" e o "Erro de enquadramento ao anexar contrato assinado" devem sumir. As mudanças abaixo são de front, para completar os 4 pontos.

Arquivos-alvo: `src/components/contracts/AnexarContratoDialog.tsx`, `src/pages/Contracts.tsx`, `src/pages/ContractForm.tsx`.

---

## 1. Marcar contrato anexado como `origem='upload'`

Em `AnexarContratoDialog.tsx`, no insert em `contratos`, **incluir `origem: 'upload'`** (a coluna agora existe — na v2 a orientação era não mandar; agora manda). Ex.:
```ts
.insert({ projeto_id, tipo, valor, status, origem: 'upload',
          partes: { contratada: { razao_social: contratada } } })
```
Contratos criados pelo formulário (`ContractForm`) continuam sem enviar `origem` (assume o default `'formulario'`).

---

## 2. Validação por origem + status (resolve "não deixa salvar" do contrato upado)

**Decisão de produto:** contrato com `origem='upload'` é um **documento externo** (a fonte de verdade é o PDF anexado). Ele **não** deve exigir o preenchimento completo do formulário interno.

Em `ContractForm.tsx`, a regra de `handleSave()` passa a ser:

- Se `origem === 'upload'`: **nunca bloquear** por campos internos. Só exige o enquadramento mínimo (tipo, contratada, valor) — que já veio do diálogo de anexar. Todos os demais blocos (partes completas, datas, parcelas, cláusulas) são opcionais e editáveis, mas nunca travam o "Salvar".
- Se `origem === 'formulario'` (ou ausente):
  - `status === 'rascunho'` → salva sem restrição (como já está).
  - `status !== 'rascunho'` → mantém a validação essencial atual (exige contratada do Bloco C e valor do Bloco F).

Assim, abrir um contrato upado e salvar não trava mais, e não é preciso a IA extrair 20+ campos.

> Carregue `origem` no fetch do contrato em `ContractForm` (adicione ao `select`) para poder ramificar a validação.

---

## 3. Lista: "Visualizar" para contrato upado (além do "Abrir")

Em `Contracts.tsx`, adicionar `origem` ao `select` da query e à `type ContratoRow`.

Na coluna **Ações**, por linha:
- **Sempre**: manter a lixeira de excluir (sob `canEdit`) — ver item 4.
- Se `origem === 'upload'`: mostrar um botão **"Visualizar"** (ícone `Eye`) que abre direto o PDF do contrato — busca o anexo mais recente daquele contrato (`select arquivo_path from contrato_anexos where contrato_id = :id order by criado_em desc limit 1`) e faz `supabase.storage.from('documentos').createSignedUrl(path, 300)` → `window.open`. Para o upado, esse é o acesso principal (o usuário quer ver o documento pronto, não o formulário).
- **"Abrir"** (formulário) permanece disponível em todas as linhas (inclusive upado), pois o enquadramento (Tipo/Contratada/Valor/Status) deve continuar editável a qualquer momento. Pode deixar "Abrir" como ação secundária/ghost menor no caso upload.
- Corrigir o overflow visual da coluna Ações (no teste apareceu um "Visualizar" flutuante/cortado); garantir que os botões cabem sem vazar a célula (use `whitespace-nowrap` / largura mínima na coluna).

---

## 4. Garantir exclusão em TODOS os casos (contrato migrado do Onboarding sem lixeira)

Há um contrato antigo (migrado do Onboarding, projeto "CAMISA 10 CUECA 0") que aparece sem botão de excluir. No código atual a lixeira já renderiza para toda linha sob `canEdit`, então:

- Confirme que a lixeira **não depende** de `tipo`/`partes` não-nulos (contratos legados têm `tipo=null`, `partes=null`). O `contratadaNome(null)` já retorna "—", ok — só garanta que nada quebra o render da linha quando `tipo`/`partes` são null (ex.: `TIPO_LABELS[c.tipo]` deve cair no fallback sem erro).
- **Adicionar também um botão "Excluir contrato" dentro do `ContractForm`** (detalhe), sob `canEdit`, com o mesmo dialog de confirmação e a mesma rotina (remover anexos do storage → delete). Isso garante um caminho de exclusão mesmo se a linha da lista tiver algum caso de borda, e é o lugar natural para excluir o que se está vendo.
- Se após deploy + Ctrl+Shift+R a lixeira ainda não aparecer naquele contrato, a causa é `canEdit=false` para o usuário naquele projeto (permissão), não o render — nesse caso é permissão, não código.

---

## REGRAS DO PROJETO (obrigatório)
- `.tsx` grande → escrever com Write/heredoc, **nunca patch parcial** (Edit trunca — já corrompeu arquivos nesta sprint).
- Radix `<SelectItem>` nunca com `value=""` → sentinela `"__none__"`.
- `npx tsc --noEmit` limpo antes de terminar.
- **Não** faça deploy nem git; o fundador roda `vercel --prod` de `cineflow-mvp`. Stage só os arquivos desta leva.

## ENTREGA
`AnexarContratoDialog.tsx` (origem=upload), `Contracts.tsx` (Visualizar p/ upload + origem no select + fix overflow), `ContractForm.tsx` (validação por origem/status + botão excluir). `tsc --noEmit` limpo. Resuma os arquivos alterados.
