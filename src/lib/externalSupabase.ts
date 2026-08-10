import { supabase } from '@/integrations/supabase/client';

/**
 * Historically a separate RAG Supabase project.
 * After consolidation this is the same client as the app DB.
 */
export const externalSupabase = supabase;

export const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string;
