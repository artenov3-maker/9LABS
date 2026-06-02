// Conexão com o Supabase.
// Lê as chaves do arquivo .env.local (que NÃO vai para o GitHub).
// Importe `supabase` em qualquer tela para conversar com o banco.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Se faltar alguma chave, avisamos com uma mensagem clara (ajuda a achar o erro).
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
