import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, matchCount = 5 } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured");
    }
    if (!query || typeof query !== "string") {
      throw new Error("query is required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prefer vector search when OpenAI key is available
    if (OPENAI_API_KEY) {
      try {
        const embeddingResponse = await fetch(
          "https://api.openai.com/v1/embeddings",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: query,
            }),
          },
        );
        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data?.[0]?.embedding;
          if (embedding) {
            const { data: documents, error } = await supabase.rpc(
              "match_documents",
              {
                query_embedding: embedding,
                match_count: matchCount,
                filter: {},
              },
            );
            if (!error) {
              return new Response(JSON.stringify({ documents: documents || [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            console.error("match_documents error:", error);
          }
        }
      } catch (err) {
        console.error("vector path failed, keyword fallback:", err);
      }
    }

    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((t: string) => t.trim())
      .filter((t: string) => t.length >= 3)
      .slice(0, 6);

    let documents: Array<{
      id: number;
      content: string;
      metadata: unknown;
      similarity?: number;
    }> = [];

    if (tokens.length > 0) {
      const orFilter = tokens.map((t: string) => `content.ilike.%${t}%`).join(",");
      const { data, error } = await supabase
        .from("documents")
        .select("id, content, metadata")
        .or(orFilter)
        .limit(Math.max(matchCount * 4, 12));
      if (error) throw error;
      documents = (data || [])
        .map((doc) => {
          const content = (doc.content || "").toLowerCase();
          const hits = tokens.filter((t: string) => content.includes(t)).length;
          return { ...doc, similarity: hits / tokens.length };
        })
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, matchCount);
    }

    return new Response(JSON.stringify({ documents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in rag-retrieval:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
