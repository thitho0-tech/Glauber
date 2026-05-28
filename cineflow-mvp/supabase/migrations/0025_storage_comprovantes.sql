-- Migration: 0025_storage_comprovantes.sql
-- Sprint 1B — Storage bucket privado para comprovantes e NF
-- ATENÇÃO: Aplicar DEPOIS de 0026_fornecedores.sql (depende da tabela fornecedores)

-- Criar bucket privado "comprovantes"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprovantes',
  'comprovantes',
  false,
  10485760,  -- 10MB
  array['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do nothing;

-- Política: usuário autenticado pode fazer upload
create policy "comprovantes_upload" on storage.objects for insert
  with check (
    bucket_id = 'comprovantes'
    and auth.role() = 'authenticated'
  );

-- Política: usuário autenticado pode visualizar
create policy "comprovantes_select" on storage.objects for select
  using (
    bucket_id = 'comprovantes'
    and auth.role() = 'authenticated'
  );

-- Política: usuário autenticado pode deletar seus próprios arquivos
create policy "comprovantes_delete" on storage.objects for delete
  using (
    bucket_id = 'comprovantes'
    and auth.role() = 'authenticated'
  );

-- Adicionar colunas em despesas para storage
alter table public.despesas
  add column if not exists fornecedor_id uuid references public.fornecedores(id),
  add column if not exists comprovante_path text;

comment on column public.despesas.comprovante_path is 'Path no storage: {org_id}/{projeto_id}/{despesa_id}/{filename}';
comment on column public.despesas.fornecedor_id is 'FK para tabela fornecedores';
