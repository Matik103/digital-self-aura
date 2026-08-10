import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_CORE = `You are the AI avatar of Ernst Romain. Speak in FIRST PERSON (I, me, my) as Ernst.
You are his digital avatar answering from his background and the knowledge-base context provided below.
Be warm, concrete, and useful (usually 2-5 short paragraphs). Plain text only: no markdown, no asterisks, no hashtags, no dash bullet lists.

Voice:
- Professional but approachable, confident without bragging
- Prefer concrete project examples, stack choices, and outcomes over buzzwords
- Match the visitor's level (recruiter vs technical founder)

Ground truth (always true; knowledge base may add detail):
- Founder of ER Consulting LLC (also referenced as ER Consultant LLC); full-stack / AI engineer
- Shipped HappeningNow, LifeMirror, AuraPulse, Sip AI; also ScanIt, IncomePilot, SavePilot
- Stack: TypeScript, React, Node, React Native, Python, FastAPI/Django, LLM apps, LangChain, RAG, Supabase/Postgres, AWS, Vercel
- Current: Full-Stack at Sopris Apps (multi-agent AI platform); consulting via ER Consulting
- Contact for the human Ernst: intramaxx1@gmail.com | GitHub matik103 | phone +1863 312-9786 | https://calendly.com/ernstromain/meet-with-ernst | https://www.erconsulting.tech/apps

Conversation rules (critical for trust):
1. Lead with value. Answer fully using the knowledge-base context when relevant.
2. Do NOT pitch meetings or ask for contact on every reply.
3. Only if the visitor clearly wants to hire, collaborate, get a quote, or book time, you may mention once that they can leave contact details or use Calendly — and that they can also keep chatting.
4. Never pressure, never guilt, never say the chat is ending.
5. If they want to keep exploring topics, encourage that.
6. Prefer knowledge-base facts over guessing. If something is not in ground truth or context, say you can share what you know and invite a follow-up — do not invent employers, dates, or metrics.
7. Contact form (critical): This chat HAS an on-page contact form and “Leave contact” controls. If they ask for a form, contact details, or how to reach the human Ernst, tell them a short form is available right here in the chat. NEVER say there is no form. You may also mention email and Calendly.
8. Live human: Visitors can ask to talk to the real Ernst for a live chat in this window. Never mention Telegram or internal tooling.`;

const MATCH_COUNT = 10;
const CLIP_CHARS = 600;
const RAG_TIMEOUT_MS = 3500;
const STANDING_CACHE_MS = 5 * 60 * 1000;

type DocRow = {
  id: number | string;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
};

let standingBrainCache: { at: number; text: string; ids: Set<string> } | null =
  null;

function normalizeContent(raw: string, maxChars = CLIP_CHARS): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function formatBlock(title: string, contents: string[]): string {
  const clips = contents.map((c) => normalizeContent(c)).filter(Boolean);
  if (!clips.length) return "";
  return `\n\n${title}:\n${clips.map((c) => `- ${c}`).join("\n")}`;
}

async function fetchStandingBrain(
  supabase: SupabaseClient,
): Promise<{ text: string; ids: Set<string> }> {
  if (
    standingBrainCache &&
    Date.now() - standingBrainCache.at < STANDING_CACHE_MS
  ) {
    return standingBrainCache;
  }

  // Always-on identity pack: profile, contact, skills, plus critical facts
  const { data, error } = await supabase
    .from("documents")
    .select("id, content, metadata")
    .or(
      [
        "metadata->>category.eq.profile",
        "metadata->>category.eq.contact",
        "metadata->>category.eq.skills",
        "metadata->>priority.eq.critical",
      ].join(","),
    )
    .limit(100);

  if (error) {
    console.error("standing brain fetch:", error);
    return { text: "", ids: new Set() };
  }

  const rows = (data || []) as DocRow[];
  const ids = new Set(rows.map((r) => String(r.id)));
  const text = formatBlock(
    "Core profile knowledge (always use when relevant)",
    rows.map((r) => r.content || "").filter(Boolean),
  );
  standingBrainCache = { at: Date.now(), text, ids };
  return standingBrainCache;
}

async function keywordRag(
  supabase: SupabaseClient,
  query: string,
  matchCount: number,
  excludeIds: Set<string>,
): Promise<DocRow[]> {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 8);
  if (!tokens.length) return [];

  const orFilter = tokens.map((t) => `content.ilike.%${t}%`).join(",");
  const { data, error } = await supabase
    .from("documents")
    .select("id, content, metadata")
    .or(orFilter)
    .limit(matchCount * 4);
  if (error || !data?.length) return [];

  return (data as DocRow[])
    .filter((doc) => !excludeIds.has(String(doc.id)))
    .map((doc) => {
      const content = (doc.content || "").toLowerCase();
      const hits = tokens.filter((t) => content.includes(t)).length;
      return { doc, hits };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, matchCount)
    .map((x) => x.doc);
}

async function vectorRag(
  supabase: SupabaseClient,
  openaiKey: string,
  query: string,
  matchCount: number,
  excludeIds: Set<string>,
): Promise<DocRow[]> {
  const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query.slice(0, 4000),
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
    match_count: matchCount + excludeIds.size,
    filter: {},
  });
  if (error) throw error;

  return ((data || []) as DocRow[])
    .filter((d) => d.content && !excludeIds.has(String(d.id)))
    .slice(0, matchCount);
}

async function fetchRagContext(
  supabaseUrl: string,
  serviceKey: string,
  openaiKey: string,
  query: string,
): Promise<string> {
  const supabase = createClient(supabaseUrl, serviceKey);
  const standing = await fetchStandingBrain(supabase);
  const used = new Set(standing.ids);

  let vectorDocs: DocRow[] = [];
  try {
    vectorDocs = await vectorRag(
      supabase,
      openaiKey,
      query,
      MATCH_COUNT,
      used,
    );
  } catch (err) {
    console.error("vector RAG fallback:", err);
  }
  for (const d of vectorDocs) used.add(String(d.id));

  // Merge keyword hits so sparse / exact names still surface
  const keywordDocs = await keywordRag(
    supabase,
    query,
    Math.max(4, Math.floor(MATCH_COUNT / 2)),
    used,
  );

  const topical = [...vectorDocs, ...keywordDocs]
    .map((d) => d.content || "")
    .filter(Boolean);

  return (
    standing.text +
    formatBlock("Relevant knowledge for this question", topical)
  );
}

function shouldSkipRag(q: string): boolean {
  const trimmed = q.trim();
  if (!trimmed) return true;
  // Only skip pure greetings / acknowledgements — short real questions still RAG
  return /^(hi|hey|hello|thanks|thank you|thx|ok|okay|cool|great|nice|bye|goodbye)[\s!.?]*$/i
    .test(trimmed);
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
    if (!shouldSkipRag(q) && SUPABASE_URL && SERVICE_KEY) {
      try {
        ragContext = await Promise.race([
          fetchRagContext(SUPABASE_URL, SERVICE_KEY, OPENAI_API_KEY, q),
          new Promise<string>((resolve) =>
            setTimeout(() => resolve(""), RAG_TIMEOUT_MS)
          ),
        ]);
        if (!ragContext) {
          console.warn("RAG timed out or empty — answering from system core");
        }
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
        max_tokens: 750,
        temperature: 0.65,
        messages: [
          {
            role: "system",
            content: SYSTEM_CORE + leadNote + ragContext,
          },
          // Keep enough recent turns for continuity
          ...messages
            .filter(
              (m: { role: string }) =>
                m.role === "user" || m.role === "assistant",
            )
            .slice(-14),
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
