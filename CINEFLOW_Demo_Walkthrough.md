# CINEFLOW — Demo end-to-end

> Roteiro narrado de uma sessão de uso completa, desenhado para servir como:
> - Script para você fazer **um vídeo de demo** (5–8 min)
> - Walkthrough para **alguém aprender o app** sozinha
> - Sequência de **prints para um pitch deck** ou apresentação na trilha do Porto Digital
>
> Os marcadores `📸 [PRINT XX]` indicam onde tirar/inserir cada captura. Substitua pelas imagens reais usando a sintaxe Markdown `![Descrição](images/01-login.png)` quando tiver os arquivos.

---

## Setup da demo (1 vez, antes de gravar)

1. App rodando em https://cineflow-mvp.vercel.app
2. Limpar o banco de teste (opcional, para começar do zero):
   ```sql
   -- No SQL Editor do Supabase
   delete from public.projetos;
   delete from public.pessoas;
   delete from public.locacoes;
   ```
3. Logout de qualquer conta existente no navegador
4. Resolução recomendada: **1280×800** (cabe em slides 16:9 sem corte)
5. Tema do navegador: claro (combina com a UI)

---

## Cena 1 — A dor (15 segundos de narração antes de abrir o app)

**Narração sugerida:**

> "Uma produtora audiovisual brasileira média perde sete horas por semana só gerindo cronograma e prestação de contas via WhatsApp e Google Sheets. Trinta e seis por cento já tiveram prejuízos por glosa em editais. Vou mostrar o que a gente está construindo pra resolver isso."

📸 **[PRINT 01]** — Slide com os dois números: **7h/semana** e **36% de prejuízos**. Pode ser uma cópia da seção 5.1 do relatório de pesquisa.

---

## Cena 2 — Criar conta (30 seg)

**Ações:**
1. Abrir `cineflow-mvp.vercel.app` → tela de login aparece
2. Clicar em **"Crie sua produtora"**
3. Preencher:
   - Nome: **Maria Silva**
   - Produtora: **Mares Filmes**
   - E-mail: **maria@maresfilmes.com.br**
   - Senha: qualquer com 6+ caracteres
4. Clicar **Criar conta**

**Narração:**

> "Um signup só. Não pede CNPJ, não pede cartão, não pede convite. A produtora é criada junto com a conta da Maria, e ela já entra como dona."

📸 **[PRINT 02]** — Tela de signup preenchida
📸 **[PRINT 03]** — Dashboard inicial vazio, com a mensagem "Você ainda não tem projetos"

---

## Cena 3 — Criar o projeto vinculado ao Funcultura (45 seg)

**Ações:**
1. Clicar em **Projetos** na sidebar
2. Clicar **+ Novo projeto**
3. Preencher:
   - Nome: **"Maré Cheia" — Longa-metragem**
   - Tipo: **Longa-metragem**
   - Orçamento total: **R$ 250.000**
   - Início: **01/06/2026**
   - Fim: **28/02/2027**
   - Edital: **Funcultura Audiovisual 2025-2026**
4. Clicar **Criar projeto**

**Narração:**

> "Aqui ela vincula o projeto ao Funcultura, que é um dos editais já cadastrados na base. A partir desse momento, toda despesa lançada vai ser cruzada contra as nove rubricas e os percentuais máximos do manual do edital — automaticamente, sem ela precisar lembrar de nada."

📸 **[PRINT 04]** — Modal de novo projeto preenchido
📸 **[PRINT 05]** — Página do projeto recém-criado mostrando os atalhos (Cronograma, OD, Equipe, etc.)

---

## Cena 4 — Cadastrar equipe e locação (30 seg)

**Ações:**
1. Ir em **Equipe** (atalho do projeto)
2. Adicionar 3 pessoas:
   - **João Pereira** · Diretor de Fotografia · Câmera · 81 99999-1111 · diária R$ 1.200
   - **Ana Costa** · 1ª Assistente de Direção · Direção · 81 98888-2222 · diária R$ 900
   - **Carlos Mendes** · Produtor de Set · Produção · 81 97777-3333 · diária R$ 800
3. Ir em **Locações**, adicionar 1:
   - **Casa da Vovó** · Rua das Mangueiras, 42 — Várzea, Recife · contato: Dona Iracema, 81 99000-1234 · diária R$ 500

**Narração:**

> "O catálogo de equipe e elenco fica na produtora, não no projeto. Então a Maria cadastra o João uma vez e usa em todos os projetos futuros — chega de planilha de contatos por filme."

📸 **[PRINT 06]** — Lista de equipe com as 3 pessoas
📸 **[PRINT 07]** — Card da locação

---

## Cena 5 — Montar o cronograma (30 seg)

**Ações:**
1. Ir em **Cronograma**
2. Clicar **+ Novo dia**
3. Adicionar 3 dias:
   - **05/06/2026** · chamada 07:00 · Casa da Vovó
   - **06/06/2026** · chamada 07:00 · Casa da Vovó
   - **07/06/2026** · chamada 08:00 · Casa da Vovó

**Narração:**

> "Cronograma simples — cada linha vira uma Ordem do Dia depois. Os dias podem ser reordenados, copiados, adiados."

📸 **[PRINT 08]** — Tabela do cronograma com os 3 dias

---

## Cena 6 — Criar a Ordem do Dia (60 seg, ponto alto)

**Ações:**
1. Clicar em **Ordem do Dia** na linha do **05/06**
2. Adicionar as 3 pessoas escaladas (João, Ana, Carlos) pelo dropdown
3. Preencher:
   - Refeições: Café 06:30 / Almoço 13:00 / Lanche 17:00
   - Clima: **Sol forte, 32°C, vento leste**
   - Hospital: **Hospital da Restauração, Av. Agamenon Magalhães, s/n · 0800-330-100**
   - Emergência: **SAMU 192 · Bombeiros 193**
   - Observações: **"Locação tem energia limitada — trazer gerador 5kVA. Estacionamento na rua paralela."**
4. Clicar **Salvar**
5. Clicar **Publicar**

**Narração:**

> "Em menos de um minuto a Ordem do Dia tá pronta. Ao publicar, o sistema gera um link público que pode ser aberto sem login — esse link é o substituto definitivo do PDF que hoje circula no WhatsApp."

📸 **[PRINT 09]** — Editor da OD com tudo preenchido
📸 **[PRINT 10]** — Card com o link público aparecendo após publicação

---

## Cena 7 — Mostrar a OD pública no celular (20 seg)

**Ações:**
1. Copiar o link público
2. Abrir em outro navegador / aba anônima / celular
3. Mostrar a página carregando sem precisar de login

**Narração:**

> "Esse é o link que a Maria manda no grupo. Quem clica vê a Ordem do Dia mobile-friendly, sem precisar criar conta, sem propaganda, sem distração."

📸 **[PRINT 11]** — Vista mobile da OD pública (use as ferramentas do Chrome → Toggle device toolbar → iPhone)

---

## Cena 8 — Lançar 3 despesas (a parte que economiza dinheiro) (60 seg)

**Ações:**
1. Ir em **Financeiro** → aba **Rubricas**
2. Criar 3 linhas de orçamento:
   - **EQUIPE** · Cachê João (DP) · R$ 30.000
   - **EQUIP** · Locação de câmera RED · R$ 25.000
   - **ALIM** · Catering 30 dias · R$ 8.000
3. Ir na aba **Lançamentos** → **+ Nova despesa**
4. Despesa 1 (vai ficar **verde** ✓):
   - Descrição: **Diária João Pereira 05/06**
   - Valor: **R$ 1.200**
   - Data: **05/06/2026**
   - Rubrica: **EQUIPE · Cachê João**
   - CNPJ emitente: **12.345.678/0001-90**
5. Despesa 2 (vai ficar **amarela** ⚠):
   - Descrição: **Cachê elenco principal**
   - Valor: **R$ 70.000**
   - Data: **05/06/2026**
   - Sem rubrica vinculada (deixar em branco)
   - CNPJ em branco
6. Despesa 3 (vai ficar **vermelha** ✗):
   - Descrição: **Hotel pré-pré-produção (fora do período)**
   - Valor: **R$ 1.500**
   - Data: **20/05/2026** (anterior ao período do projeto)
   - Rubrica: **ALIM**

**Narração:**

> "Repara nas três cores. A primeira tá em conformidade — verde. A segunda tem CNPJ em branco — amarelo, atenção, vai ter que regularizar antes da prestação. A terceira tem data fora do período do edital — vermelho, vai ser glosada se for parar na prestação. Tudo isso o Funcultura iria pegar daqui a 24 meses, quando já não tem mais como corrigir. O CINEFLOW pega no momento do lançamento."

📸 **[PRINT 12]** — Lista de despesas com as 3 cores (verde, amarelo, vermelho)
📸 **[PRINT 13]** — Zoom na mensagem de validação vermelha ("Despesa anterior ao período de execução do projeto")

---

## Cena 9 — A página de Prestação de Contas (30 seg)

**Ações:**
1. Ir em **Prestação**

**Narração:**

> "Aqui é a foto que a Maria precisa pra dormir tranquila. Consolidado: tantas despesas em conformidade, tantas com atenção, tantas com erro bloqueante. Embaixo, a tabela de cada rubrica mostrando quanto foi gasto, % do orçamento, % máximo permitido pelo edital. E a lista detalhada de cada item que precisa ser corrigido, com a mensagem do banco explicando o quê e por quê. No último dia do projeto, é só clicar em 'Gerar relatório final' e mandar pro Funcultura."

📸 **[PRINT 14]** — Cabeçalho da prestação (3 cards: Conformes / Atenção / Erros)
📸 **[PRINT 15]** — Tabela de consolidação por rubrica (com a linha de alimentação ultrapassada se for o caso)

---

## Cena 10 — Fecha com o impacto (10 seg)

**Narração:**

> "Quando a primeira versão estiver completa, isso aqui economiza pra Maria sete horas por semana e tira o risco financeiro de cima da mesa. É o que a gente está construindo."

📸 **[PRINT 16]** — Logo CINEFLOW + tagline "Gestão de produções audiovisuais"

---

## Checklist de gravação

- [ ] Som limpo (mic dedicado, não do laptop)
- [ ] Resolução 1920×1080 ou 1280×720
- [ ] Cursor visível (no Windows: Configurações → Acessibilidade → cursor maior, cor de destaque)
- [ ] Sem notificações abertas (Foco / Não perturbe ligado)
- [ ] Aba do Chrome em modo anônimo (sem extensões interferindo)
- [ ] Roteiro impresso/aberto em outra tela
- [ ] Total: ~5–8 minutos

---

## Como inserir os prints depois

Quando você gravar/capturar as 16 imagens:

1. Crie a pasta `images/` dentro de `Cineflow/`
2. Salve cada print como `01-login.png`, `02-signup.png`, ... `16-tagline.png`
3. Use Find & Replace neste arquivo: troque `📸 **[PRINT XX]** — descrição` por `![Descrição](images/XX-nome.png)`

Pronto: você tem um walkthrough visual completo num único arquivo Markdown que pode virar PDF, slide deck ou até a documentação pública do MVP.
