-- 0063: RLS de canais por is_membro_projeto (igual canal_membros).
-- Antes: critério por org (user_orgs) bloqueava convidado sem membership na org
-- de criar/ver canal -> erro 403 "new row violates RLS for table canais" no chat privado.

drop policy if exists "canais insert" on public.canais;
drop policy if exists "canais select" on public.canais;
drop policy if exists "canais delete" on public.canais;

create policy "canais insert" on public.canais
  for insert to authenticated
  with check (public.is_membro_projeto(projeto_id));

create policy "canais select" on public.canais
  for select to authenticated
  using (
    public.is_membro_projeto(projeto_id)
    and (tipo <> 'privado' or public.is_membro_canal(id))
  );

create policy "canais delete" on public.canais
  for delete to authenticated
  using (public.is_membro_projeto(projeto_id));
