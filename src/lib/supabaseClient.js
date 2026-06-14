import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  const msg =
    '⚠️ Variables VITE_SUPABASE_URL et/ou VITE_SUPABASE_ANON_KEY manquantes dans .env\n' +
    'Copiez .env.example vers .env et renseignez vos identifiants Supabase.';
  // En dev, on lance une erreur bloquante pour éviter les requêtes silencieuses
  if (import.meta.env.DEV) {
    throw new Error(msg);
  } else {
    console.error(msg);
  }
}

export const supabase = createClient(
  supabaseUrl     || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
