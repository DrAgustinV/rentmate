/**
 * Centralized Supabase client initialization.
 * Prevents multiple client instances, auth state desync, and memory leaks.
 */
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-auth-token',
  },
  global: {
    headers: { 'X-Client-Info': 'flatmate-service-layer' },
  },
  db: {
    schema: 'public',
  },
});

export type SupabaseClient = typeof supabase;
