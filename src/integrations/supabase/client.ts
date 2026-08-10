import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Optional direct browser client. Prefer `@/lib/functions` (`/api/fn/*`) so
 * VITE_SUPABASE_* env vars are not required on Vercel.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

export const supabase =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : (null as unknown as ReturnType<typeof createClient<Database>>);
