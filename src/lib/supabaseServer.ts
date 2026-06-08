// Cliente Supabase para uso no SERVIDOR (rotas /api/*).
// Usa a publishable key (RLS permissivo no MVP). Não importar no navegador.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export const supabaseServer = createClient(url, key);
