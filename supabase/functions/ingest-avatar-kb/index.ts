import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type InChunk = {
  content: string;
  metadata?: Record<string, unknown>;
};

async function embedTexts(
  openaiKey: string,
  texts: string[],
): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`embed ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.data || []).map((row: { embedding: number[] }) => row.embedding);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!openaiKey || !supabaseUrl || !serviceKey) {
      throw new Error("Missing OPENAI_API_KEY or Supabase credentials");
    }

    const body = await req.json();
    const source = String(body.source || "avatar_knowledge_base_v1");
    const chunks = (body.chunks || []) as InChunk[];
    const replace = body.replace !== false;

    if (!Array.isArray(chunks) || !chunks.length) {
      return new Response(JSON.stringify({ error: "chunks[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    if (replace) {
      const { error: delError2 } = await supabase
        .from("documents")
        .delete()
        .filter("metadata->>source", "eq", source);
      if (delError2) {
        console.warn("delete warning:", delError2.message);
      }
    }

    let inserted = 0;
    const batchSize = 16;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);
      const embeddings = await embedTexts(openaiKey, texts);
      const rows = batch.map((c, idx) => ({
        content: c.content,
        metadata: {
          source,
          ...(c.metadata || {}),
        },
        embedding: embeddings[idx],
      }));
      const { error } = await supabase.from("documents").insert(rows);
      if (error) throw new Error(error.message);
      inserted += rows.length;
    }

    return new Response(
      JSON.stringify({ success: true, inserted, source }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("ingest-avatar-kb:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
