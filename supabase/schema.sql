-- ============================================================
-- 9LABS — Esquema do banco (MVP)
-- Cole este conteúdo no Supabase: menu "SQL Editor" -> "New query" -> colar -> "Run".
-- Pode rodar mais de uma vez sem erro (usa "if not exists" / "drop policy if exists").
-- ============================================================

-- Função para gerar IDs únicos (UUID). No Supabase já costuma vir habilitada.
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1) CLIENTES — clientes da agência
-- ------------------------------------------------------------
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,                 -- nome do cliente
  observacoes text,                          -- anotações livres (opcional)
  ativo       boolean not null default true, -- cliente ativo? (para "arquivar" sem apagar)
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) CONTAS_SOCIAIS — contas de rede social de cada cliente
-- ------------------------------------------------------------
create table if not exists public.contas_sociais (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade, -- some junto com o cliente
  plataforma     text not null check (plataforma in ('instagram','facebook','tiktok')),
  usuario_handle text,                        -- @ ou nome do perfil (opcional)
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3) MIDIAS — biblioteca de fotos/vídeos (guardadas no Storage)
-- ------------------------------------------------------------
create table if not exists public.midias (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references public.clientes(id) on delete set null, -- opcional: mídia pode ser geral
  tipo            text not null check (tipo in ('imagem','video')),
  url_publica     text not null,             -- link público para usar no post
  caminho_storage text not null,             -- caminho do arquivo dentro do bucket "midias"
  nome_arquivo    text,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4) POSTS_AGENDADOS — posts no calendário
-- ------------------------------------------------------------
create table if not exists public.posts_agendados (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null references public.clientes(id) on delete cascade,
  midia_id             uuid references public.midias(id) on delete set null,
  legenda              text,
  data_agendada        timestamptz not null,  -- data + hora do agendamento
  -- status do post (preparado para o "Post for Me" no futuro):
  status               text not null default 'rascunho'
                         check (status in ('rascunho','agendado','publicado','falhou')),
  id_externo_postforme text,                  -- id devolvido pelo Post for Me (vazio por ora)
  erro_mensagem        text,                  -- mensagem de erro se a publicação falhar (vazio por ora)
  created_at           timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5) POSTS_CONTAS — liga um post às contas/redes escolhidas (N:N)
--    (um post pode ir para várias redes ao mesmo tempo)
-- ------------------------------------------------------------
create table if not exists public.posts_contas (
  post_id         uuid not null references public.posts_agendados(id) on delete cascade,
  conta_social_id uuid not null references public.contas_sociais(id) on delete cascade,
  primary key (post_id, conta_social_id)
);

-- ============================================================
-- SEGURANÇA (RLS — Row Level Security)
-- ------------------------------------------------------------
-- Esta 1ª versão é um painel INTERNO, SEM login. Para o app funcionar lendo/escrevendo
-- com a "publishable key", liberamos acesso total nas tabelas abaixo.
-- ATENÇÃO: isso significa que quem tiver a chave + URL consegue ler/gravar os dados.
-- Como o uso é interno e a URL não é divulgada, é aceitável no MVP.
-- Vamos endurecer isso depois (ex.: senha de acesso ou login), conforme o roadmap.
-- ============================================================
alter table public.clientes        enable row level security;
alter table public.contas_sociais  enable row level security;
alter table public.midias          enable row level security;
alter table public.posts_agendados enable row level security;
alter table public.posts_contas    enable row level security;

-- Política permissiva (acesso total) para o MVP, por tabela:
drop policy if exists "mvp_acesso_total" on public.clientes;
create policy "mvp_acesso_total" on public.clientes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_acesso_total" on public.contas_sociais;
create policy "mvp_acesso_total" on public.contas_sociais
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_acesso_total" on public.midias;
create policy "mvp_acesso_total" on public.midias
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_acesso_total" on public.posts_agendados;
create policy "mvp_acesso_total" on public.posts_agendados
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_acesso_total" on public.posts_contas;
create policy "mvp_acesso_total" on public.posts_contas
  for all to anon, authenticated using (true) with check (true);
