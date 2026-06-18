# SPRINT 6 (proposta) — Decupagem editável vinculada aos departamentos

**Origem:** pedido do Thiago (18/06) — "editar as decupagens; elas devem estar vinculadas aos departamentos e alimentar os formulários: Personagens→Elenco, Arte→Objeto de Arte/Locação, Figurino→Figurino. Outros departamentos virão depois, mesma lógica."
**Status:** SPEC para revisão (algumas decisões a confirmar, marcadas com ❓).

---

## 0. Esclarecimento de modelo (importante)

Existem **duas "decupagens"** no banco — não confundir:

- **`decupagem` (FK → `od_cenas`)** = decupagem **técnica / lista de planos** (tipo de plano, lente, movimento, equipamento). Hoje **vazia** e não é o alvo deste spec.
- **`roteiro_cenas`** = a decupagem **de cenas** (a que importa aqui). Já tem, por cena, as colunas por departamento: `personagens` (text[]), `arte` (text[]), `figurino` (array {personagem,item}), `efeitos`, `som`, `locacao_sugerida`, além de cabeçalho/ambiente/local/sinopse. Hoje é **preenchida pela IA** (botão "Re-decupar") e exibida **somente leitura** na aba Decupagem (`Roteiro.tsx` → `CenaCard`).

**Conexões que já existem e vamos reaproveitar:**
- `personagens` (por projeto) — a decupagem já faz upsert dos nomes detectados (F7).
- `projeto_pessoas.personagem_id` — casting (ator ↔ personagem) = base do Elenco.
- `figurinos.personagem_id` e `arte_objetos.personagem_id` — itens já podem se ligar a um personagem.
- `locacoes` (com etapa proposta/oficial + aprovação, do scouting).

**Housekeeping a corrigir junto:** a policy de escrita da tabela `decupagem` (planos) no cutover (0052) faz join com `roteiro_cenas`, mas `decupagem.cena_id` referencia `od_cenas`. Como a tabela está vazia, não causou efeito, mas deve ser corrigida (join correto via `od_cenas`→`ordens_do_dia`→projeto) para não travar quando a decupagem técnica for usada.

---

## 1. Objetivo

Transformar a aba **Decupagem** (sobre `roteiro_cenas`) de somente-leitura em **editável**, e fazer cada bloco de departamento da cena **gerar/alimentar registros estruturados** nos módulos correspondentes, com rastreabilidade de volta à cena.

Escopo desta sprint (os demais deptos virão depois, mesma lógica):
- **Personagens → Elenco** (casting).
- **Arte → Objeto de Arte e Locação.**
- **Figurino → Figurino.**

---

## 2. UX proposta (aba Decupagem, por cena)

Cada cena (card) deixa de ser só leitura e ganha **edição inline** dos campos da cena (`roteiro_cenas`: cabeçalho, ambiente, sinopse, etc.), gateada por `can('roteiro','editar')`. Além disso, três blocos de departamento com ação de "vincular ao módulo":

**a) Personagens (→ Elenco)**
- Lista os personagens da cena (de `roteiro_cenas.personagens` + tabela `personagens`).
- Por personagem: botão **"Escalar"** → abre o formulário de Elenco (casting) já com o personagem selecionado; ao confirmar, cria/atualiza `projeto_pessoas.personagem_id` (ator ↔ personagem). Permissão: `can('elenco','editar')`.
- Mostrar se o personagem já está escalado (nome do ator) ou "Sem ator".

**b) Arte (→ Objeto de Arte / Locação)**
- Lista os itens de arte da cena (`roteiro_cenas.arte`) e a locação sugerida (`roteiro_cenas.locacao_sugerida`).
- Por item de arte: botão **"Adicionar como Objeto de Arte"** → cria `arte_objetos` (projeto_id, nome=item, personagem_id opcional, vínculo da cena), nascendo com status `sugestao` + `aprovacao_status='pendente'` (fluxo já existente). Permissão: `can('figurino_arte','editar')`.
- Pela locação sugerida: botão **"Adicionar como Locação (scouting)"** → cria `locacoes` etapa 'proposta' / `aprovacao_status='em_analise'` (fluxo scouting já existente). Permissão: `can('locacoes','editar')`.

**c) Figurino (→ Figurino)**
- Lista os itens de figurino da cena (`roteiro_cenas.figurino`, com personagem + item).
- Por item: botão **"Adicionar como Figurino"** → cria `figurinos` (projeto_id, nome=item, personagem_id, vínculo da cena), nascendo `sugestao` + `aprovacao_status='pendente'`. Permissão: `can('figurino_arte','editar')`.

Em todos: se o registro já foi criado a partir daquele item, mostrar "já vinculado" (evitar duplicar) com link para o módulo.

---

## 3. Banco (mudanças propostas)

❓**Decisão 1 — rastreabilidade cena→item.** Recomendo adicionar `roteiro_cena_id uuid references roteiro_cenas(id)` (nullable) em `figurinos`, `arte_objetos` e `locacoes`, para saber de qual cena cada item veio (e mostrar "já vinculado"). Alternativa: ligar só por `personagem_id` (mais frouxo). **Recomendo adicionar o vínculo de cena.**

- `figurinos.roteiro_cena_id`, `arte_objetos.roteiro_cena_id`, `locacoes.roteiro_cena_id` (nullable, FK, on delete set null).
- Índices por `roteiro_cena_id`.
- RLS: as policies de escrita já existem por projeto (não muda).
- (Housekeeping) corrigir a policy da tabela `decupagem`/planos como descrito na seção 0.

Nenhuma mudança destrutiva; tudo aditivo.

---

## 4. Permissões (já cobertas pelo motor composite)

- Editar a cena/decupagem: `can('roteiro','editar')` (ou `can('decupagem','ver')` para ver).
- Escalar elenco: `can('elenco','editar')`.
- Criar objeto de arte / figurino: `can('figurino_arte','editar')`.
- Criar locação: `can('locacoes','editar')`.

Como a aba Decupagem fica acessível a quem decupa (roteiro/direção), mas as **ações de criar** em cada módulo respeitam a permissão do módulo, o fluxo já nasce coerente com o protocolo de segurança.

---

## 5. Decisões a confirmar (❓)

1. **Vínculo de cena** nos itens (figurinos/arte/locações)? (recomendo sim — seção 3).
2. **Locação a partir da Arte:** confirmar que a locação sugerida da cena vira **scouting (proposta → aprovação do diretor)**, e não locação oficial direto.
3. **Casting (Elenco):** "Escalar" cria o vínculo `projeto_pessoas.personagem_id` para um ator **já na equipe**, ou também permite cadastrar um novo ator no ato? (recomendo: selecionar da equipe; cadastrar novo é um passo extra opcional).
4. **Edição dos campos da cena:** liberar edição de todos os campos de `roteiro_cenas` (cabeçalho, sinopse, listas) ou só os blocos de departamento? (recomendo edição completa da cena).
5. **Re-decupar (IA):** ao re-decupar, a IA sobrescreve as listas. Como tratar itens já vinculados a registros? (recomendo: não apagar vínculos; a IA só repõe o texto das listas, os registros criados permanecem).

---

## 6. Faseamento sugerido

- **Fase 1 (DB):** migração com `roteiro_cena_id` nos 3 módulos + fix da policy da `decupagem` técnica.
- **Fase 2 (front — Claude Code):** aba Decupagem editável + os 3 blocos com botões de vínculo (Personagens/Arte/Figurino) e estado "já vinculado".
- **Fase 3 (futuro):** Som, Efeitos e demais departamentos seguindo o mesmo padrão.

Relaciona-se a: matriz de permissões (composite), fluxo de aprovação de Arte/Locação (já no ar), e ao C4 (Agenda) apenas tangencialmente.
