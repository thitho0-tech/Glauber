# HANDOFF → Claude Code · Contratos v4 (2 fixes cirúrgicos)

> Cole no Claude Code em `cineflow-mvp/`. Continua v1/v2/v3 (já em produção).
> **Somente 2 arquivos devem ser tocados:** `src/lib/contratoTemplate.ts` e `src/components/contracts/AnexarContratoDialog.tsx`.
> Antes de terminar: `npx tsc --noEmit` limpo e conferir que `git status --short` mostra **apenas esses 2** modificados (nada de App.tsx/package.json/Onboarding/Producao — em levas passadas o Claude Code corrompeu esses colaterais; reescreva arquivo inteiro, nunca patch parcial).

---

## FIX 1 — "Erro ao gerar PDF: Cannot read properties of undefined (reading 'vfs')"

Causa: o projeto usa **pdfmake ^0.3.11**, e nessa linha o módulo `pdfmake/build/vfs_fonts` mudou de formato. O código atual (`src/lib/contratoTemplate.ts`, ~linha 383-388) faz:
```ts
const pdfMake = (await import('pdfmake/build/pdfmake')) as ...
const pdfFonts = (await import('pdfmake/build/vfs_fonts')) as ...
pdfMake.vfs = pdfFonts.pdfMake.vfs   // ❌ pdfFonts.pdfMake é undefined em 0.3.x
pdfMake.createPdf(docDef).getBlob((blob) => resolve(blob))
```

Substituir esse trecho por uma resolução robusta que funciona em 0.2.x e 0.3.x (e lida com o wrapping em `.default` do import dinâmico no Vite):
```ts
const pdfMakeMod: any = await import('pdfmake/build/pdfmake')
const pdfFontsMod: any = await import('pdfmake/build/vfs_fonts')
const pdfMake: any = pdfMakeMod.default ?? pdfMakeMod
const vfs =
  pdfFontsMod.vfs ??
  pdfFontsMod.pdfMake?.vfs ??
  pdfFontsMod.default?.vfs ??
  pdfFontsMod.default?.pdfMake?.vfs ??
  pdfFontsMod.default
pdfMake.vfs = vfs
return await new Promise<Blob>((resolve) => {
  pdfMake.createPdf(docDef).getBlob((blob: Blob) => resolve(blob))
})
```
(Ajuste o `return`/promessa conforme a assinatura da função existente — o essencial é: usar `pdfMakeMod.default ?? pdfMakeMod` para o objeto pdfMake, e a cadeia de fallback para o `vfs`.)

Se preferir garantir de vez, pode trocar o import dinâmico por import estático no topo do arquivo, contanto que o `vfs` seja resolvido pela mesma cadeia de fallback. **Não** mexer no restante do template (o `docDef` já está pronto).

---

## FIX 2 — Enquadramento: diálogo "Anexar contrato pronto" transbordando/cortado

Em `src/components/contracts/AnexarContratoDialog.tsx`, o `DialogContent` pode ultrapassar a largura da viewport e ficar cortado, e não tem rolagem vertical. Tornar responsivo e com scroll:

- Trocar `<DialogContent className="max-w-lg">` por algo como:
  `<DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">`
  (nunca excede a tela; rola se faltar altura).
- Garantir que nenhum filho force overflow horizontal:
  - o container de conteúdo pode receber `min-w-0`;
  - a linha de preview do arquivo (ícone + nome) já usa `truncate` no `<span>` — manter, e adicionar `min-w-0` no wrapper flex se necessário;
  - os `SelectTrigger`/`Input` devem ser `w-full` (o padrão do shadcn já é, mas confirme que nada tem largura fixa maior que o diálogo);
  - no grid `grid grid-cols-2 gap-3` (Status / Rótulo), garantir que cada coluna tem `min-w-0` para não empurrar a largura.

Objetivo: o diálogo aparece inteiro e centralizado, sem vazar para a direita, em qualquer largura de tela.

---

## REGRAS
- Reescrever arquivo inteiro (Write/heredoc), **nunca patch parcial**.
- Radix `<SelectItem>` nunca `value=""`.
- `npx tsc --noEmit` limpo.
- **Não** faça git nem deploy. Confirme `git status --short` = só os 2 arquivos. O fundador commita e roda `vercel --prod`.

## ENTREGA
`contratoTemplate.ts` (vfs robusto) e `AnexarContratoDialog.tsx` (diálogo responsivo/scroll). `tsc --noEmit` limpo. Resuma o que mudou.
