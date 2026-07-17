# CINEFLOW — Roadmap V2

> Documento de planejamento gerado em **22/05/2026** consolidando:
> - Relatório do **Chico** sobre o MVP (5 problemas)
> - Decisões de produto do **Thiago** desta conversa (10 novos requisitos)
> - Regras do edital **SIC Recife 2024 — FIC/MIC**
>
> Este doc é o ponto de partida para a próxima rodada de evolução. Nenhuma linha de código foi alterada ainda — **antes de executar, vamos validar este plano juntos.**

---

## 1. Diagnóstico — o que mudou desde o MVP

O MVP entregue (https://cineflow-mvp.vercel.app) cobre o fluxo básico de **uma produtora com vários projetos free**. A V2 precisa atender três frentes ao mesmo tempo:

| Frente | O que muda | Por quê |
|---|---|---|
| **Produto** | Equipe, OD, cronograma, módulos novos (elenco/figurino/decupagem) | Chico apontou que a granularidade do MVP não cobre produção profissional |
| **Negócio** | Projeto = unidade de cobrança; cada novo projeto = novo contrato/pagamento | Thiago definiu o modelo SaaS por projeto, não por produtora |
| **Compliance** | Novo edital SIC Recife + RBAC granular por função + comunicação por setor | Suporte ao novo edital e ao organograma profissional brasileiro de AV |

---

## 2. Os 15 requisitos consolidados

### Lote A — feedback do Chico (5 itens)

| # | Item | Natureza | Estimativa |
|---|---|---|---|
| C1 | Campo "nome" no cadastro de equipe não aparece no formulário | Bug | 30 min |
| C2 | Ordem do Dia deve ser entidade autônoma (não filha de "dia de filmagem") | Refator arquitetura | 2–3 h |
| C3 | Cronograma deve cobrir fases (desenvolvimento, pré, filmagem, pós, entrega) | Refator arquitetura | 2–3 h |
| C4 | Equipe deve ser vinculável ao cronograma (escala por dia) | Refator arquitetura | 1–2 h |
| C5 | Módulos novos: Elenco (separado), Figurino, Análise técnica/Decupagem | Sprints separados | 1 semana cada |

### Lote B — decisões do Thiago (10 itens)

| # | Item | Natureza | Estimativa |
|---|---|---|---|
| T1 | 1 cliente = 1 projeto contratado por vez; cada novo projeto = novo pagamento | Modelo de negócio | 3–5 dias |
| T2 | Onboarding por PDF tabelado (Nome/Função/Email/Tel) com OCR + envio automático de convite | Feature pesada | 1 semana |
| T3 | Cadastro manual de pessoa só por quem o responsável autorizar | Refator (parte do RBAC) | 1 dia |
| T4 | Convite por e-mail → senha própria → OTP no 1º login | Fluxo de auth | 1–2 dias |
| T5 | Check-in (hora entrada, permanência, saída) registrado por pessoa | Feature nova | 2–3 dias |
| T6 | Novo edital SIC Recife 2024 (FIC + MIC) com validações específicas | Seed + lógica | 2 dias |
| T7 | RBAC granular por função/departamento (organograma AV brasileiro) | Refator arquitetura | 1 semana |
| T8 | Canal de comunicação interna por setor (texto + áudio) | Módulo novo grande | 2 semanas |
| T9 | OCR de OD/cronograma antigos (PDF/imagem) → editor nativo | Feature pesada | 1 semana |
| T10 | OCR de notas fiscais (foto/PDF) → preenchimento automático | Feature pesada | 1 semana |

**Total bruto se feito sequencialmente:** ~10 semanas. Reduz pra ~5–6 semanas se paralelizar OCR + RBAC + comunicação como sprints independentes.

---

## 3. Classificação por trilha (do mais fácil ao mais difícil)

```
TRILHA 1 — QUICK WINS (1 dia total, valor imediato)
  C1 → T6 (seed do edital, sem regras ainda)

TRILHA 2 — REFATORAÇÃO DE ARQUITETURA (1 semana, base para o resto)
  C2 → C3 → C4 → T4 → T6 (regras de validação) → T3

TRILHA 3 — MUDANÇA DE MODELO DE NEGÓCIO (1–2 semanas)
  T1 → T7 → T5

TRILHA 4 — HEAVY LIFT (sprint dedicado por feature, paralelizável)
  T2 → T10 → T9 → T8 → C5
```

**Por que essa ordem:** Trilha 1 dá vitórias rápidas que o Thiago pode mostrar nas próximas oficinas do Porto Digital. Trilha 2 arruma a fundação (sem ela, qualquer refator posterior fica difícil). Trilha 3 muda o modelo de negócio (sem isso, não dá pra começar a cobrar). Trilha 4 são as features grandes que justificam o preço.

---

## 4. Detalhamento e passo a passo

### TRILHA 1 — Quick Wins (1 dia)

#### C1 — Bug do campo "nome" na equipe
**Diagnóstico:** o campo `nome` existe na tabela `pessoas` no banco mas o formulário em `src/pages/Team.tsx` não o está incluindo no payload de criação.

**Passos:**
1. Abrir `cineflow-mvp/src/pages/Team.tsx`
2. Verificar o `useState` do formulário e o `mutate` que chama `supabase.from('pessoas').insert(...)`
3. Adicionar input `<Input id="nome" />` na seção do modal
4. Adicionar `nome` ao payload
5. Validar no front: `if (!nome.trim()) return alert("Nome obrigatório")`
6. `vercel --prod`

**Dependências:** nenhuma.

---

#### T6 (parte 1) — Seed do edital SIC Recife 2024
**Diagnóstico:** hoje o banco semeia 2 editais (Funcultura, Lei Paulo Gustavo). Falta o SIC.

**Passos:**
1. Abrir `cineflow-mvp/supabase/migrations/`
2. Criar novo arquivo `0002_seed_sic_recife.sql`
3. Inserir 2 editais (`SIC Recife 2024 — FIC` e `SIC Recife 2024 — MIC`) na tabela `editais`
4. Inserir as rubricas do SIC (mídias sociais 30% max, admin 15% max, etc.)
5. Rodar no SQL Editor do Supabase
6. Ainda **não** implementar as validações — só os dados. As regras vêm na T6 parte 2 (Trilha 2).

**Dependências:** nenhuma.

---

### TRILHA 2 — Refatoração de Arquitetura (1 semana)

#### C2 — OD independente do cronograma
**Diagnóstico:** hoje `ordens_dia.dia_id` é NOT NULL e referencia `dias`. Toda OD precisa de um dia de filmagem cadastrado primeiro. O Chico aponta que profissionais querem fazer OD de ensaio, leitura de roteiro, reunião, scouting — onde não tem "dia de filmagem".

**Passos:**
1. Migration `0003_od_independente.sql`:
   - `alter table ordens_dia alter column dia_id drop not null`
   - Adicionar campos próprios: `od.data date`, `od.locacao_id uuid references locacoes`, `od.tipo text` (filmagem/ensaio/reuniao/scouting/outra)
   - Adicionar `od.departamentos jsonb` para conter as seções por departamento (câmera, arte, som, elétrica, produção, figurino)
   - Adicionar `od.cenas jsonb` para lista de cenas do dia
   - Adicionar `od.chamadas_individuais jsonb` para horário individual por pessoa
2. Refatorar `src/pages/CallSheetEditor.tsx`:
   - Botão "+ Nova OD" não exige mais escolher dia. Cria OD vazia.
   - Adicionar seletor "Vincular a um dia do cronograma (opcional)"
   - Adicionar seção colapsável por departamento
   - Adicionar tabela de cenas
   - Adicionar campo de chamada individual ao lado de cada pessoa escalada
3. Migrar dados existentes: OD's atuais herdam `data` e `locacao_id` do `dia` pai.
4. Atualizar `PublicCallSheet.tsx` para renderizar as novas seções.
5. `vercel --prod`

**Risco:** quebra UX atual de quem já usa. Manter botão "Criar OD a partir de um dia do cronograma" como atalho.

---

#### C3 — Cronograma com fases
**Diagnóstico:** tabela `dias` é só de filmagem. Precisa virar tabela genérica de eventos.

**Passos:**
1. Migration `0004_cronograma_fases.sql`:
   - Renomear `dias` para `eventos_cronograma` (ou manter `dias` e adicionar coluna)
   - Adicionar `fase text` (desenvolvimento, pre_producao, filmagem, pos_producao, entrega)
   - Adicionar `tipo_atividade text` (leitura_roteiro, ensaio, scouting, casting, gravacao, edicao, color, mix, finalizacao, entrega)
   - Adicionar `responsavel_id uuid references pessoas`
2. Refatorar `src/pages/Schedule.tsx`:
   - View padrão: timeline agrupada por fase
   - Filtro por fase
   - Cada linha mostra responsável
3. Manter compatibilidade: dias antigos viram fase=filmagem, tipo=gravacao.

**Risco:** view do Gantt pode ficar carregada. Considerar paginação por fase.

---

#### C4 — Vincular equipe ao cronograma
**Diagnóstico:** hoje `pessoas` existe e `dias` existe, mas não tem tabela ponte.

**Passos:**
1. Migration `0005_escala_evento.sql`:
   - Tabela `escala_evento (id, evento_id, pessoa_id, papel_no_evento, horario_chamada, observacao)`
   - RLS por org_id (via JOIN com evento → projeto → org)
2. Em `Schedule.tsx`, ao clicar num evento, abrir drawer com "Escalar pessoas" (multi-select de pessoas + horário individual).
3. Quando criar OD a partir de um evento, importar automaticamente a escala.

**Dependências:** C3 (precisa do conceito de evento, não só de dia).

---

#### T4 — Convite por e-mail + OTP no 1º login
**Diagnóstico:** Supabase Auth suporta isso nativamente via `inviteUserByEmail` (admin) + magic link + OTP.

**Passos:**
1. Criar Edge Function `invite-person`:
   - Recebe `{ email, papel, projeto_id }`
   - Valida que quem chama tem permissão (RBAC simples por enquanto)
   - Chama `supabase.auth.admin.inviteUserByEmail(email)` com `data: { papel, projeto_id }`
   - Cria entrada em `memberships` com `ativo=false`
2. Configurar template de e-mail no painel do Supabase (Auth → Email Templates → Invite User) com texto em português e link para `/aceitar-convite?token=...`
3. Criar página `src/pages/AcceptInvite.tsx`:
   - Form para criar senha
   - Após salvar senha, dispara `supabase.auth.signInWithOtp({ email })` e mostra campo de código
   - Após confirmar OTP, ativa `memberships.ativo=true` e redireciona pro projeto
4. Adicionar botão "Convidar pessoa" em `src/pages/Settings.tsx` (substitui o fluxo manual via SQL — task #24)

**Dependências:** Trilha 3 do RBAC pra saber quem pode convidar quem. Pode começar com regra simples: só `owner` ou `produtor` do projeto.

---

#### T6 (parte 2) — Validações automáticas do SIC
**Diagnóstico:** o seed da Trilha 1 só popula tabela. Aqui implementamos as regras na função `validar_despesa()`.

**Passos:**
1. Migration `0006_validar_despesa_sic.sql`:
   - Estender RPC `validar_despesa(despesa_id uuid)` com lógica condicional `if edital.codigo = 'SIC_REC_2024_FIC'`
   - Implementar cada vedação:
     - Soma despesas de mídias sociais ≤ 30% do projeto
     - Soma despesas de admin ≤ 15%
     - Soma por CNPJ fornecedor ≤ 30%
     - Data da despesa entre depósito e fim da vigência
     - Sem taxas/multas (verificar palavras-chave na descrição ou rubrica específica)
     - Texto obrigatório presente na descrição da NF
2. UI: na página `Finance.tsx`, exibir mensagem específica de cada vedação ao lado da despesa.
3. Adicionar campo `descricao_nf` na tabela `despesas` (texto que deve constar na NF) e validar.

**Dependências:** T6 parte 1 (seed).

---

#### T3 — Cadastro de pessoa restrito a quem o responsável autorizar
**Diagnóstico:** hoje qualquer membro de uma org pode cadastrar pessoa.

**Passos:**
1. Migration `0007_papel_pode_cadastrar.sql`:
   - Adicionar coluna `pode_cadastrar_pessoas boolean default false` na tabela `memberships`
   - Atualizar policy RLS de INSERT em `pessoas`: `using (exists (select 1 from memberships where user_id = auth.uid() and org_id = pessoas.org_id and pode_cadastrar_pessoas = true))`
2. UI em `Settings.tsx` para owner/admin marcar/desmarcar essa flag por membro.

**Dependências:** T4 (já tem fluxo de membership ativo/inativo).

---

### TRILHA 3 — Mudança de modelo de negócio (1–2 semanas)

#### T1 — Projeto = unidade de cobrança
**Decisão pendente:** qual gateway de pagamento? Stripe Brasil (Pix + cartão)? Mercado Pago? Pagar.me? Asaas?

**Esboço:**
1. Nova tabela `contratos`:
   - `id`, `org_id`, `projeto_id`, `valor`, `status` (pendente, ativo, cancelado, expirado), `metodo_pagamento`, `gateway_ref`, `criado_em`, `pago_em`, `expira_em`
2. Nova tabela `planos`:
   - Planos por porte de projeto (publicidade até 50k, curta até 100k, longa até 500k, longa acima de 500k)
3. Fluxo:
   - Usuário clica "+ Novo projeto" → modal pede dados + plano
   - Sistema cria projeto com `status=aguardando_pagamento`
   - Redireciona pro checkout do gateway
   - Webhook do gateway atualiza `contratos.status=ativo` e `projetos.status=ativo`
4. RLS: usuário só vê projetos cujo contrato está ativo.
5. UI: barra superior do projeto mostra "Plano X · vence em N dias · renovar"

**Risco alto:** gateway + webhooks + idempotência + reconciliação. Recomendo terceirizar a parte de billing para Asaas ou Stripe e só consumir webhook.

**Pergunta pro Thiago:** Qual o ticket? R$ 99/projeto pequeno, R$ 299/médio, R$ 999/longa? Recorrência (mensal enquanto projeto ativo) ou pagamento único?

---

#### T7 — RBAC granular por função (organograma AV)
**Diagnóstico:** hoje só temos `owner` em `memberships.papel`. O organograma profissional brasileiro tem ~30+ funções com permissões diferentes.

**Aguardando:** Thiago vai entregar o organograma detalhado. Sem isso, é especulação.

**Esboço sem o organograma:**
1. Nova tabela `funcoes`:
   - `codigo` (texto: diretor, ad_1, ad_2, dp, op_camera, foquista, gaffer, eletricista, mixer, microfonista, op_boom, art_director, cenografo, figurinista, costureira, atriz, ator, produtor_executivo, produtor_set, prod_assistente, contador, ...)
   - `departamento` (direcao, camera, eletrica, som, arte, figurino, producao, financeiro, elenco, ...)
   - `permissoes_default jsonb` (matriz: ver_cronograma=true, editar_od=false, ver_financeiro=false, ...)
2. Tabela `pessoas_funcao`: liga pessoa a função no contexto do projeto.
3. Policies RLS leem essas permissões.

**Pergunta pro Thiago:** o organograma é a referência única ou cada produtora pode customizar?

---

#### T5 — Check-in com hora de entrada/saída
**Diagnóstico:** depende de equipe vinculada a evento (C4). Sem isso, não dá pra fazer check-in.

**Passos:**
1. Migration `0008_checkins.sql`:
   - Tabela `checkins (id, escala_evento_id, pessoa_id, entrada_em, saida_em, tempo_permanencia_min, observacao, criado_por)`
2. UI:
   - Página `Schedule.tsx` mostra botão "Iniciar check-in do dia" quando hoje = data do evento
   - Lista de pessoas escaladas → cada uma com botão "Marcar entrada" / "Marcar saída"
   - Mobile-friendly (responsável vai usar no celular no set)
3. Relatório:
   - Página nova `src/pages/Atendimento.tsx` ou aba dentro de cada evento
   - Tabela: pessoa, entrada, saída, total, comparação com horário de chamada (atraso/adiantamento)
   - Exportar CSV pra cruzar com folha de pagamento

**Decisão pendente:** check-in com geolocalização? QR code da locação? Manual?

---

### TRILHA 4 — Heavy lift (sprints separados, paralelizáveis)

#### T2 — Onboarding por PDF tabelado + OCR + convite automático
**Stack sugerida:**
- Frontend: drag&drop de PDF
- Backend: Edge Function que recebe PDF, manda pra um serviço de OCR
- OCR options (ordenadas por custo/qualidade):
  - **AWS Textract** (USD ~1.50/1000 págs, ótimo pra tabelas) — mais caro
  - **Google Document AI Form Parser** — qualidade alta
  - **Azure Form Recognizer (Document Intelligence)** — qualidade alta
  - **Tesseract local** (free, mas qualidade média e demanda servidor próprio)
  - **Claude vision** via API (USD baixo, qualidade alta, simples de prompt) — provavelmente nossa primeira escolha
- Edge function:
  1. Upload PDF pra Supabase Storage (bucket privado)
  2. Chama Claude com prompt "extrair pessoas dessa tabela em JSON com {nome, funcao, email, telefone}"
  3. Mostra ao usuário a tabela parseada com checkboxes pra confirmar
  4. Para cada confirmada: chama edge function `invite-person` (do T4)

**Estimativa:** 5–7 dias incluindo testes com PDFs reais.

**Pergunta pro Thiago:** Você tem PDFs de exemplo? Eles seguem um formato padrão (ex.: planilha exportada) ou são livres?

---

#### T10 — OCR de notas fiscais
**Stack sugerida:**
- Para NFs eletrônicas (NFe/NFSe), o XML é estruturado — basta parsear
- Para NFs em foto/PDF escaneado: Claude vision ou Textract
- Prompt: "extrair { cnpj_emitente, razao_social, numero_nf, data_emissao, valor_total, descricao_servico, valor_iss, valor_inss, valor_ir }"
- Validar CNPJ via API ReceitaWS
- Pré-preencher form de despesa em `Finance.tsx`

**Risco:** NF de SP tem layout diferente de NF de PE. Treinar com exemplos.

**Estimativa:** 5–7 dias.

---

#### T9 — OCR de OD/cronograma antigos
**Caso de uso:** produtora migra de WhatsApp/PDF pro CINEFLOW e quer importar 50 OD's antigas sem redigitar.

**Stack:** Claude vision + estrutura do formato OD do CINEFLOW (gerada da Trilha 2 / C2).

**Estimativa:** 4–5 dias (mais simples que NF pq formato é mais livre, mas mais difícil de validar).

---

#### T8 — Canal de comunicação interna por setor
**Decisão fundamental:** construir ou integrar?
- **Construir:** custo alto (mensagens em tempo real, áudio, push notifs, mobile)
- **Integrar:** WhatsApp Business API (paga), Discord (gratuito mas estranho pro contexto), Telegram (gratuito + bom pra grupos)

**Esboço se construir nativo:**
1. Migration `canais (id, projeto_id, departamento, nome)`
2. Migration `mensagens (id, canal_id, autor_id, tipo (texto|audio), conteudo_texto, audio_url, audio_duracao_seg, criado_em)`
3. Supabase Realtime para mensagens novas
4. Supabase Storage para áudios
5. Web Audio API para gravar áudio no navegador
6. Mobile: PWA com notificação push (limitado no iOS)

**Estimativa:** 2 semanas pra MVP funcional, 1 mês pra ficar bom.

**Recomendação:** começar integrando com WhatsApp Business via Z-API ou Twilio. Migrar pra nativo quando o produto tiver tração.

---

#### C5 — Módulos novos (Elenco, Figurino, Análise técnica)
Cada um é um sprint separado de ~1 semana. Esboços rápidos:

- **Elenco:** tabela própria `elenco` com `personagem`, `ator_id (pessoa)`, `caracterizacao`, `disponibilidade`. Separado de `pessoas` pq tem campos diferentes (idade do personagem, descrição, etc.).
- **Figurino:** tabela `figurinos` ligada a cena/personagem, com `descricao`, `foto_referencia_url`, `status (a_comprar/em_producao/pronto/em_uso)`.
- **Análise técnica/Decupagem:** tabela `cenas (numero, descricao, locacao_id, pagina_roteiro)` e `planos (cena_id, numero, lente, tipo, movimento, descricao)`. Editor visual que importa do roteiro.

---

## 5. Sequência recomendada de execução

**Sprint 1 (esta semana):**
- C1 (bug nome)
- T6 parte 1 (seed do SIC)
- C2 (OD independente)

**Sprint 2 (próxima semana):**
- C3 + C4 (cronograma com fases + escala)
- T4 (convite por e-mail + OTP)
- T6 parte 2 (validações SIC)

**Sprint 3:**
- T3 (RBAC permissão de cadastrar)
- T5 (check-in)
- T1 fase 1 (preparar tabelas de contratos/planos, ainda sem gateway)

**Sprint 4:**
- T1 fase 2 (integrar gateway de pagamento)
- T7 (RBAC granular — depende do organograma do Thiago)

**Sprint 5+ (paralelo, conforme prioridade comercial):**
- T10 (OCR de NF) — alto valor financeiro
- T2 (OCR de equipe) — alto valor onboarding
- T9 (OCR OD antiga) — médio valor migração
- T8 (comunicação interna) — alto valor mas alto custo
- C5 (elenco/figurino/decupagem) — sprint dedicado por módulo

---

## 6. Perguntas em aberto que precisam decisão antes de codar

| # | Pergunta | Quem decide | Impacto se errar |
|---|---|---|---|
| Q1 | Qual gateway de pagamento para T1? Stripe / Asaas / Mercado Pago / Pagar.me? | Thiago | Alto — define integração toda |
| Q2 | Modelo de billing: por projeto único, por mês enquanto projeto ativo, ou anual? | Thiago | Alto — define UX |
| Q3 | Ticket por porte de projeto? | Thiago | Médio — só preço |
| Q4 | Organograma completo das funções (T7) | Thiago (em elaboração) | Alto — bloqueia T7 |
| Q5 | Check-in com GPS, QR code ou manual? | Thiago | Médio — define UX e custo |
| Q6 | Canal de comunicação: nativo, WhatsApp Business, Telegram? | Thiago | Alto — 2 semanas vs 2 dias |
| Q7 | OCR: Claude vision (simples, USD baixo) vs Textract (mais caro, mais robusto) | Tech (sugerimos Claude) | Médio — custo operacional |
| Q8 | Migração dos dados atuais (Mares Filmes / Maré Cheia): manter ou zerar? | Thiago | Baixo — só piloto |
| Q9 | Conformidade com LGPD para dados de equipe (e-mail, tel, RG): termo de consentimento já vai entrar agora? | Thiago + jurídico | Médio — risco regulatório |
| Q10 | A pessoa convidada pode estar em N projetos de N produtoras com a mesma conta? | Thiago | Médio — define UX de seletor de contexto |

---

## 7. O que **não** está neste roadmap (out of scope)

Itens que apareceram em conversas passadas mas o Thiago não pediu prioridade agora:
- App nativo iOS/Android (PWA continua sendo a aposta)
- Decupagem automática a partir do roteiro (T9 cobre versão manual; IA vem depois)
- Push-to-talk rádio de set
- Integração com Astra (NFe) ou outros sistemas contábeis
- Marketplace de prestadores de serviço
- Internacionalização (versão em inglês)
- Modo offline avançado

---

## 8. Próximo passo proposto

**Cenário A — começar pela trilha 1 hoje:**
> Fazer C1 (bug nome) + T6 parte 1 (seed SIC) agora. São 1–2 horas de trabalho, dá pra entregar até o fim do dia.

**Cenário B — validar este roadmap primeiro:**
> Você revisa, discute com o Chico e o pessoal da trilha do Porto Digital, e voltamos com as decisões das perguntas em aberto antes de codar qualquer coisa.

**Cenário C — começar pelo módulo de maior valor comercial:**
> Pular direto pra T1 (monetização) + T2 (onboarding por PDF) pra ter algo demonstrável pra clientes. Risco: o produto fica menos sólido nas bordas.

**Minha recomendação:** Cenário A pra pegar momentum + Cenário B em paralelo (você revisa as 10 perguntas em aberto enquanto eu executo a Trilha 1).

---

*CINEFLOW · Roadmap V2 · Maio de 2026*
