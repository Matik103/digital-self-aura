import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_CORE = `You are the AI avatar of Ernst Romain. Speak in FIRST PERSON (I, me, my) as Ernst.
You are his digital avatar answering from his background.
Be warm, concise, and useful (usually 2-4 short paragraphs). Plain text only: no markdown, no asterisks, no hashtags, no dash bullet lists.

Voice:
- Professional but approachable, confident without bragging
- Prefer concrete project examples over buzzwords
- Match the visitor's level (recruiter vs technical founder)

Ground truth you may use:
- Founder of ER Consulting LLC; full-stack / AI engineer
- Shipped HappeningNow, LifeMirror, AuraPulse, Sip AI; also ScanIt, IncomePilot, SavePilot
- Stack: TypeScript, React, Node, React Native, Python, FastAPI/Django, LLM apps, LangChain, RAG, Supabase/Postgres, AWS, Vercel
- Current: Full-Stack at Sopris Apps (multi-agent AI platform); consulting via ER Consulting
- Contact for the human Ernst: intramaxx1@gmail.com | GitHub matik103 | https://calendly.com/ernstromain/meet-with-ernst | https://www.erconsulting.tech/apps

Conversation rules (critical for trust):
1. Lead with value. Answer the question fully before any soft invite.
2. Do NOT pitch meetings or ask for contact on every reply.
3. Only if the visitor clearly wants to hire, collaborate, get a quote, or book time, you may mention once that they can leave contact details or use Calendly — and that they can also keep chatting.
4. Never pressure, never guilt, never say the chat is ending.
5. If they want to keep exploring topics, encourage that.
6. Only claim experiences that are listed above or in provided context.
7. Contact form (critical): This chat HAS an on-page contact form and “Leave contact” controls. If they ask for a form, contact details, or how to reach the human Ernst, tell them a short form is available right here in the chat (Leave contact / the form that opens). NEVER say there is no form or that a form is unavailable. You may also mention email and Calendly as alternatives.
8. Live human: Visitors can also ask to talk to the real Ernst for a live handoff; do not invent limitations about that.`;

async function keywordRag(
  supabase: ReturnType<typeof createClient>,
  query: string,
  matchCount: number,
): Promise<string> {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 5);
  if (!tokens.length) return "";

  const orFilter = tokens.map((t) => `content.ilike.%${t}%`).join(",");
  const { data, error } = await supabase
    .from("documents")
    .select("id, content")
    .or(orFilter)
    .limit(matchCount * 3);
  if (error || !data?.length) return "";

  const ranked = data
    .map((doc) => {
      const content = (doc.content || "").toLowerCase();
      const hits = tokens.filter((t) => content.includes(t)).length;
      return { content: doc.content as string, hits };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, matchCount);

  return formatClips(ranked.map((d) => d.content));
}

async function vectorRag(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  query: string,
  matchCount: number,
): Promise<string> {
  const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
    }),
  });
  if (!embeddingResponse.ok) {
    throw new Error(`embedding ${embeddingResponse.status}`);
  }
  const embeddingData = await embeddingResponse.json();
  const embedding = embeddingData.data?.[0]?.embedding;
  if (!embedding) throw new Error("no embedding");

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: matchCount,
    filter: {},
  });
  if (error) throw error;
  const docs = (data || []) as Array<{ content?: string }>;
  return formatClips(docs.map((d) => d.content || "").filter(Boolean));
}

function formatClips(contents: string[]): string {
  if (!contents.length) return "";
  const clips = contents.map((raw) => {
    const text = raw.replace(/\s+/g, " ").trim();
    return text.length > 350 ? `${text.slice(0, 350)}…` : text;
  });
  return `\n\nRelevant context from knowledge base:\n${clips.map((c) => `- ${c}`).join("\n")}`;
}

async function fetchRagContext(
  supabaseUrl: string,
  serviceKey: string,
  openaiKey: string,
  query: string,
  matchCount = 2,
): Promise<string> {
  const supabase = createClient(supabaseUrl, serviceKey);
  try {
    const vector = await vectorRag(supabase, openaiKey, query, matchCount);
    if (vector) return vector;
  } catch (err) {
    console.error("vector RAG fallback:", err);
  }
  return keywordRag(supabase, query, matchCount);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { messages, leadAlreadyCaptured } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop();
    let ragContext = "";

    const q = (lastUserMessage?.content || "").trim();
    const skipRag =
      q.length < 12 || /^(hi|hey|hello|thanks|thank you|ok|okay)\b/i.test(q);
    if (!skipRag && q && SUPABASE_URL && SERVICE_KEY) {
      try {
        // Allow a bit more budget for embeddings; still cap so chat stays snappy
        ragContext = await Promise.race([
          fetchRagContext(SUPABASE_URL, SERVICE_KEY, OPENAI_API_KEY, q, 2),
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 900)),
        ]);
      } catch (ragError) {
        console.error("RAG skipped:", ragError);
      }
    }

    const leadNote = leadAlreadyCaptured
      ? "\n\nVisitor already shared contact details. Do not ask again — just be helpful."
      : "\n\nVisitor has not shared contact yet. Do not nag. Soft invite only on clear hiring/project intent.";

    console.log(
      "ai-chat",
      "model=",
      OPENAI_MODEL,
      "msgs=",
      messages.length,
      "ragChars=",
      ragContext.length,
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: SYSTEM_CORE + leadNote + ragContext,
          },
          ...messages.slice(-10),
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`OpenAI error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in ai-chat function:", error);
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
