-- ============================================================
-- 9LABS — Permissões do Storage (bucket "midias")
-- Cole no Supabase: "SQL Editor" -> "New query" -> colar -> "Run".
-- Libera a chave pública (anon) para ENVIAR, LER e EXCLUIR arquivos do bucket "midias".
--
-- ATENÇÃO (mesmo trade-off das tabelas): isso permite que quem tiver a chave + URL
-- gerencie os arquivos do bucket. Aceitável neste MVP interno; endurecemos depois.
-- Pode rodar mais de uma vez sem erro (usa "drop policy if exists").
-- ============================================================

-- LER (necessário para listar/baixar pela API)
drop policy if exists "midias_select" on storage.objects;
create policy "midias_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'midias');

-- ENVIAR (upload)
drop policy if exists "midias_insert" on storage.objects;
create policy "midias_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'midias');

-- ATUALIZAR (ex.: sobrescrever)
drop policy if exists "midias_update" on storage.objects;
create policy "midias_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'midias');

-- EXCLUIR
drop policy if exists "midias_delete" on storage.objects;
create policy "midias_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'midias');
