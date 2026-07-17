# Sprint 3A — Spec de Execução

**Data:** 05/06/2026 · **Base:** SPRINT_STATE.md (pós 2C) + Matriz de Permissões + Destaques planilha (19 observações)
**Deadline da trilha:** ~05/07/2026 (≈30 dias) · **App:** glauber.app.br

---

## 1. Diagnóstico do momento atual

O protótipo está maduro em superfície (28 páginas, 36 migrations, Command Center com dados reais), mas as 19 observações de uso e a matriz de permissões revelam **um único ponto de falha estrutural que gera a maioria dos bugs e pedidos**: o modelo de "função no projeto".

Hoje `projeto_pessoas` guarda **uma** `funcao_av_id` por pessoa por projeto, e o owner entra fixo como "produtor geral". Disso decorrem diretamente:

| Observação | Sintoma relatado | Causa-raiz |
|---|---|---|
| 01, 03, 05 | Criador não escolhe função; não dá pra ter mais de uma função no projeto | Modelo 1-função por pessoa |
| 04, 15 | "Você não tem função no projeto" em Notificações por projeto | Query de função frágil / vínculo ausente |
| 13 | Departamento deveria vir antes de Função, e Função filtrada pelo Depto | Formulário não usa hierarquia `funcoes_av` |
| 14 | "Criar equipe" não adiciona pessoa cadastrada | Bug no insert de `projeto_pessoas` |
| Matriz/Command Center | Diretor, Continuísta, Elenco e Pós sem view própria | RBAC só tem 5 papéis genéricos |

Ou seja: resolver o modelo de função **destrava simultaneamente** 5 observações de produto + 3 bugs + os 4 gaps de Command Center da matriz. É o maior retorno por esforço agora.

O segundo bloco de maior valor é **Financeiro** (08, 09, 10, 11) — mas o bug 09 (`fornecedor_id` não encontrado) é um erro de schema cache pontual e os outros são incrementos independentes do modelo de função. Vão para a 3B.

O terceiro bloco é **Documentos & Logística** (16, 17 PDF; 18, 19 Mapa de Transporte) — a matriz já reserva a coluna LOGÍSTICA para isso. Vai para a 3C.

### Decisão de arquitetura recomendada (multi-função)

Não transformar `projeto_pessoas` em várias linhas por pessoa — isso quebraria `escalas`/`check_ins` que referenciam `pessoa_id`/`projeto_pessoa_id` como se houvesse 1 linha. Em vez disso, **tabela de junção**:

```
projeto_pessoa_funcoes (id, projeto_pessoa_id FK, funcao_av_id FK, principal boolean)
```

Mantém 1 `projeto_pessoa` por pessoa/projeto (zero quebra de FK), permite N funções, e `principal=true` marca a função usada no Command Center. Migração de dados: para cada `projeto_pessoas` existente com `funcao_av_id`, criar 1 linha em `projeto_pessoa_funcoes` com `principal=true`.

---

## 2. Sprint 3A — escopo recomendado

**Tema:** Fundação de Funções & Permissões (+ bugs bloqueantes do mesmo eixo)
**Meta:** que qualquer pessoa crie projeto, se atribua 1+ funções por departamento, e que o Command Center mostre a view certa por função — sem os erros 04/14/15.

| # | Item | Observações cobertas | Onde executar |
|---|---|---|---|
| 3A.1 | Migration `projeto_pessoa_funcoes` + migração de dados + RLS | 01, 03, 05 | **Cowork** (gera SQL) → você cola no SQL Editor |
| 3A.2 | Formulário "Adicionar pessoa": Departamento → Função (condicionado), multi-seleção | 13, 01, 05 | **Claude Code** |
| 3A.3 | Bug "criar equipe não adiciona pessoa" | 14 | **Claude Code** |
| 3A.4 | Criador escolhe própria função ao criar projeto (não fixar "produtor geral") | 01, 05 | **Claude Code** |
| 3A.5 | Bug Notificações por projeto ("sem função no projeto") | 04, 15 | **Claude Code** |
| 3A.6 | RBAC por função → mapear funções da matriz para 5 papéis + views de Command Center (Diretor, Continuísta, Elenco, Pós) | Matriz / gaps | **Cowork** (define mapa) → **Claude Code** (implementa views) |

Itens 06 (o que é "editar dados do projeto") e 07 (entender OD pública) são **dúvidas, não tarefas** — respondidas na seção 5, sem código.

### Por que essa fatia e não "tudo de uma vez"

Em ~30 dias com a trilha rodando, uma sprint coesa em torno de um eixo entrega valor demonstrável e estável. Misturar PDF, Mapa de Transporte e Financeiro na mesma sprint multiplica superfície de bug e gasto de token sem fechar nenhum tema. 3A fecha "permissões"; 3B fecha "financeiro"; 3C fecha "documentos/logística".

---

## 3. Onde usar Claude Code vs Cowork (economia de token)

Seu modelo já estabelecido (memória do projeto): **specs e SQL no Cowork; código grande no Claude Code**. Para a 3A:

**Use Claude Code (terminal)** — é mais rápido e barato porque ele edita arquivos `.tsx` direto no disco, roda o build local e itera sem reenviar contexto:
- 3A.2 formulário Equipe (mexe em `Team.tsx` + componente de form — JSX grande)
- 3A.3, 3A.4, 3A.5 correções de fluxo (vários arquivos pequenos, idas e voltas)
- 3A.6 implementação das novas views de Command Center (`DirectorView` já existe vazia; criar `ContinuityView`, `CastView`, `PostView`)

**Use Cowork (aqui)** — quando o produto é texto/SQL que você revisa antes de aplicar:
- 3A.1 gerar o SQL da migration + script de migração de dados (você cola no SQL Editor — regra: nunca `supabase db push`)
- 3A.6 (parte 1) o **mapa função→papel→view** a partir da matriz (decisão de produto, não código)

### Prompt pronto para abrir a Sprint 3A no Claude Code

No PowerShell: `cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp"` → `claude` → cole:

```
Sprint 3A — Fundação de Funções & Permissões. Leia ../SPRINT_STATE.md e
../SPRINT_3A_SPEC.md. A migration projeto_pessoa_funcoes já foi aplicada no
Supabase (1 projeto_pessoa por pessoa, N funções via tabela de junção,
principal=true marca a função do Command Center).

Implemente, nesta ordem, com build limpo a cada passo:
1. Team.tsx: form "Adicionar pessoa" com Departamento ANTES de Função; Função
   filtrada por departamento (fonte: funcoes_av.departamento); permitir marcar
   múltiplas funções e uma principal. Corrigir o bug de a pessoa cadastrada não
   ser adicionada à lista (3A.3/14).
2. Criação de projeto: deixar o owner escolher a própria função inicial em vez
   de fixar "produtor geral" (3A.4).
3. Notificações por projeto: corrigir "você não tem função no projeto" — a
   verificação deve olhar projeto_pessoa_funcoes, não funcao_av_id direto (04/15).
4. Command Center: criar ContinuityView, CastView, PostView e fazer
   DirectorView aparecer; o mapeamento função→view está na seção 2/3A.6 da spec.

Regras do projeto: PowerShell sem &&; editar .tsx grande via python3 se Edit
truncar; vínculo auth por email match (pessoas não tem user_id). Ao final me
diga o que rodar de SQL manual e me lembre do deploy.
```

---

## 4. Migration 3A.1 — gerar no Cowork antes de tudo

Sequência: peça aqui no Cowork o SQL de `0037_projeto_pessoa_funcoes.sql`; eu gero (a) `CREATE TABLE`, (b) `INSERT` de migração dos vínculos atuais, (c) RLS espelhando a de `projeto_pessoas`. Você cola no **SQL Editor** do Supabase (não usar CLI push). Só depois rodar o prompt do Claude Code acima — o código já encontra a tabela pronta.

---

## 5. Respostas às dúvidas (06 e 07) — sem código

**06 — "Editar dados do projeto":** são os campos de `projetos` — nome, tipo, `periodo_inicio`/`periodo_fim`, `orcamento_total`, `edital_id`, status. Recomendo que isso viva na futura aba "Gestão do Projeto" (observação 12, Sprint 3B), separada da configuração do usuário.

**07 — OD pública:** a Ordem do Dia tem `token_publico`; o link público (`/od/<token>`) abre a OD sem login para quem tiver o link — útil para enviar a call sheet a elenco/figuração externos. Quem publica controla; qualquer pessoa com o link vê a versão publicada (read-only). É o módulo "Link público OD" da matriz.

---

## 6. Roadmap das próximas (resumo)

**Sprint 3B — Financeiro robusto:** 09 (fix `fornecedor_id` schema cache), 08 (upload PNG/PDF/JPEG de comprovante), 10 (autofill CNPJ ao escolher fornecedor), 11 (status editável da despesa: Pendente→Aprovada/Rejeitada/Paga), 12 (separar Configurações: usuário vs projeto), + gaps SPRINT_STATE: prestação em PDF e paginação Finance.

**Sprint 3C — Documentos & Logística:** 16 (PDF da decupagem no Roteiro), 17 (PDF da OD), 18 (novo módulo Mapa de Transporte: equipe×locação×deslocamento, horários, ordem chegada/saída), 19 (PDF do Mapa de Transporte). A coluna LOGÍSTICA da matriz já está reservada.

---

## 7. Pendências manuais herdadas (fazer junto da 3A)

- Adicionar `VITE_EDGE_SHARED_SECRET` no `.env` local (email ao publicar OD em produção).
- Após qualquer edição em `cineflow-mvp/`: **`vercel --prod`** no PowerShell.
