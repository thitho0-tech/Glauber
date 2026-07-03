# GLAUBER — Contexto Persistente do Agente

> **Leia este arquivo ao retomar qualquer sessão.** Ele é a fonte de verdade consolidada do projeto.
> Última atualização: 30/06/2026

---

## O QUE É O GLAUBER

Plataforma SaaS B2B para gestão de produções audiovisuais brasileiras. Fecha o ciclo completo:
**roteiro → cronograma → Ordem do Dia (OD) → execução → prestação de contas**

Em português. Com compreensão nativa de editais (Funcultura/SIC). Com IA de decupagem.

Nome homenageia Glauber Rocha. Tagline: *"Onde a criação encontra a produção."*

**Contexto da startup:** projeto em trilha de pré-incubação do Porto Digital (Recife).
**Deadline imediato:** ~05/07/2026 (entrega Porto Digital).
**Fundador:** Thiago França — thitho0@gmail.com

---

## LINKS E ACESSOS

| Serviço | URL / Referência |
|---------|-----------------|
| App produção | https://glauber.app.br |
| Vercel dashboard | https://vercel.com/cineflow-s-projects/glauber-mvp |
| GitHub | https://github.com/thitho0-tech/Glauber |
| Supabase projeto | dsrulpipsksvtskqwevc ("glauber-prod", sa-east-1, Postgres 17) |
| Supabase SQL Editor | https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/sql |
| Supabase Functions | https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/functions |

**Pastas locais (Windows):**
- Raiz do git: `C:\Users\Thiago França\Documents\Claude\Projects\Glauber`
- Código app: `Glauber\cineflow-mvp\`
- Docs de projeto: `Glauber\` (este nível)

---

## ESTADO ATUAL (03/07/2026)

### Migrations aplicadas em produção: **0001–0075**

| Bloco | Tema | Migrations |
|-------|------|-----------|
| Base | Auth, projetos, OD, equipe, roteiro, IA | 0001–0024 |
| Storage | Comprovantes, áudio chat | 0025 |
| Soft-delete, agenda, notif | — | 0030–0036 |
| Multi-função equipe | Tabela projeto_pessoa_funcoes | 0037 |
| Financeiro | fornecedor_id, status paga | 0038 |
| Sprint 3B.5/hotfixes | Select Radix, botão excluir | 0039–0048 |
| Sprint 5 — Segurança | pode(), perm_recursos, RLS cutover, hardening anon | 0050–0057 |
| Sprint 5 — Features | Status arte/locação, notif OD, fix decupagem | 0058–0062 |
| Leva pós-teste (23/06) | Fix RLS canais, notif agenda, rebrand emails, fix OD | 0063–0068 |
| Leva 2 (24/06) | Timeout email, função por projeto (catalog) | 0069–0070 |
| Leva 3 (02/07) | Fix import CSV (valida e-mail), RPC criar_dm, papel default, fix trigger DELETE em projeto_pessoas | 0071–0072 |
| Leva 4 (02/07) | RPC minhas_pendencias (Mural) | 0073 |
| **Contratos v1** (02/07) | Reformulação: colunas partes/parcelas/clausulas (JSONB), tipo, funcao_av_id, pessoa_id, lei_incentivo, novo status (6 valores), tabela `contrato_anexos` + RLS | 0074 |
| **Contratos v3** (02/07) | Dropa UNIQUE(projeto_id) → N contratos/projeto + coluna `origem` ('formulario'\|'upload') | 0075 |

**Atenção:** migration 0049 (agenda_prep) deliberadamente não aplicada — será usada junto do C4.

### Páginas React implementadas: **37+**
(Dashboard, Projects, Team, Finance, CallSheets, Agenda, Communication/Mural,
Roteiro, Decupagem, Locations, Cast, FigurinoArte, Accountability,
Settings, Onboarding, InviteAccept, PublicCallSheet, MapaTransporte,
Privacidade, Som, **Contracts (lista) + ContractForm (detalhe)** e mais)

### Módulo CONTRATOS (Produção → Contratos) — feito 02-03/07/2026
Sub-aba reformulada de "1 contrato/projeto (form único, URL de texto)" para repositório real:
- **Lista** (`Contracts.tsx`) N contratos/projeto: Tipo · Contratada · Valor · Status (badge) · 📎 anexos · Abrir/Visualizar/Excluir.
- **Detalhe** (`ContractForm.tsx`) Blocos A–H: identificação, contratante, contratada (PJ/PF), interveniente-anuente, objeto/prazos, remuneração+parcelas, cláusulas, anexos.
- **Anexos** (`ContratoAnexos.tsx` + `AnexarContratoDialog.tsx`): upload real no bucket `documentos` (signed URL p/ ver, remove p/ excluir). Excluir contrato remove os objetos do storage ANTES do delete (cascade só apaga linhas).
- **Anexar contrato pronto**: upload → edge `analisar-contrato` (Mistral OCR+chat) lê {tipo, contratada, valor} → dialog confirma/edita → vira linha `origem='upload'` (documento externo: validação NÃO exige form completo; enquadramento sempre editável depois).
- **Exportar PDF** (`contratoTemplate.ts` + `valorPorExtenso.ts`): gera o contrato preenchido via **pdfmake 0.2.20** (`pdfMake.vfs = pdfFonts.pdfMake.vfs` + `createPdf(doc).getBlob()`) e salva como anexo `gerado`. Modelo único = "Prestação de Serviços Técnicos" (SIC). **NÃO usar pdfmake 0.3.x** — loader de fontes não fecha o getBlob no Vite (trava/timeout).
- Onboarding perdeu a opção "contrato" (fica só docs pessoais).
- Rotas: `/projetos/:id/producao/contratos` (lista) e `/contratos/:contratoId` (detalhe; `novo` = criar).
- Commits: e5d16b1 (v1), e8b9c2f (v2), 8e76f8c (v3), 59e2cf8 (v4), 4fa7a75 (PDF final).

### Social Login
Oculto atrás de flag `SOCIAL_LOGIN_ENABLED=false` em Login.tsx e Signup.tsx.
**Reativar apenas após configurar providers no Supabase.**

### Edge Functions deployadas
| Função | Observação |
|--------|-----------|
| `send-email` | Retornava 401 — requer flag `--no-verify-jwt` no deploy |
| `notificar-od` | OK |
| `analisar-roteiro` | OCR/decupagem IA (Tesseract) |
| `ocr-extract` | Comprovantes (Mistral OCR → salva markdown) |
| `ocr-text-extract` | OCR genérico front-callable (Mistral) — devolve markdown |
| `analisar-contrato` | **(03/07)** Anexar contrato pronto: Mistral OCR + chat JSON → {tipo, contratada, valor}. Front-callable (verify_jwt). Usa MISTRAL_API_KEY |
| `aceitar-convite` | Login-free |

### Itens pendentes / não testados (Leva 2)
- **Item 4:** Som de alerta para novas notificações (Web Audio API + toggle em Settings)
- **Item 5:** Clicar evento no Mural → abre detalhe na Agenda
- **Item 7:** Isolamento de função por projeto (0070 aplicada; testar em produção)

---

## AS 4 PERSONAS

| Persona | Papel | Veredito dado |
|---------|-------|---------------|
| **Chico** (Produtor Executivo) | Viabilização, contratos, prestação Funcultura | "Resolvam NF e costura; têm meu sim" |
| **Mariana** (1º AD) | Cronograma (DOOD), OD, gerência de tempo | "Decupagem IA excita, precisa fechar ciclo" |
| **Tereza** (DP) | Orçamento, folha, prestação | "10 primeiros itens = não preciso de mais nada" |
| **Caio** (Diretor) | Aprovação criativa, decisões, lookbook | "Preciso conversar, não só operar" |

---

## MODELO DE PERMISSÕES (pode())

A função central `pode(recurso text, acao text, projeto_id uuid)` (migration 0050) é a base do RBAC.
Hierarquia: `perm_overrides` → `perm_funcao_grants` → nega por padrão.

Hook no front: `usePermissions.can(recurso, acao)`.

Papéis no projeto: `owner`, `admin`, `producao`, `departamento`, `leitor`.

Recursos-chave: `od/aprovar`, `od/publicar`, `despesas/editar`, `equipe/gerenciar`, `figurino_arte/aprovar`.

---

## ENTREGÁVEIS PORTO DIGITAL

Localizados em `Glauber/Entregaveis_Porto_Digital/`:
- `Glauber_Artefato1_Prototipo_MVP.docx` — documento técnico do protótipo
- `Glauber_Artefato2_Modelo_Negocio.docx` — Business Model Canvas
- `Glauber_Artefato3_Pitch_Deck.pptx` — deck de pitch
- `Glauber_Artefato4_Roteiro_Pitch.docx` — roteiro de apresentação

Preços discutidos: FREE / R$149 / R$499 / R$699 (a confirmar).

---

## FERRAMENTAS — QUANDO USAR CADA UMA

| Tarefa | Ferramenta | Como |
|--------|-----------|------|
| Análise, specs, documentos, memória | **Cowork (este app)** | Conversa normal |
| SQL (leitura, inspeção) | **Cowork via conector Supabase** | Autonomia livre |
| SQL estrutural/RLS (escrita) | **Cowork — confirmar antes** | Mostro SQL + impacto, aguardo "ok" |
| Fix cirúrgico front (1-3 linhas) | **Cowork via Edit** | Edit direto + Thiago faz commit/vercel |
| Implementação front grande (multi-arquivo) | **Claude Code CLI** | PowerShell → cd cineflow-mvp → claude |
| Deploy | **`vercel --prod`** no PowerShell | Sempre manual — push no GitHub NÃO deploya |

---

## REGRAS CRÍTICAS (nunca esquecer)

1. **PowerShell não aceita `&&`** — usar `;` ou comandos separados
2. **`git add -A` sempre da RAIZ do repo** (`Glauber/`), não de `cineflow-mvp/`
3. **`git commit` sempre com `-m "..."`** — sem -m abre editor e trava
4. **Push ≠ deploy** — sempre rodar `vercel --prod` (não `vercel` que é preview)
5. **`npx tsc --noEmit` antes de cada deploy** — pega arquivos truncados
6. **Radix `<SelectItem>` NUNCA com `value=""`** — trava a tela; usar sentinela `"__none__"` e converter para null ao salvar
7. **Ctrl+Shift+R** para testar em produção — limpa cache do browser
8. **`pessoas` NÃO tem `user_id`** — vínculo auth via `lower(email)` match
9. **`org_id` do usuário** → via `memberships`, não via `pessoas`
10. **Funções SECURITY DEFINER novas** → sempre `revoke execute from public, anon; grant to authenticated`
11. **Arquivos .tsx grandes no Cowork podem truncar** — para edição grande usar Claude Code
12. **Migration aplicada via MCP → criar o arquivo .sql no repo na mesma hora** — produção e `supabase/migrations/` devem sempre ter paridade (aprendido na Leva 3: 0071/0072 foram aplicadas sem arquivo)
13. **`git status` antes de `git add -A`** — conferir a lista; add -A da raiz varre docs, PDFs de relato e tudo mais (Leva 3 commitou 21 arquivos, incluindo relatos com nomes reais; repo privado, sem dano, mas conferir sempre)
14. **Warnings "LF will be replaced by CRLF" são inofensivos** — só conversão de fim de linha do Windows; ignorar
15. **Triggers BEFORE DELETE devem retornar OLD** — retornar NEW em DELETE anula a operação silenciosamente (causa do lixo órfão até 0072)
16. **pdfmake FIXO em 0.2.20** — a 0.3.x (beta) não fecha o `getBlob` no Vite mesmo com vfs/fonts/addVirtualFileSystem (trava → timeout). Padrão que funciona: `pdfMake.vfs = pdfFonts.pdfMake.vfs` + `createPdf(doc).getBlob()`. Não atualizar.
17. **OneDrive sincroniza a pasta do repo** (`Documents\...`) — causa churn de CRLF, `index.lock` travado e leituras inconsistentes/`binary file matches` no sandbox do Cowork. Fonte de verdade = `npx tsc --noEmit` + `git status` no PowerShell. Se travar lock: `Remove-Item ".git\index.lock" -Force`.
18. **Ao excluir contrato**: remover objetos do bucket `documentos` (`storage.remove(paths)`) ANTES do `delete` — o `on delete cascade` só apaga as linhas de `contrato_anexos`, não os arquivos.

---

## ONDE ESTÁ O QUÊ

| Necessidade | Arquivo/local |
|-------------|--------------|
| Estado vivo das sprints | `SPRINT_STATE.md` (raiz) — desatualizado em partes; migrations chegaram até 0070 |
| Spec de permissões composite | `SPRINT_5_SPEC_PERMISSOES_OD.md` |
| Spec da fusão Agenda (C4) | `C4_BRIEF_AGENDA.md` |
| Spec decupagem | `SPRINT_6_SPEC_DECUPAGEM.md` |
| Matriz de permissões | `Cópia de Glauber_Matriz_Permissoes_Atualizado.xlsx` |
| Organograma audiovisual | `ORGANOGRAMA_PRODUCAO_AUDIOVISUAL_BRASIL.docx` |
| Entregáveis Porto Digital | `Entregaveis_Porto_Digital/` |
| Docs de arquitetura | `docs/` (novo — ver README) |
| Referências de domínio (funções AV, editais) | `database/` (novo) |
| Prompts de IA | `prompts/` (novo) |

---

## COMO RETOMAR UMA TASK

1. Ler este arquivo (`CLAUDE.md`)
2. Se task de código: ler `cineflow-mvp/CLAUDE.md` também
3. Pedir ao Thiago o relato no formato: **tela + função + esperado vs. ocorrido + vermelho do Console (F12)**
4. Antes de qualquer SQL estrutural: checar migrations existentes (`ls cineflow-mvp/supabase/migrations/`)
5. Ao fechar: atualizar este arquivo e o `SPRINT_STATE.md` com o que mudou
