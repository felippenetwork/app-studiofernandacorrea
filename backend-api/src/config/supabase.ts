import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, hasSupabase } from './env';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!hasSupabase) {
    throw new Error(
      '[supabase] SUPABASE_URL and SUPABASE_SERVICE_KEY are required. ' +
        'Set them in .env to enable database features.'
    );
  }
  if (!_supabase) {
    _supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

// Use this in repositories — it throws clearly if Supabase is not configured
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});
