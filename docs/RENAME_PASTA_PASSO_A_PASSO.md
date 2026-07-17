# RENAME cineflow-mvp → glauber-mvp — Passo a passo (janela calma)

> Fazer quando as equipes estiverem em folga. Produção NÃO é afetada (o app roda na Vercel), mas siga a ordem para não brigar com OneDrive/git. Tempo: ~10 min.

1. **Fechar** Claude Desktop (Cowork), Claude Code e qualquer editor com a pasta aberta.
2. **Pausar o OneDrive:** ícone da nuvem na bandeja → engrenagem → "Pausar sincronização" → 2 horas.
3. No Explorer, renomear `Documents\Claude\Projects\Glauber\cineflow-mvp` → `glauber-mvp`.
4. PowerShell:
   ```powershell
   cd "C:\Users\Thiago França\Documents\Claude\Projects\Glauber"
   git status
   ```
   O git vê o rename como pasta nova/apagada — normal. Se aparecer `index.lock` travado: `Remove-Item ".git\index.lock" -Force`.
5. Editar `glauber-mvp\package.json`: `"name": "cineflow-mvp"` → `"name": "glauber-mvp"`.
6. Testar o link da Vercel (a pasta `.vercel` guarda o projeto por ID, o nome não importa):
   ```powershell
   cd glauber-mvp
   npx tsc --noEmit
   vercel --prod
   ```
   Se a Vercel perguntar de novo qual projeto: escolher `cineflow-s-projects/glauber-mvp` (link existente).
7. Commit (da raiz):
   ```powershell
   cd ..
   git add -A
   git commit -m "chore: rename cineflow-mvp -> glauber-mvp (rebrand tecnico da pasta)"
   git push
   ```
   (Aqui `git add -A` é adequado: o rename gera centenas de pares delete+add que precisam entrar juntos. Conferir com `git status` que não há NADA além do rename + package.json.)
8. Retomar o OneDrive.
9. **Avisar o Claude na próxima sessão** para atualizar CLAUDE.md (caminhos) e a memória.

**Fora do escopo deste rename** (ficam para janela vermelha ou nunca): header `x-cineflow-secret` (funcional — exige redeploy coordenado edge+SQL), chave `cineflow_recovery` (inócua), URL do dashboard Vercel (`cineflow-s-projects` é o nome do time Vercel; renomear o time é opcional e não afeta nada).
