# SPEC — Reformulação da sub-aba CONTRATOS

> Fase 1 (Cowork). Análise + proposta. Nenhum código alterado ainda.
> Data: 02/07/2026 · Autor: assessoria técnica Glauber

---

## 1. PROBLEMA (relatado pela equipe em campo)

A sub-aba **Contratos** (dentro de Produção) está defasada:

1. É **um único contrato por projeto** (`maybeSingle`) — inviável: uma produção real tem dezenas (um por técnico, elenco, fornecedor, roteirista, direção…).
2. **Não armazena arquivos** — o campo "arquivo" é só uma caixa de texto para colar uma URL externa (`arquivo_url`). Não há upload, nem visualização, nem exclusão dentro da aba.
3. Os documentos de contrato acabam indo, de forma não-intuitiva, para a aba **Onboarding** (tabela `documentos_pessoa`, `tipo='contrato'`), que é o lugar errado para a produção procurá-los.

**Objetivo:** transformar a sub-aba em um repositório real de contratos da produção — formulário profissional completo, upload/visualização/exclusão de PDFs, exportação do formulário em PDF para assinatura e reupload do assinado.

---

## 2. O QUE OS 6 MODELOS REAIS ENSINARAM

Analisados: RioFilme (coprodução/apoio), Prestação de Serviço (FUNCITERN/PNAB), Roteirista (Netflix/Whindersson), Direção de Produção (B52/Lei Paulo Gustavo), BBB 26 (VIU/prestação artística), Técnicos (SIC Recife — o mais moderno).

Todos convergem para a mesma anatomia de **dois quadros + cláusulas**. O modelo dos **Técnicos (SIC)** é o mais bem estruturado e serve de espinha dorsal:

- **QUADRO 1 — Identificação das partes:** Contratante (produtora) · Contratada (PJ ou PF) · Interveniente-Anuente (a pessoa física quando a contratada é PJ) · Dados bancários da contratada.
- **QUADRO 2 — Objeto, prazo e remuneração:** Obra + edital/lei de incentivo · Função contratada · Períodos (preparação, produção/gravações, pós) · Remuneração bruta · Parcelamento (nº de parcelas, valor/%, gatilho e data de cada).
- **Cláusulas recorrentes:** cessão de direitos autorais, exclusividade, confidencialidade (prazo), multa rescisória (%), créditos na obra (formato), vínculo civil (não-empregatício), foro.

Padrões que **precisam** existir no formulário (senão não cobre casos reais):
- Contratada pode ser **PJ (CNPJ)** ou **PF (CPF)** → o form muda de campos.
- Quando é PJ, quase sempre há um **interveniente-anuente** (o artista/técnico pessoa física) com qualificação própria (nome artístico, RG + órgão, nacionalidade, estado civil, profissão, endereço).
- **Vínculo a edital/lei de incentivo** (SIC, Funcultura, Lei Paulo Gustavo, RioFilme) com nº de Termo de Compromisso/Execução — é dado obrigatório de prestação de contas.
- **Parcelamento condicionado a repasse** — o "gatilho" de cada parcela é essencial no audiovisual incentivado.
- **Dados bancários/PIX** da contratada.

---

## 3. CAMPOS ESSENCIAIS DO NOVO FORMULÁRIO

Legenda: **●** obrigatório · ○ opcional · ⤷ condicional

### Bloco A — Identificação do contrato
- ● **Tipo de contrato** (select): Prestação de serviços técnicos · Roteirista · Direção · Elenco · Fornecedor/Locação · Cessão de direitos · Coprodução/Apoio · Outro
- ● **Função contratada** (vincular ao catálogo `funcoes_av`) ○ ou texto livre
- ○ Número do contrato
- ● **Status** (novo enum): `rascunho` · `enviado_assinatura` · `assinado` · `vigente` · `encerrado` · `cancelado`
- ○ Vínculo a incentivo: **Lei/Edital** (SIC, Funcultura, Lei Paulo Gustavo, RioFilme, Nenhum/Privado) + **Nº Termo de Compromisso/Execução**

### Bloco B — Contratante (produtora)
Pré-preenchível a partir da organização/proponente do projeto.
- ● Razão social · ● CNPJ · ● Endereço/sede · ● Representante legal (nome) · ● CPF do rep. · ○ E-mail

### Bloco C — Contratada
- ● **Pessoa** (radio): PJ · PF
- ⤷ Se PJ: ● Razão social · ● CNPJ · ● Endereço · ● Representante legal (nome) · ○ CPF do rep.
- ⤷ Se PF: ● Nome completo · ● CPF · ● RG + órgão expedidor · ● Endereço · ○ Nacionalidade · ○ Estado civil · ○ Profissão
- ● E-mail
- **Dados bancários:** ○ Banco · ○ Agência · ○ Conta · ○ PIX

### Bloco D — Interveniente-Anuente ⤷ (só quando Contratada = PJ)
- ● Nome completo · ○ Nome artístico · ● CPF · ● RG + órgão · ○ Nacionalidade · ○ Estado civil · ○ Profissão · ○ Endereço · ○ E-mail

### Bloco E — Objeto e prazos
- ● **Objeto** (texto) — descrição do serviço/função
- Obra: ○ título (herda do projeto) · ○ tipo (curta/longa/série/publicidade/reality)
- ● **Período de preparação/pré-produção** (início–fim)
- ● **Período de produção/gravações** (início–fim) ← "presença essencial"
- ○ Período de pós-produção (início–fim)
- ● **Data de assinatura** · ● **Vigência** (início–fim)

### Bloco F — Remuneração
- ● **Valor total bruto** (numérico) → gerar "por extenso" automaticamente
- ● **Nº de parcelas**
- Por parcela (repetível): ● valor **ou** % · ● gatilho/condição (ex.: "na assinatura", "no 1º dia de gravação", "condicionado ao repasse SIC") · ○ data prevista
- ○ Retenção de tributos na fonte (sim/não) · ○ Emissão de NF exigida (sim/não)

### Bloco G — Cláusulas / flags
- ○ Cessão de direitos autorais (sim/não) · ○ Exclusividade (sim/não)
- ○ Confidencialidade — prazo (anos) · ○ Multa rescisória (%) 
- ○ Crédito na obra — formato (texto) · ○ Foro (comarca)
- ○ Observações (livre)

### Bloco H — Documentos anexos (a novidade central)
- **Upload** de 1..N arquivos (PDF/JPG/PNG, ≤10 MB) — ex.: minuta, contrato assinado, aditivo, RG/CPF anexos
- Cada arquivo: rótulo (minuta / assinado / aditivo / outro), **visualizar** (link assinado), **excluir**
- Data de upload + quem enviou

---

## 4. COMO A SUB-ABA DEVE FICAR (organização/UX)

Hoje a rota abre direto num form único e, ao salvar, **redireciona para o dashboard** (comportamento a remover).

Proposta — **lista → detalhe**:

1. **Lista de contratos do projeto** (rota `/projetos/:id/contratos`): tabela/cards com Função · Contratada · Valor · Status (badge) · nº de anexos (📎) · ações. Botão **"Novo contrato"**. Filtro por status/tipo. Busca por contratada.
2. **Detalhe/edição** (`/projetos/:id/contratos/:contratoId`): o formulário dos blocos A–H + a área de anexos.
3. **Ações por contrato:**
   - **Exportar em PDF** — gera o contrato preenchido a partir de um template, para baixar e assinar (ainda não temos integração de assinatura eletrônica).
   - **Enviar para assinatura** — muda status para `enviado_assinatura` (sem integração ainda; apenas controle de estado).
   - **Anexar assinado** — reupload do PDF assinado → status `assinado`.
   - **Visualizar / Excluir** anexos e **Excluir** contrato (respeitando `pode('contratos','editar')`).

---

## 5. ESTADO ATUAL DO CÓDIGO (avaliação)

| Item | Hoje | Precisa virar |
|------|------|---------------|
| `Contract.tsx` | 1 form, `maybeSingle` (1 contrato/projeto), redireciona ao salvar | Lista + detalhe; N contratos/projeto |
| Arquivo | Campo texto `arquivo_url` (URL externa) | Upload real ao bucket `documentos` + signed URL + delete |
| Tabela `contratos` | 14 colunas básicas (numero, objeto, valor, datas, status, arquivo_url, obs) | + campos das partes (ou JSONB), parcelas, tipo, função, vínculo edital |
| Anexos | inexistente | nova tabela `contrato_anexos` (1..N por contrato) |
| Onboarding | `documentos_pessoa` guarda `tipo='contrato'` via URL | manter para docs pessoais (RG/CPF); **retirar contratos** dessa rota |
| Permissões | `pode('contratos','ver'/'editar')` já existe (RLS: "select org" + "write pode") | reutilizar sem mudança |
| Storage | bucket **`documentos`** privado (10 MB), RLS insert/select/delete p/ authenticated **já existe** | reutilizar — nenhum bucket novo |

**Boa notícia (baixo risco de migração):** hoje há **1** contrato no banco inteiro e **0** documentos com `tipo='contrato'` no Onboarding. Ou seja, a "migração de armazenamento do Onboarding para Contratos" é praticamente só uma decisão de arquitetura daqui pra frente — não há volume real para mover.

Padrão de upload já consolidado no app (reutilizar, ex.: `Cast.tsx`, `Team.tsx`, `FigurinoArte.tsx`):
```
supabase.storage.from("documentos").upload(path, file, { upsert: true })
supabase.storage.from("documentos").createSignedUrl(path, 300)   // visualizar
supabase.storage.from("documentos").remove([path])               // excluir
```
Caminho sugerido: `contratos/{projeto_id}/{contrato_id}/{arquivo}.pdf`

---

## 6. MUDANÇAS DE ESTRUTURA NECESSÁRIAS

### 6.1 Banco (migration nova — proposta 0073)
- `contratos`: novo `CHECK` de status (6 valores); colunas novas — `tipo text`, `funcao_av_id uuid null`, `contratada_tipo text ('pj'|'pf')`, blocos de partes e banco. **Recomendação:** guardar partes/parcelas/cláusulas em **JSONB** (`partes jsonb`, `parcelas jsonb`, `clausulas jsonb`) para flexibilidade, mantendo em colunas próprias só o que se filtra/ordena (valor, status, tipo, datas, função).
- **Nova tabela `contrato_anexos`**: `id, contrato_id fk, projeto_id, rotulo text, arquivo_path text, mime text, tamanho int, enviado_por uuid, criado_em`. RLS espelhando `contratos` (`pode('contratos', …)`).
- Nada de bucket novo (reusa `documentos`).

### 6.2 Front
- Reescrever `Contract.tsx` → `Contracts.tsx` (lista) + `ContractForm.tsx` (detalhe). **Arquivo grande e multi-arquivo → fazer no Claude Code**, não por Edit no Cowork (regra 11 do CLAUDE.md — Edit trunca .tsx grandes).
- Componente de anexos reutilizável (upload/lista/visualizar/excluir) — espelhar `UploadComprovante.tsx`.
- Rota da lista + detalhe; remover o redirect pós-save.
- Exportação PDF: template do contrato (ver 6.3).

### 6.3 Exportar em PDF
Duas opções a decidir:
- **(A) Client-side** com `@react-pdf/renderer` ou `pdfmake` — rápido, sem backend, template em código.
- **(B) Edge Function** que monta o PDF (mais controle, reaproveita infra de functions).
Recomendação para o prazo: **(A)**, um template só ("Prestação de serviços técnicos" — o modelo SIC), expandindo depois.

---

## 7. ESTRATÉGIA DE AÇÃO (faseada)

**F0 — Decisões (agora):** confirmar itens da seção 8.

**F1 — Banco (Cowork, confirmando SQL):** migration 0073 (novo check de status + colunas/JSONB + tabela `contrato_anexos` + RLS). Aplicar via MCP **e** criar o `.sql` no repo na mesma hora (regra 12).

**F2 — Front lista/detalhe + anexos (Claude Code):** reescrever a página, plugar upload no bucket `documentos`, visualizar/excluir, remover o campo de URL manual. `npx tsc --noEmit` antes do deploy.

**F3 — Exportar PDF (Claude Code):** template + botão baixar.

**F4 — Higienização Onboarding:** manter só docs pessoais; retirar a opção "contrato" de lá (ou redirecioná-la para a nova aba).

**F5 — Deploy:** `cd cineflow-mvp` → `vercel --prod` → testar com Ctrl+Shift+R.

---

## 8. DECISÕES FECHADAS (02/07/2026)

1. **Múltiplos contratos por projeto** — ✅ SIM, N contratos (lista → detalhe).
2. **Partes/parcelas/cláusulas** — ✅ JSONB (colunas próprias só p/ o que filtra/ordena: valor, status, tipo, datas, função, pessoa_id).
3. **Exportar PDF** — ✅ **client-side, 1 template (SIC)**. Nuance chave: **o PDF gerado é salvo automaticamente como anexo do contrato** (rótulo `gerado`), ficando visível a qualquer momento. O fluxo vira: preencher → exportar PDF (salva anexo) → assinar fora → reupload do assinado (rótulo `assinado`, status → `assinado`).
4. **Onboarding** — ✅ **remover totalmente** a opção "contrato". Onboarding fica **só com documentos pessoais** (RG/CPF/comprovantes) das pessoas registradas por cada empresa, servindo de **banco de dados para preencher a documentação de equipe**. Sem atalho para Contratos.
5. **Vínculo a pessoa** — ✅ `pessoa_id` **opcional** no contrato (casa com Team/Onboarding; cobre também fornecedores/PJ avulsos sem pessoa cadastrada).

### Impactos das decisões no plano
- `contrato_anexos.rotulo` deve prever: `minuta` · `gerado` · `assinado` · `aditivo` · `outro`.
- Export PDF (F3) grava o arquivo no bucket `documentos` e cria a linha em `contrato_anexos` — não é só download.
- F4 (Onboarding): remover o item `contrato` do `TIPO_OPTS`; garantir que os demais tipos pessoais continuem alimentando a documentação de equipe.
- `contratos` ganha coluna `pessoa_id uuid null` (FK `pessoas`), indexada.
