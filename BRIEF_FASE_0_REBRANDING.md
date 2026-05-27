# BRIEF FASE 0 — Rebranding CINEFLOW → GLAUBER

**Cole isto no Claude Code para começar.**

## Contexto

O projeto se chamava Cineflow e foi renomeado para **Glauber** por contratempo (provavelmente trademark). Repositório atual está em `cineflow-mvp/`. Logo nova está em `assets/glauber-logo.png` (ou caminho equivalente — confirmar antes).

## Objetivo

Rebrand completo do app antes de qualquer feature nova. Tudo que aparece pro usuário deve dizer "Glauber". Código interno (variáveis, nomes de tabela, paths) pode manter "cineflow" temporariamente — só remover quando custar zero.

## Tarefas concretas (ordem)

### 1. Branch e backup

```bash
git checkout main
git pull
git checkout -b rebrand-glauber
```

### 2. Logo + assets

- Copiar a logo nova para `public/glauber-logo.png` (e versão SVG se houver).
- Atualizar favicon: `public/favicon.ico` + `public/favicon.svg` + `public/apple-touch-icon.png`.
- Atualizar OG image: `public/og-image.png` (1200×630) — versão com a logo nova + tagline.
- Remover assets antigos da Cineflow.

### 3. Meta tags + manifest

- `index.html`: `<title>Glauber</title>`, `<meta name="description" content="Glauber — gestão de produção audiovisual">`, OG tags.
- `public/manifest.json`: `name`, `short_name`, `theme_color`, ícones.

### 4. Variáveis e config

- `.env.example` + `.env.local`: `VITE_APP_NAME=Glauber`.
- Onde tiver string `"Cineflow"` hardcoded em config, trocar para usar `import.meta.env.VITE_APP_NAME` ou `"Glauber"`.

### 5. Search & replace de UI

Rodar busca por todas as variações:

```bash
grep -rni "cineflow" src/ --include="*.tsx" --include="*.ts" --include="*.md"
```

Substituir em **strings visíveis ao usuário** (componentes, textos, labels). NÃO trocar em:
- Nomes de tabela do Supabase (mantém migração intacta).
- Nomes de variáveis/hooks (`useCineflowSomething` pode virar depois).
- Comentários históricos.

Foco: títulos, labels, mensagens, e-mails transacionais, textos de erro.

### 6. E-mails transacionais (Supabase Auth)

- Dashboard Supabase → Authentication → Email Templates.
- Trocar "Cineflow" por "Glauber" em: Confirm signup, Invite user, Magic Link, Reset Password, Change Email.
- Atualizar sender name.

### 7. Vercel

- Renomear projeto Vercel (ou criar novo `glauber-mvp` e migrar domínio).
- Atualizar variáveis de ambiente do projeto.
- Configurar domínio definitivo (qual é? glauber.app? glauber.com.br?).

### 8. README + docs

- `README.md`: novo título, badges, screenshots novos.
- Arquivos em `docs/` mencionando Cineflow: trocar quando trivial.

### 9. Validação final

- `npm run dev` → abrir o app → todas as telas → não deve aparecer "Cineflow" em lugar nenhum visível.
- Tirar 5 prints: login, dashboard, projeto, finanças, OD.
- Teste de e-mail: criar conta nova, ver e-mail de confirmação, conferir que diz "Glauber".

### 10. Commit + deploy

```bash
git add .
git commit -m "rebrand: Cineflow → Glauber (logo, meta, e-mails, UI)"
git push origin rebrand-glauber
# Abrir PR → revisar → merge em main
vercel --prod
```

## Definition of Done

- [ ] Logo nova em todas as telas visíveis.
- [ ] Title, meta description, OG image atualizados.
- [ ] E-mails transacionais dizem "Glauber".
- [ ] `grep -i cineflow` em strings visíveis retorna 0 resultados.
- [ ] Deploy `vercel --prod` em ar com domínio novo.
- [ ] 5 prints anexados ao PR.

## NÃO fazer nesta fase

- NÃO renomear tabelas do Supabase.
- NÃO renomear hooks/variáveis internas se custar mais de 5 min.
- NÃO refatorar nada que não seja rebrand.
- NÃO adicionar feature nova.

## Quando terminar

Volta pro Cowork e me avisa: "Fase 0 concluída, prints aqui, prossegue pra Fase 1." Eu já entrego o BRIEF_FASE_1.md detalhado pra colar em seguida.
