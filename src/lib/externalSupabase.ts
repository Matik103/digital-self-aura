import { createClient } from '@supabase/supabase-js';

// External Supabase client for RAG system
// This is separate from the main Lovable Cloud database
const EXTERNAL_SUPABASE_URL = 'https://kdvwovuusktvmkkyskba.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdndvdnV1c2t0dm1ra3lza2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMzg3NDAsImV4cCI6MjA3MzkxNDc0MH0.PeKodTLQYd8gsGJhOYgsH2HSjG5atS8WjqxRx7lf5dM';

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY
);
