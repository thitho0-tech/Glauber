# Glauber — MVP

Plataforma SaaS para gestão de produções audiovisuais brasileiras. Stack: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase.

## Setup local em 4 passos

### 1. Instalar dependências
```bash
cd cineflow-mvp
npm install
```

### 2. Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto novo na região **South America (São Paulo)**.
2. Vá em **Settings → API** e copie:
   - `Project URL`
   - `anon public` key

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Edite `.env` e cole as 2 chaves do passo anterior.

### 4. Rodar a migration no Supabase
1. No Supabase, abra **SQL Editor → New query**
2. Abra o arquivo `supabase/migrations/0001_init.sql` deste projeto
3. Cole todo o conteúdo no SQL Editor e clique em **Run**
4. Deve ver "Success" e 15 tabelas criadas + 2 editais com 14 rubricas

### 5. Subir o servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173`. Crie sua conta e teste o fluxo completo.

## Deploy no Vercel

```bash
# Push para o GitHub (criar repo privado primeiro)
git init && git add . && git commit -m "init"
git remote add origin git@github.com:SEU_USER/cineflow-mvp.git
git push -u origin main
```

Depois, em [vercel.com/new](https://vercel.com/new):
1. Importe o repo
2. Framework: Vite (auto-detectado)
3. Em **Environment Variables**, cole `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Estrutura

```
cineflow-mvp/
├── src/
│   ├── components/   # UI base (shadcn-style) + Layout + Auth
│   ├── pages/        # 11 telas funcionais
│   ├── lib/          # supabase client + utils
│   ├── hooks/        # useAuth, useOrg
│   ├── types/        # tipos do banco
│   └── App.tsx       # router
├── supabase/
│   └── migrations/   # schema + RLS + seed
└── ...
```

## Módulos implementados no MVP

- ✅ Auth (e-mail/senha) com criação automática de org
- ✅ Multi-tenant com RLS por org
- ✅ Projetos (CRUD)
- ✅ Equipe e elenco (catálogo da produtora)
- ✅ Locações
- ✅ Dias de filmagem + Ordem do Dia (com link público sem login)
- ✅ Escalas por dia
- ✅ Orçamento por rubrica
- ✅ Despesas com validação contra edital (Funcultura PE e Lei Paulo Gustavo seeded)
- ✅ Prestação de contas (consolidado visual)
- ✅ PWA-ready (Service Worker pode ser adicionado depois)

## Próximos passos (fora do MVP)

- OCR de NF (Mindee + Claude) — exigirá Edge Function Supabase
- Push-to-Talk (LiveKit)
- Check-in com GPS
- Parser de roteiro PDF (decupagem automática)
- Stripboard drag-and-drop

## Licença
Proprietário — Glauber © 2026
