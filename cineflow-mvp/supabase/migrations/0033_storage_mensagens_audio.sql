-- ============================================================
-- Migration 0033 — Storage bucket: mensagens-audio
-- Sprint 2A — desbloqueio do módulo de Comunicação (áudio)
-- ============================================================
-- Rodar NO SQL EDITOR do Supabase Dashboard.
-- ATENÇÃO: Se o bucket já existir (erro de chave duplicada),
-- pode ignorar — significa que foi criado manualmente antes.
-- ============================================================

-- 1. Criar bucket público para mensagens de áudio
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mensagens-audio',
  'mensagens-audio',
  true,
  10485760,   -- 10 MB por arquivo
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do nothing;

-- 2. Policy: usuários autenticados podem fazer upload
drop policy if exists "audio upload authenticated" on storage.objects;
create policy "audio upload authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'mensagens-audio');

-- 3. Policy: leitura pública (bucket é público, mas policy garante)
drop policy if exists "audio read public" on storage.objects;
create policy "audio read public"
  on storage.objects for select
  to public
  using (bucket_id = 'mensagens-audio');

-- 4. Policy: dono do arquivo pode deletar
drop policy if exists "audio delete own" on storage.objects;
create policy "audio delete own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'mensagens-audio' and owner = auth.uid());

-- Verificação:
-- select id, name, public from storage.buckets where id = 'mensagens-audio';
