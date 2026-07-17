# HANDOFF → Claude Code · Reformulação da sub-aba CONTRATOS

> Cole este prompt no Claude Code rodando na raiz `cineflow-mvp/`.
> A migration **0074** (banco) roda em paralelo pelo Cowork — **assuma o schema abaixo como já existente**.
> Spec de referência: `../SPRINT_CONTRATOS_SPEC.md`.

---

## CONTEXTO

A sub-aba **Contratos** (dentro de `/projetos/:id/producao/contrato`) hoje é `src/pages/Contract.tsx`: **um único** contrato por projeto (`maybeSingle`), o "arquivo" é só uma URL de texto (`arquivo_url`), sem upload/visualização/exclusão, e ao salvar redireciona pro dashboard. Precisa virar um repositório real de contratos.

Decisões já fechadas com o fundador:
- **N contratos por projeto** (lista → detalhe).
- **Anexos com upload real** no bucket `documentos` (já existe, privado, 10 MB).
- **Export PDF client-side** (1 template) que **também salva o PDF gerado como anexo**.
- **Onboarding perde a opção "contrato"** (fica só docs pessoais).
- **Vínculo opcional a `pessoa_id`**.

---

## SCHEMA (criado pela migration 0074 — NÃO alterar banco, só consumir)

Tabela `contratos` (colunas relevantes, além das já existentes id/projeto_id/numero/objeto/valor/data_assinatura/vigencia_inicio/vigencia_fim/observacoes/criado_por/criado_em/atualizado_em):
- `status text` — novo domínio: `'rascunho' | 'enviado_assinatura' | 'assinado' | 'vigente' | 'encerrado' | 'cancelado'`
- `tipo text` — `'servicos_tecnicos' | 'roteirista' | 'direcao' | 'elenco' | 'fornecedor' | 'cessao_direitos' | 'coproducao' | 'outro'`
- `funcao_av_id uuid null` (FK `funcoes_av`)
- `pessoa_id uuid null` (FK `pessoas`) — vínculo opcional a membro da equipe
- `contratada_tipo text null` — `'pj' | 'pf'`
- `lei_incentivo text null` — ex.: 'SIC', 'Funcultura', 'Lei Paulo Gustavo', 'RioFilme', 'Nenhum'
- `termo_numero text null`
- `partes jsonb default '{}'` — ver forma abaixo
- `parcelas jsonb default '[]'`
- `clausulas jsonb default '{}'`
- `arquivo_url text` — legado, **não usar mais** para novos (deixar quieto)

Tabela nova `contrato_anexos`:
- `id uuid pk`, `contrato_id uuid fk contratos on delete cascade`, `projeto_id uuid`, 
- `rotulo text` — `'minuta' | 'gerado' | 'assinado' | 'aditivo' | 'outro'`
- `arquivo_path text` (path no bucket `documentos`), `mime text`, `tamanho int`,
- `enviado_por uuid`, `criado_em timestamptz default now()`

Forma do `partes` (jsonb):
```json
{
  "contratante": { "razao_social":"", "cnpj":"", "endereco":"", "rep_legal":"", "cpf_rep":"", "email":"" },
  "contratada":  { "razao_social":"", "cnpj":"", "cpf":"", "nome":"", "endereco":"", "rep_legal":"", "email":"",
                   "rg":"", "orgao_rg":"", "nacionalidade":"", "estado_civil":"", "profissao":"",
                   "banco":"", "agencia":"", "conta":"", "pix":"" },
  "interveniente": { "nome":"", "nome_artistico":"", "cpf":"", "rg":"", "orgao_rg":"",
                     "nacionalidade":"", "estado_civil":"", "profissao":"", "endereco":"", "email":"" }
}
```
Forma de cada item de `parcelas` (jsonb array):
```json
{ "valor": 0, "percentual": null, "gatilho": "na assinatura", "data_prevista": "2026-07-20" }
```
Forma de `clausulas` (jsonb):
```json
{ "cessao_direitos": true, "exclusividade": false, "confidencialidade_anos": 5,
  "multa_rescisoria_pct": 10, "credito_formato": "", "foro": "" }
```

RLS já aplicada em ambas as tabelas: leitura por org (`user_orgs()`), escrita por `pode(projeto_id,'contratos','editar')`. **Reutilize `usePermissions(projetoId).can('contratos','ver'|'editar')` no front, igual ao Contract.tsx atual.**

---

## O QUE FAZER

### 1. Roteamento (`src/App.tsx`)
- Trocar a rota `contrato` por **duas**, dentro do hub Produção:
  - `contratos` → `<Contracts />` (lista)
  - `contratos/:contratoId` → `<ContractForm />` (detalhe/edição; `:contratoId` = `novo` para criar)
- Manter uma rota legada `contrato` redirecionando para `contratos` (backward-compat).
- Atualizar o link da sub-aba no componente do hub Produção (procure onde "Contrato"/`contrato` aparece na navegação de `Producao`).

### 2. `src/pages/Contracts.tsx` (NOVO — lista)
- Query: `supabase.from('contratos').select('id,tipo,status,valor,funcao_av_id,pessoa_id,partes,criado_em, contrato_anexos(count)').eq('projeto_id', projetoId).order('criado_em',{ascending:false})`.
- Tabela/cards: **Função/Tipo · Contratada** (de `partes.contratada.razao_social || .nome`) **· Valor** (R$) **· Status** (badge colorido) **· 📎 nº de anexos** · ações (abrir).
- Botão **"Novo contrato"** → navega para `contratos/novo`.
- Filtro por status e por tipo; busca por nome da contratada.
- Respeitar `can('contratos','ver')` (bloqueio igual ao atual) e esconder "Novo"/editar sem `can('contratos','editar')`.
- Estado vazio amigável.

### 3. `src/pages/ContractForm.tsx` (NOVO — detalhe)
Formulário em blocos (ver spec §3):
- **A Identificação:** tipo (select), função (select `funcoes_av` — reutilize o mesmo padrão de select de função usado em Team; senão texto livre), número, status (select 6 valores), lei_incentivo (select) + termo_numero, `pessoa_id` (select opcional de membros da equipe do projeto).
- **B Contratante:** razão social, CNPJ, endereço, rep_legal, cpf_rep, email. Pré-preencher a partir da org/proponente do projeto se disponível.
- **C Contratada:** radio **PJ/PF** (`contratada_tipo`) que alterna os campos; + dados bancários (banco/agência/conta/PIX).
- **D Interveniente-Anuente:** renderizar **somente quando `contratada_tipo === 'pj'`**.
- **E Objeto e prazos:** objeto (textarea), períodos preparação/produção/pós (pares de datas), data_assinatura, vigência início/fim.
- **F Remuneração:** valor total (number) + gerar "por extenso" (util simples pt-BR); nº de parcelas com editor repetível (valor **ou** %, gatilho, data).
- **G Cláusulas:** cessão de direitos, exclusividade, confidencialidade (anos), multa (%), crédito (texto), foro, observações.
- **H Anexos:** componente abaixo.
- Salvar via `insert`/`update` montando `partes`/`parcelas`/`clausulas` em JSONB. **Não** redirecionar pro dashboard — voltar para a lista ou permanecer com toast.

### 4. Componente de anexos (reutilizável)
Espelhar `src/components/finance/UploadComprovante.tsx`. Para cada contrato:
- **Upload** (PDF/JPG/PNG ≤10 MB) → `supabase.storage.from('documentos').upload(path,file,{upsert:true})` com path `contratos/${projetoId}/${contratoId}/${crypto.randomUUID()}.${ext}` → inserir linha em `contrato_anexos` (rotulo escolhido, mime, tamanho, enviado_por = auth.uid).
- **Listar** anexos do contrato; **Visualizar** = `createSignedUrl(path,300)` → `window.open`. **Excluir** = `storage.remove([path])` + delete da linha.
- Rótulo selecionável: minuta / assinado / aditivo / outro (o `gerado` é criado pelo export, item 5).
- Anexos só aparecem depois que o contrato tem `id` (salvar primeiro se for `novo`).

### 5. Export PDF (client-side)
- Instalar **`pdfmake`** (`npm i pdfmake`) — mais simples que react-pdf para documento textual.
- Botão **"Exportar PDF"** no ContractForm: monta o contrato preenchido a partir de um **template único** (use o modelo **"Prestação de serviços técnicos" (SIC)** como base — está descrito no spec e nos modelos analisados; estrutura Quadro 1 + Quadro 2 + cláusulas padrão).
- Após gerar: **fazer upload do PDF no bucket `documentos`** (mesmo path dos anexos) e **criar linha em `contrato_anexos` com `rotulo='gerado'`**, além de baixar para o usuário. Assim o gerado fica visível a qualquer momento.
- Fluxo completo: preencher → Exportar PDF (salva `gerado`) → assinar fora → subir assinado (`rotulo='assinado'`, status → `assinado`).

### 6. Limpeza do Onboarding (`src/pages/Onboarding.tsx`)
- Remover o item `{ value: "contrato", label: "Contrato assinado" }` do array `TIPOS` (linha ~43). Onboarding fica só com docs pessoais (RG, CPF, comprovante de endereço, foto, outro), servindo de banco de dados para a documentação de equipe. Não adicionar atalho.

---

## REGRAS DO PROJETO (obrigatório)
- **`.tsx` grandes → escrever com Write/heredoc, nunca por patch parcial** (Edit trunca — histórico do projeto).
- **Radix `<SelectItem>` nunca com `value=""`** — usar sentinela `"__none__"` e converter para null ao salvar.
- **`npx tsc --noEmit`** antes de terminar — pega arquivo truncado.
- Deploy é manual: **NÃO** faça deploy; ao final, o fundador roda `vercel --prod` da pasta `cineflow-mvp`.
- Não rode `git add -A`; stage só os arquivos desta leva.

## ENTREGA ESPERADA
`Contracts.tsx`, `ContractForm.tsx`, componente de anexos, util "valor por extenso", template pdfmake, ajustes em `App.tsx`, navegação do hub Produção e `Onboarding.tsx`. `tsc --noEmit` limpo. Resuma os arquivos alterados ao final.
