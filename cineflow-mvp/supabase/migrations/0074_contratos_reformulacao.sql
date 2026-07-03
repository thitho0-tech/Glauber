-- 0074_contratos_reformulacao.sql
-- Reformula a sub-aba Contratos:
--   * N contratos por projeto (a tabela já suporta; o front deixa de usar maybeSingle)
--   * partes / parcelas / cláusulas em JSONB
--   * vínculo opcional a pessoa (pessoa_id) e função (funcao_av_id)
--   * novo domínio de status (6 valores)
--   * nova tabela contrato_anexos (upload real no bucket 'documentos')
-- Aditiva e NÃO destrutiva. RLS de contrato_anexos espelha as policies existentes de contratos.
-- Nenhum bucket novo (reutiliza 'documentos', criado em 0039).

begin;

-- 1) Novo domínio de status (6 valores). A linha existente (status antigo) continua válida.
alter table public.contratos drop constraint if exists contratos_status_check;
alter table public.contratos
  add constraint contratos_status_check
  check (status in ('rascunho','enviado_assinatura','assinado','vigente','encerrado','cancelado'));

-- 2) Colunas novas — todas nullable ou com default; não quebram o Contract.tsx atual.
alter table public.contratos
  add column if not exists tipo            text,
  add column if not exists funcao_av_id    uuid references public.funcoes_av(id),
  add column if not exists pessoa_id       uuid references public.pessoas(id),
  add column if not exists contratada_tipo text,
  add column if not exists lei_incentivo   text,
  add column if not exists termo_numero    text,
  add column if not exists partes          jsonb not null default '{}'::jsonb,
  add column if not exists parcelas        jsonb not null default '[]'::jsonb,
  add column if not exists clausulas       jsonb not null default '{}'::jsonb;

-- Restrições de domínio (permitem null; se preenchido, validam)
alter table public.contratos drop constraint if exists contratos_contratada_tipo_check;
alter table public.contratos
  add constraint contratos_contratada_tipo_check
  check (contratada_tipo is null or contratada_tipo in ('pj','pf'));

alter table public.contratos drop constraint if exists contratos_tipo_check;
alter table public.contratos
  add constraint contratos_tipo_check
  check (tipo is null or tipo in
    ('servicos_tecnicos','roteirista','direcao','elenco','fornecedor','cessao_direitos','coproducao','outro'));

create index if not exists idx_contratos_projeto on public.contratos(projeto_id);
create index if not exists idx_contratos_pessoa  on public.contratos(pessoa_id);

-- 3) Tabela de anexos (1..N por contrato) — arquivos ficam no bucket 'documentos'
create table if not exists public.contrato_anexos (
  id           uuid primary key default gen_random_uuid(),
  contrato_id  uuid not null references public.contratos(id) on delete cascade,
  projeto_id   uuid not null references public.projetos(id)  on delete cascade,
  rotulo       text not null default 'outro'
               check (rotulo in ('minuta','gerado','assinado','aditivo','outro')),
  arquivo_path text not null,
  mime         text,
  tamanho      int,
  enviado_por  uuid default auth.uid(),
  criado_em    timestamptz not null default now()
);

create index if not exists idx_contrato_anexos_contrato on public.contrato_anexos(contrato_id);

alter table public.contrato_anexos enable row level security;

-- RLS espelhando contratos:
--   leitura por org (user_orgs)  |  escrita por pode(projeto_id,'contratos','editar')
drop policy if exists "contrato_anexos select org" on public.contrato_anexos;
create policy "contrato_anexos select org" on public.contrato_anexos for select
  using (projeto_id in (
    select p.id from public.projetos p where p.org_id in (select user_orgs())
  ));

drop policy if exists "contrato_anexos write pode" on public.contrato_anexos;
create policy "contrato_anexos write pode" on public.contrato_anexos for all
  using      (pode(projeto_id, 'contratos', 'editar'))
  with check (pode(projeto_id, 'contratos', 'editar'));

commit;

-- Recarrega o schema cache do PostgREST (evita erro de coluna nova no front)
notify pgrst, 'reload schema';
