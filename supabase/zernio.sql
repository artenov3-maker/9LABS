-- ============================================================
-- 9LABS — Fase 6 (Zernio): coluna para guardar o ID da conta na Zernio
-- Cole no Supabase: "SQL Editor" -> "New query" -> colar -> "Run".
-- Pode rodar mais de uma vez sem erro.
-- ============================================================

-- Guarda o "_id" da conta conectada na Zernio (ex.: para enviar o post à conta certa).
alter table public.contas_sociais
  add column if not exists id_externo_zernio text;
