# GLAUBER — Manual de Operações do Agente

> **Leia este arquivo ao retomar qualquer sessão.** Fonte de verdade consolidada do projeto.
> Última atualização: **17/07/2026** (reorganização geral + vistoria completa).
> Complementos: `docs/VISTORIA_CODIGO_2026-07-17.md` · `docs/GUIA_USO_IA.md` · `docs/ROADMAP_BETA_2026.md` · `docs/TEMPLATE_FEEDBACK_EQUIPES.md`

---

## 1. O QUE É O GLAUBER

Plataforma SaaS B2B para gestão de produções audiovisuais brasileiras. Fecha o ciclo completo:
**roteiro → cronograma → Ordem do Dia (OD) → execução → prestação de contas.**
Em português, com compreensão nativa de editais (Funcultura/SIC) e IA de decupagem.
Nome homenageia Glauber Rocha. Tagline: *"Onde a criação encontra a produção."*

**Momento atual (jul/2026):** protótipo em produção real com **duas equipes de filmagem testando**. Próxima leva de alterações = entregar **beta funcional pronto para vendas**. Trilha de pré-incubação Porto Digital (Recife) em andamento; captação mapeada (ver memória).

**Fundador:** Thiago França — thitho0@gmail.com

## 2. REGRA ZERO — PRODUÇÃO INTOCÁVEL

Duas equipes usam o app AGORA. Portanto:

1. **Nada** que ponha em risco o banco ou a operação do app.
2. Situação de risco identificada → **reportar ao Thiago imediatamente**, antes de qualquer ação.
3. Dúvida ou inconsistência → perguntar como agir.
4. Ação crítica (SQL estrutural, RLS, deploy, storage, segredos) → **sempre pedir confirmação com explicação de impacto**.

**Semáforo de mudanças com app em uso:**
| Nível | O quê | Regime |
|---|---|---|
| 🟢 Verde | Front via `vercel --prod` (rollback instantâneo), docs, leitura de dados | Livre, com aviso |
| 🟡 Amarelo | Migrations **aditivas** (nova coluna/tabela/RPC/índice), edge functions | Confirmar antes; evitar dias de set |
| 🔴 Vermelho | DROP/ALTER destrutivo, mudanças em RLS/policies existentes, renomear buckets/headers de secret (`x-cineflow-secret`), rotação de segredos | Só em janela combinada, com backup verificado |

## 3. LINKS E ACESSOS

| Serviço | URL / Referência |
|---------|-----------------|
| App produção | https://glauber.app.br |
| Vercel dashboard | https://vercel.com/cineflow-s-projects/glauber-mvp |
| GitHub | https://github.com/thitho0-tech/Glauber |
| Supabase projeto | dsrulpipsksvtskqwevc ("glauber-prod", sa-east-1, Postgres 17) |
| SQL Editor | https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/sql |
| Edge Functions | https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/functions |

**Pastas locais (Windows):** raiz do git = `C:\Users\Thiago França\Documents\Claude\Projects\Glauber` · código = `Glauber\cineflow-mvp\` (rename p/ `glauber-mvp` adiado para janela calma — ver `docs/RENAME_PASTA_PASSO_A_PASSO.md`).

## 4. ESTRUTURA DA PASTA (reorganizada em 17/07/2026)

| Local | Conteúdo | Natureza |
|---|---|---|
| raiz | CLAUDE.md, specs vivas (SPRINT_5, SPRINT_6, SPRINT_CONTRATOS, C4), matriz de permissões atualizada, organograma base | **Operacional** |
| `cineflow-mvp/` | Código do app (React+Vite+TS, Supabase) | **Operacional** |
| `docs/` | Arquitetura, visão, regras de edital, vistoria, guia de IA, roadmap vivo | **Operacional** |
| `database/` | Referências de domínio (funcoes_av.json, rubricas_edital.json) | **Operacional** |
| `prompts/` | Prompts de IA (decupagem, classificação de despesa) | **Operacional** |
| `Entregaveis_Porto_Digital/` | Artefatos 1–4 + docs de captação (vivos) | Operacional/negócio |
| `apoio/` | Referência de negócio NÃO operacional (livros, análises, planilhas de orientação) | Apoio |
| `_arquivo/` | Histórico (sprints executadas, era Cineflow, versões superseded) | Morto |

`SPRINT_STATE.md` foi **aposentado** — o estado vivo é a seção 5 deste arquivo + memória do Cowork.

## 5. ESTADO ATUAL (17/07/2026)

- **Migrations em produção: 0001–0075** (incl. Contratos v1/v3). Arquivo sempre no repo (regra 12). Numeração: duplicatas históricas 0003 e 0069/0070 — **não renumerar**; próxima = 0076.
- **Correção histórica:** a antiga nota "0049 não aplicada" está SUPERADA — `agenda_c4_prep` e `c4_calendario_unificado` estão aplicadas em produção desde 19/06 (`agenda_eventos.departamento` existe).
- **Últimas levas deployadas:** Leva 7 (03/07 — função "Outros", tipo de evento "Outros", DM mostra outro participante). Módulo **Contratos** completo (lista N/projeto, anexos no bucket `documentos`, análise IA de contrato pronto via `analisar-contrato`, export PDF com pdfmake 0.2.20).
- **38 páginas React**; arquivos >1.000 linhas (FigurinoArte, CallSheetEditor, Agenda, Roteiro) só se editam via Claude Code.
- **7 edge functions ativas** (send-email v20, ocr-extract, ocr-text-extract, aceitar-convite, analisar-roteiro, notificar-od, analisar-contrato).
- **⚠️ PENDENTE DE DECISÃO (vistoria 17/07):** ver `docs/VISTORIA_CODIGO_2026-07-17.md` §2 — (1) ~~social login~~ RESOLVIDO: OAuth configurado, flag `true` é correta (confirmado pelo Thiago em 17/07); (2) `_send_email` executável por qualquer autenticado (revoke proposto); (3) policy furada em `agenda_participantes`; (4) verificação de backup/PITR antes da leva beta.
- **Pendências herdadas:** Leva 2 itens 4 (som de notificação), 5 (Mural→Agenda) e 7 (testar isolamento função/projeto); hardening restante (search_path, `orgs insert`, bucket `mensagens-audio`); lote de performance pré-escala (FKs sem índice, policies duplicadas).
- **Próximo grande evento:** feedbacks das duas equipes → leva beta (usar `docs/TEMPLATE_FEEDBACK_EQUIPES.md`).

## 6. AS 4 PERSONAS

| Persona | Papel | Veredito |
|---------|-------|----------|
| **Chico** (Produtor Executivo) | Viabilização, contratos, prestação Funcultura | "Resolvam NF e costura; têm meu sim" |
| **Mariana** (1º AD) | Cronograma (DOOD), OD, gerência de tempo | "Decupagem IA excita, precisa fechar ciclo" |
| **Tereza** (DP) | Orçamento, folha, prestação | "10 primeiros itens = não preciso de mais nada" |
| **Caio** (Diretor) | Aprovação criativa, decisões, lookbook | "Preciso conversar, não só operar" |

## 7. MODELO DE PERMISSÕES

Função central `pode(recurso, acao, projeto_id)` (migration 0050) — RBAC deny-por-padrão com hierarquia `perm_overrides` → `perm_funcao_grants`. Hook no front: `usePermissions.can()`. Papéis: `owner`, `admin`, `producao`, `departamento`, `leitor`. Matriz viva: `Cópia de Glauber_Matriz_Permissoes_Atualizado.xlsx` (raiz).

## 8. FERRAMENTAS — QUANDO USAR CADA UMA

| Tarefa | Ferramenta | Como |
|--------|-----------|------|
| Análise, specs, docs, triagem de feedback, memória | **Cowork** | Conversa normal |
| SQL leitura/inspeção | Cowork via conector Supabase | Autonomia livre |
| SQL estrutural/RLS (escrita) | Cowork — **confirmar antes** | Mostro SQL + impacto, aguardo "ok" |
| Fix cirúrgico front (1–3 linhas, arquivo <800 linhas) | Cowork via Edit | Thiago commita/deploya |
| Implementação grande ou arquivo >800 linhas | **Claude Code CLI** | PowerShell → `cd cineflow-mvp` → `claude` (com handoff .md preparado no Cowork) |
| Deploy | `vercel --prod` no PowerShell | Sempre manual — push NÃO deploya |

Detalhes de economia de tokens e fluxos padrão: **`docs/GUIA_USO_IA.md`**.

## 9. RELAÇÃO COM O THIAGO

- Perfil: fundador não-programador em curva de aprendizagem alta. **Ensinar enquanto executa**: passos específicos (programa, caminho, comando), explicando o porquê uma vez, sem repetir o óbvio já aprendido.
- Memorizar preferências de programas e caminhos (memória do Cowork, tipo `user`/`feedback`).
- Ao fechar leva: entregar **mensagem de commit pronta + passo a passo PowerShell** (stage seletivo, nunca `git add -A` em levas de código; para reorganizações de docs, listar explicitamente).
- Respostas concisas e diretas; português; sem jargão sem explicação na primeira vez.
- Feedback de teste chega no formato do `docs/TEMPLATE_FEEDBACK_EQUIPES.md` (tela + função + esperado vs. ocorrido + Console F12 + print numerado).

## 10. MEMÓRIA E APRENDIZADO CONTÍNUO

- **Ao iniciar task:** ler este arquivo → buscar na memória do Cowork o estado (`MEMORY.md` indexa por leva/tema) → se task de código, ler `cineflow-mvp/CLAUDE.md`.
- **Ao fechar task:** atualizar a seção 5 deste arquivo + gravar memória da leva (padrão `project_glauber_levaN_<data>`) + registrar aprendizados novos como regra numerada na seção 11.
- Memórias supersedidas devem ser consolidadas periodicamente (última consolidação: 17/07/2026).
- Este manual **evolui com o projeto**: toda leva que mudar processo, ferramenta ou regra DEVE atualizar este arquivo na mesma sessão.

## 11. REGRAS CRÍTICAS (aprendizados acumulados — nunca esquecer)

1. **PowerShell não aceita `&&`** — usar `;` ou comandos separados.
2. **`git add` sempre da RAIZ do repo** (`Glauber/`), com stage seletivo (regra 13).
3. **`git commit` sempre com `-m "..."`** — sem -m abre editor e trava.
4. **Push ≠ deploy** — sempre `vercel --prod` (sem `--prod` é preview).
5. **`npx tsc --noEmit` no PowerShell antes de cada deploy** — pega arquivos truncados.
6. **Radix `<SelectItem>` NUNCA com `value=""`** — trava a tela; usar sentinela `"__none__"`/`"__outros__"` e converter ao salvar.
7. **Ctrl+Shift+R** para testar em produção — limpa cache.
8. **`pessoas` NÃO tem `user_id`** — vínculo auth via `lower(email)`.
9. **`org_id` do usuário** → via `memberships`, não via `pessoas`.
10. **Funções SECURITY DEFINER novas** → sempre `revoke execute from public, anon; grant to authenticated` (e avaliar se nem authenticated deve ter — caso `_send_email`).
11. **Arquivos .tsx grandes (>800 linhas) truncam no Edit do Cowork** — usar Claude Code, ou reconstruir via Python/`git show HEAD` (aprendido nas Levas 4, 6 e 7).
12. **Migration aplicada via MCP → criar o .sql no repo na mesma hora** — paridade produção × `supabase/migrations/`.
13. **`git status` antes de add** — conferir a lista do stage; nunca varrer docs/relatos por engano.
14. **Warnings "LF will be replaced by CRLF" são inofensivos.**
15. **Triggers BEFORE DELETE devem retornar OLD** — retornar NEW anula o delete silenciosamente.
16. **pdfmake FIXO em 0.2.20** — 0.3.x trava o `getBlob` no Vite. Padrão: `pdfMake.vfs = pdfFonts.pdfMake.vfs` + `createPdf(doc).getBlob()`.
17. **OneDrive sincroniza o repo** — churn de CRLF, `index.lock` travado, leituras inconsistentes no sandbox. Fonte de verdade = tsc + git status no PowerShell. Lock travado: `Remove-Item ".git\index.lock" -Force`.
18. **Ao excluir contrato:** `storage.remove(paths)` do bucket `documentos` ANTES do delete — cascade só apaga linhas.
19. **`x-cineflow-secret` é funcional** — renomear exige redeploy coordenado edge+SQL; só em janela vermelha.
20. **Validação de front no sandbox:** usar `ts.transpileModule` isolado quando tsc global falhar por OneDrive (aprendido na Leva 7).

## 12. ONDE ESTÁ O QUÊ

| Necessidade | Local |
|-------------|-------|
| Estado vivo do projeto | Seção 5 deste arquivo + memória Cowork |
| Vistoria técnica completa | `docs/VISTORIA_CODIGO_2026-07-17.md` |
| Guia de uso de IA / economia de tokens | `docs/GUIA_USO_IA.md` |
| Roadmap vivo | `docs/ROADMAP_BETA_2026.md` |
| Template de feedback das equipes | `docs/TEMPLATE_FEEDBACK_EQUIPES.md` |
| Rename da pasta de código | `docs/RENAME_PASTA_PASSO_A_PASSO.md` |
| Specs vivas | raiz: SPRINT_5 (permissões/OD), SPRINT_6 (decupagem), SPRINT_CONTRATOS, C4 (agenda) |
| Matriz de permissões | `Cópia de Glauber_Matriz_Permissoes_Atualizado.xlsx` |
| Organograma AV | `ORGANOGRAMA_PRODUCAO_AUDIOVISUAL_BRASIL.docx` (base) · completo em `apoio/` |
| Entregáveis e captação | `Entregaveis_Porto_Digital/` |
| Histórico | `_arquivo/` (ver README interno) |

## 13. COMO RETOMAR UMA TASK

1. Ler este arquivo (em especial seções 2, 5 e 11).
2. Buscar memória do Cowork pelo tema da task.
3. Task de código → ler `cineflow-mvp/CLAUDE.md`.
4. Pedir ao Thiago o relato no formato do template de feedback.
5. SQL estrutural → checar `cineflow-mvp/supabase/migrations/` antes; próxima migration = 0076.
6. Ao fechar → atualizar seção 5, gravar memória, entregar commit+deploy passo a passo.
