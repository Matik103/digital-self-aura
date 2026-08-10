import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Free-path RAG: keyword / full-text style match against documents.content.
 * Avoids paid embedding APIs (OpenAI). Existing vector column kept for later use.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, matchCount = 5 } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    if (!query || typeof query !== 'string') {
      throw new Error('query is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((t: string) => t.trim())
      .filter((t: string) => t.length >= 3)
      .slice(0, 6);

    console.log('Keyword RAG for:', query, 'tokens:', tokens);

    let documents: Array<{ id: number; content: string; metadata: unknown; similarity?: number }> = [];

    if (tokens.length > 0) {
      // OR ilike across significant tokens
      const orFilter = tokens.map((t: string) => `content.ilike.%${t}%`).join(',');
      const { data, error } = await supabase
        .from('documents')
        .select('id, content, metadata')
        .or(orFilter)
        .limit(Math.max(matchCount * 4, 12));

      if (error) {
        console.error('Keyword search error:', error);
        throw error;
      }

      // Rank by how many tokens appear in content
      documents = (data || [])
        .map((doc) => {
          const content = (doc.content || '').toLowerCase();
          const hits = tokens.filter((t: string) => content.includes(t)).length;
          return { ...doc, similarity: hits / tokens.length };
        })
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, matchCount);
    }

    // Fallback: return a few profile/contact docs if nothing matched
    if (documents.length === 0) {
      const { data, error } = await supabase
        .from('documents')
        .select('id, content, metadata')
        .or('metadata->>category.eq.profile,metadata->>category.eq.contact,metadata->>category.eq.skills')
        .limit(matchCount);

      if (error) {
        console.error('Fallback search error:', error);
        throw error;
      }
      documents = (data || []).map((d) => ({ ...d, similarity: 0.1 }));
    }

    console.log(`Found ${documents.length} relevant documents`);

    return new Response(
      JSON.stringify({ documents }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in rag-retrieval:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
