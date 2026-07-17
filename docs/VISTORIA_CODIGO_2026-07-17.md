# VISTORIA COMPLETA DO CÓDIGO — 17/07/2026

Auditoria read-only (nada foi alterado no app nem no banco). Base: repo local + banco de produção via conector Supabase (advisors, pg_catalog).

---

## 1. RESUMO EXECUTIVO

O sistema está **saudável para o momento beta**: RLS habilitada em 100% das tabelas públicas, zero segredos hardcoded no repo (`.env` fora do git), zero `console.log`/`TODO` no src, edge functions ativas e coerentes. Os riscos encontrados são pontuais e administráveis — nenhum exige ação emergencial, mas **dois pedem sua decisão** (seção 2).

Dimensão do código: **38 páginas React** (~15.500 linhas em pages + ~5.400 em components/lib), **76 arquivos de migration**, **7 edge functions**, **55 funções SECURITY DEFINER** no banco.

---

## 2. ACHADOS QUE PEDEM SUA DECISÃO (trazidos conforme a regra)

### 2.1 🔴 SOCIAL LOGIN ESTÁ LIGADO EM PRODUÇÃO
`SOCIAL_LOGIN_ENABLED = true` em `Login.tsx` e `Signup.tsx` — **commitado no HEAD** (voltou a `true` no commit da Leva 3, ce6763d, 02/07) e portanto **no ar desde então**. O protocolo dizia: manter `false` até configurar os providers OAuth no Supabase (config que estava adiada). Se os providers NÃO foram configurados, os botões Google/social aparecem para as equipes e **falham ao clicar**.
**Decisão:** (a) se você não configurou OAuth → voltamos a flag para `false` (fix verde: 2 linhas + `vercel --prod`); (b) se configurou → só atualizo a documentação.

### 2.2 🟠 Qualquer usuário logado pode disparar e-mail arbitrário
Advisor confirma: `public._send_email(p_to, p_subject, p_html)` é SECURITY DEFINER **executável pelo papel `authenticated`** via REST. Ou seja, qualquer membro logado de qualquer equipe pode, tecnicamente, enviar e-mail com conteúdo arbitrário partindo do remetente do Glauber (vetor de phishing). É resto da vulnerabilidade mapeada em 16/06 (o revoke não cobriu esta função ou ela foi recriada depois).
**Fix proposto (1 comando, sem impacto nas equipes):** `revoke execute on function public._send_email(text,text,text) from authenticated, anon;` — as funções internas (notificar_od etc.) continuam funcionando porque rodam como owner. **Aguardo seu ok.**

### 2.3 🟡 Policy furada em `agenda_participantes`
Policy `agenda_participantes_update` (UPDATE) com `USING (true)`: qualquer usuário autenticado pode editar participação de qualquer evento de qualquer projeto. Baixo impacto prático (dado pouco sensível), mas fura o isolamento entre produções. Fix = 1 policy; mexer em RLS é vermelho → fica para janela combinada, com seu ok.

### 2.4 🟡 Documentação desatualizada em ponto crítico
CLAUDE.md afirma "migration 0049 (agenda_prep) deliberadamente não aplicada". **Falso hoje**: `agenda_eventos.departamento` existe em produção e o registro de migrations mostra `agenda_c4_prep` + `c4_calendario_unificado` aplicadas em 19/06. Corrigido no novo CLAUDE.md.

---

## 3. REFERÊNCIAS "CINEFLOW" NO CÓDIGO — CLASSIFICADAS POR RISCO

| Referência | Onde | Risco de renomear | Veredito |
|---|---|---|---|
| `x-cineflow-secret` (header) | `notificar-od`, `ocr-extract`, `ocr-text-extract` + funções do banco que o enviam | **ALTO** — exige redeploy coordenado de edge functions + funções SQL; se descasar, quebra notificação de OD e OCR | **NÃO mexer** com equipes ativas |
| `cineflow_recovery` (sessionStorage) | `AuthContext.tsx` | BAIXO — chave interna de recuperação de senha | Renomear na janela do rebrand técnico |
| `"name": "cineflow-mvp"` | `package.json` | NULO — metadado npm | Renomear junto com a pasta |
| Comentários `// CINEFLOW —` | parsers, edge functions | NULO | Renomear quando tocar nos arquivos |
| Pasta `cineflow-mvp/` | raiz do repo | NULO p/ produção (deploy roda na Vercel) | Adiado p/ janela calma (decisão de 17/07) |

Conclusão: **o rebrand técnico completo é seguro, mas não agora** — o único item funcional de verdade é o header do secret, e ele só deve ser tocado em janela sem produção ativa.

---

## 4. PARIDADE MIGRATIONS: REPO × PRODUÇÃO

- Repo: 76 arquivos (0001–0075). Produção registra formalmente apenas 25 (a partir de 16/06) — as anteriores foram coladas no SQL Editor sem registro. **Não é problema** (padrão do projeto), mas o repo é a única fonte completa: reforça a regra "migration aplicada → arquivo no repo na hora".
- **Numeração duplicada no repo:** `0003_od_independente.sql` + `0003_trilha_a.sql`; e em produção há duas "0069" (`send_email_timeout` e `equipe_funcao_catalogo`, esta = 0070 do repo). Cosmético; recomendo congelar (não renumerar nada, só seguir de 0076 em diante).
- 0074/0075 (Contratos) aplicadas e com arquivo no repo ✅.

## 5. EDGE FUNCTIONS (produção)

| Função | verify_jwt | Status |
|---|---|---|
| send-email (v20) | false ✅ (correto, usa secret interno) | ACTIVE |
| ocr-extract (v9) | false (protegida por `x-cineflow-secret`) | ACTIVE |
| ocr-text-extract (v8) | true ✅ | ACTIVE |
| aceitar-convite (v5) | false ✅ (login-free por design) | ACTIVE |
| analisar-roteiro (v3) | true ✅ | ACTIVE |
| notificar-od (v3) | false (usa secret) | ACTIVE |
| analisar-contrato (v1) | true ✅ | ACTIVE |

## 6. ADVISORS DE SEGURANÇA (além dos itens da seção 2)

- **ERROR** `security_definer_view` em `ordens_do_dia_publico` — provável intencional (OD pública via link); confirmar que a view expõe só o necessário.
- 11 funções com `search_path` mutável (WARN) — hardening barato, lote único de `alter function ... set search_path`.
- Policies `WITH CHECK (true)` para INSERT em `audit_log`, `notificacoes_inapp`, `orgs` — as duas primeiras são por design (sistema insere); `orgs insert true` merece revisão no hardening.
- Bucket público `mensagens-audio` permite listagem de todos os arquivos (WARN) — considerar remover a policy de SELECT amplo.
- `aceitar_convite`/`validar_convite` executáveis por `anon` — **intencional** (fluxo de convite sem login).
- Proteção contra senha vazada (HaveIBeenPwned) **desligada** no Auth — ligar é 1 clique no dashboard, zero risco.

## 7. ADVISORS DE PERFORMANCE (não urgente, banco pequeno)

~30 FKs sem índice (agenda, contratos, convites, despesas...), ~14 policies com `auth.uid()` sem initplan (recalcula por linha), ~45 casos de múltiplas policies permissivas na mesma tabela/ação (pessoas, projeto_kpis, contrato_anexos, roteiro_planos_sugeridos...), ~20 índices nunca usados, 1 índice duplicado em `contratos`. **Nada disso dói com o volume atual**; vira um "lote de performance" único pré-escala (migration aditiva, verde-amarela).

## 8. HIGIENE DO FRONT

- Zero `TODO/FIXME`, zero `console.log`, zero segredos no bundle (só `VITE_SUPABASE_URL`/`ANON_KEY`, corretos).
- `Contract.tsx` (201 linhas) — página legada do modelo antigo de contrato; ainda importada em `App.tsx` mas nenhuma rota a usa (rotas redirecionam p/ `contratos`). **Código morto**: remover import + arquivo na próxima leva.
- Arquivos gigantes: `FigurinoArte.tsx` (1.384), `CallSheetEditor.tsx` (1.272), `Agenda.tsx` (1.224) — acima do limite seguro de edição no Cowork (regra 11); qualquer mudança neles vai para Claude Code.
- `npx tsc --noEmit`: rodado no sandbox (lento por OneDrive); **validar no PowerShell antes do próximo deploy**, como sempre.

## 9. PENDÊNCIAS HERDADAS (confirmadas ainda abertas)

1. Leva 2 — item 4 (som de notificação), item 5 (evento do Mural → detalhe na Agenda), item 7 (testar isolamento de função por projeto, 0070).
2. Hardening restante da Sprint 5 (itens 2.2, 2.3, 6 acima consolidam o que falta).
3. OAuth providers (decisão 2.1).
4. Verificar plano de backup/PITR do Supabase **antes** da leva beta (não verificável via conector; checar em Dashboard → Database → Backups).
