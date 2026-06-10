-- ============================================================
-- 9LABS — Fase 6 (Zernio): coluna para guardar o ID da conta na Zernio
-- Cole no Supabase: "SQL Editor" -> "New query" -> colar -> "Run".
-- Pode rodar mais de uma vez sem erro.
-- ============================================================

-- Guarda o "_id" da conta conectada na Zernio (ex.: para enviar o post à conta certa).
alter table public.contas_sociais
  add column if not exists id_externo_zernio text;

-- Guarda o "_id" do PROFILE da Zernio que representa este cliente (agrupa as contas dele).
alter table public.clientes
  add column if not exists id_externo_zernio text;

-- Tipo de conteúdo por rede em cada post: feed | story | reels (IG) / feed | story (FB) / video (TikTok).
alter table public.posts_contas
  add column if not exists tipo_conteudo text not null default 'feed';
