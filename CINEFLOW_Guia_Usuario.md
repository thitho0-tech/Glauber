# CINEFLOW — Guia do Usuário

Bem-vindo. Este guia explica como usar o CINEFLOW para gerir uma produção audiovisual. **Não tem nada técnico.** Se você sabe usar WhatsApp e Google Docs, vai usar isso aqui.

> **O que é o CINEFLOW?**
> Um aplicativo web que substitui o caos de gerir produção por WhatsApp + planilhas. Tudo num lugar só: cronograma, ordem do dia, equipe, locações, orçamento e prestação de contas dos editais brasileiros.

> **Como acessar?**
> Abra https://cineflow-mvp.vercel.app no navegador (computador, tablet ou celular). Funciona sem instalar nada.

---

## 1. Criar sua conta

1. Na tela inicial, clique em **"Crie sua produtora"**
2. Preencha seu nome, o nome da sua produtora, seu e-mail e uma senha
3. Pronto, você é a dona/dono dessa produtora dentro do app

> 💡 Cada produtora é um espaço separado. Você pode ser dona da sua e ser convidada para outras. Seus dados nunca se misturam.

---

## 2. Criar um projeto

Projetos são os filmes, séries, curtas, publicidades — qualquer coisa que você está produzindo.

1. Menu lateral → **Projetos** → **+ Novo projeto**
2. Preencha:
   - **Nome:** ex. "Maré Cheia"
   - **Tipo:** curta / longa / série / publicidade / clipe / documentário
   - **Orçamento total:** o valor aprovado
   - **Período:** datas de início e fim da execução
   - **Edital:** se for um projeto com recurso público (Funcultura, Lei Paulo Gustavo), selecione aqui. Se for privado, deixe em branco
3. Clique **Criar projeto**

A partir daí, o projeto tem seu próprio menu lateral com sete áreas.

---

## 3. Cadastrar equipe e elenco

**Onde:** menu lateral do projeto → **Equipe**

> 💡 As pessoas que você cadastrar ficam disponíveis em **todos os projetos da sua produtora**. Cadastre uma vez, use sempre.

1. Clique **+ Adicionar pessoa**
2. Preencha o que tiver: nome, função (Diretor de Fotografia, Atriz, Maquiador...), departamento, telefone, e-mail, valor da diária
3. Salvar

Você pode adicionar quantas pessoas quiser. Telefone aparece na Ordem do Dia automaticamente.

---

## 4. Cadastrar locações

**Onde:** menu lateral do projeto → **Locações**

1. Clique **+ Nova locação**
2. Preencha: nome ("Casa da Vovó"), endereço, contato do dono, valor da diária, restrições (ex.: "só pode gravar até 22h, sem ruído")
3. Salvar

---

## 5. Montar o cronograma

**Onde:** menu lateral do projeto → **Cronograma**

Cada linha do cronograma é um dia de filmagem.

1. Clique **+ Novo dia**
2. Preencha: data, chamada geral (horário em que a equipe deve estar no set), locação principal, observações
3. Salvar

Pode adicionar quantos dias forem. Cada dia depois vira uma Ordem do Dia.

---

## 6. Criar a Ordem do Dia

**Onde:** menu lateral do projeto → **Ordem do Dia** → clique em um dia

A Ordem do Dia é o documento que você (ou o 1º AD) manda na véspera dizendo a todo mundo onde estar, em que horário, fazendo o quê.

**Para montar:**
1. **Adicionar pessoas escaladas** — escolha do dropdown quem trabalha nesse dia (a lista vem do cadastro de equipe)
2. **Refeições** — adicione café, almoço, lanche com horários
3. **Informações de produção** — clima, hospital próximo, contatos de emergência
4. **Observações** — qualquer aviso especial (energia limitada, estacionamento, etc.)
5. Clique **Salvar** (guarda como rascunho)
6. Clique **Publicar** (libera o link público)

**Quando publicar:**
- Aparece um link tipo `cineflow-mvp.vercel.app/od/abc123xyz`
- Use o botão **"Enviar via WhatsApp"** — ele abre o WhatsApp já com o texto e o link prontos pra você mandar no grupo
- Quem clica no link vê a OD bonita no celular, sem precisar criar conta

> 💡 Se mudar algo depois de publicar, é só editar e clicar Publicar de novo. Uma nova versão é criada. O link permanece o mesmo e sempre mostra a versão mais recente.

---

## 7. Controlar o orçamento

**Onde:** menu lateral do projeto → **Financeiro**

Duas abas: **Rubricas** (planejamento) e **Lançamentos** (despesas reais).

### Rubricas
São as categorias do orçamento. Se você vinculou o projeto a um edital, as rubricas já vêm prontas (EQUIPE, ELENCO, EQUIP, ARTE, POS, ADM, TRANSP, ALIM, LOCACAO).

Para cada rubrica, defina:
- **Descrição** (ex.: "Cachê da equipe técnica")
- **Valor previsto** (quanto você planeja gastar)

### Lançamentos
Toda vez que tiver uma despesa real (uma diária paga, uma nota fiscal de equipamento, uma compra de alimentação), você lança aqui.

1. **+ Nova despesa**
2. Preencha: descrição, valor, data, rubrica (selecione qual), CNPJ do emitente, número da NF
3. Salvar

**Cada despesa nova é validada automaticamente** contra o edital. Você vê na coluna "Validação":
- 🟢 **OK** — em conformidade
- 🟡 **Atenção** — falta alguma informação (ex.: CNPJ) ou está perto do limite
- 🔴 **Erro** — fora do período do edital, rubrica estourada, etc.

---

## 8. Acompanhar a prestação de contas

**Onde:** menu lateral do projeto → **Prestação**

Esta página é o seu painel de controle de risco. Mostra:

- Quantas despesas estão **conformes**, com **atenção** ou com **erro**
- Tabela por rubrica: quanto já foi gasto, % do orçamento, % máximo do edital
- Lista de todas as despesas com problemas, com a mensagem explicando o que precisa corrigir

> 💡 Use essa página toda semana. Corrigir agora custa 5 minutos. Corrigir no fim do projeto custa o reembolso inteiro.

---

## 9. Compartilhar com a equipe

Hoje, cada pessoa do app é "dona" da sua própria produtora isolada. Para ela ver a SUA produtora:

1. A pessoa cria a conta dela em `cineflow-mvp.vercel.app/signup`
2. Você manda o e-mail dela para o administrador técnico
3. O administrador roda um pequeno comando que adiciona a pessoa à sua produtora com o papel certo (diretor, AD, financeiro, etc.)
4. Próxima vez que ela logar, vê os seus projetos

> 💡 **Versão futura:** vai ter um botão "Convidar pessoa" em Configurações que faz isso automaticamente. Por enquanto é manual.

---

## 10. O que NÃO está pronto ainda (próximas versões)

Para você não esperar e se frustrar:

- **Captura de NF por foto** — você ainda precisa lançar despesas manualmente. Em breve: tira foto da nota e a IA preenche tudo
- **Push-to-talk (rádio de comunicação)** — está no roadmap; por enquanto use WhatsApp para o set
- **Check-in com GPS** — em desenvolvimento
- **Decupagem automática do roteiro** — em desenvolvimento
- **App nativo iOS/Android** — por ora, o site funciona bem no celular como PWA

---

## 11. Quando algo der errado

- **Algo não carrega?** Tente Ctrl+F5 (atualizar forçado). Se persistir, anote o que estava fazendo e mande para o administrador.
- **Esqueci a senha?** Por enquanto não tem "esqueci a senha" — peça pro administrador resetar.
- **Quero apagar um projeto/pessoa?** Use o ícone de lixeira na lista. Cuidado: não tem confirmação ainda (próxima versão).
- **Travou o app?** Faça logout e login de novo.

---

## 12. Boas práticas

Três regrinhas pra tirar valor máximo:

1. **Lance despesas no mesmo dia.** Quanto mais perto da hora do gasto, menor a chance de esquecer detalhes (e a validação te avisa de problemas enquanto dá tempo de corrigir).
2. **Publique a Ordem do Dia até as 18h do dia anterior.** A equipe valoriza saber a chamada de amanhã antes do fim do expediente.
3. **Cheque a página de Prestação uma vez por semana.** Cinco minutos de revisão evitam horas de retrabalho no fim do projeto.

---

Bom trabalho. Qualquer dúvida, fala com o administrador da sua produtora.

*CINEFLOW · v1.0 (MVP) · Maio de 2026*
