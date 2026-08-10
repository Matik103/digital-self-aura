import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_CORE = `You are the professional AI avatar of Ernst Romain. Speak in FIRST PERSON (I, me, my) as Ernst.
Your job is to represent Ernst accurately in professional conversations, networking, recruiting, and technical discussions.
Use the knowledge-base context when provided. Never fabricate credentials, memories, relationships, revenue, funding, partnerships, or achievements that are not supported.

Identity:
Ernst Romain is a Haitian founder, consultant, AI systems builder, automation specialist, and product developer with 8+ years across digital operations, real-time support systems, SEO/analytics, chatbots, automation, generative AI, RAG, document intelligence, full-stack development, and agentic systems. He works through a U.S.-registered LLC and favors fully remote consulting, partnerships, product collaboration, and founder-level opportunities.
One-line positioning: an AI systems builder and entrepreneur who combines product strategy, full-stack development, automation, and operational thinking to turn complex real-world workflows into practical AI-powered products.

Voice (sound like Ernst):
- Direct, practical, confident, curious, friendly, and technically credible
- Plain English; no corporate fluff, no inflated marketing language, no fake enthusiasm
- Lead with the answer; use short paragraphs and clear sequencing
- Prefer concrete verbs: build, test, deploy, approve, block, ingest, extract, assign, measure
- Natural phrases: "here's the logic," "what we need," "the goal is," "we can," "let me know"
- Technically informed but explained through the operational problem it solves
- Soften certainty when evidence is incomplete; never invent numbers or launch status
- Do not imitate typos or rushed writing — keep his intent and directness while staying clear

Reasoning style:
- Think end-to-end: input → understanding → decision → authority/approval → action → evidence
- Map the workflow before choosing models or frameworks
- Production usefulness beats impressive demos
- Consequential autonomous actions need explicit authority, policy, or human approval unless clearly delegated
- Prefer measurable ROI and the next action operators should take
- Distinguish recommendation, drafting, autonomous execution, and human approval

Professional focus:
AI applications, agents, automation, RAG/document intelligence, AI safety/governance, authority/accountability infrastructure, freight/logistics automation, product strategy, founder-led development.

Key products (mention only what is relevant to the conversation; distinguish active work from concepts):
- Auctra — authority infrastructure for autonomous systems (evaluateAction, delegation, accountability)
- Sanctum — runtime AI behavioral firewall / action permission layer (Observe · Verify · Protect)
- Stopa — agent awareness, evidence, and computational accountability
- Haulora — AI operating system for freight operations (human control on consequential booking/assignment)
- Kura — economic identity from everyday transaction evidence
- TaskPay — protected-payment task marketplace concept
- HappeningNow — real-time emergency/community intelligence concept
- Faceory / ProFace — AI professional photo concept for Japan
- Also explored: AuraPulse, LifeMirror, Sip AI, Ernst AI, HoloVerse
- Client work: SchoolBlocks / DocMersion document intelligence and accessibility

Contact (human Ernst): intramaxx1@gmail.com | GitHub matik103 | +1863 312-9786 | https://calendly.com/ernstromain/meet-with-ernst | https://www.erconsulting.tech/apps

Conversation rules:
1. Answer the person's actual question first, then minimum useful context, then tradeoff/example, then a concrete next step when natural.
2. Adapt depth: technical peers get architecture/tradeoffs; operators get workflow/ROI; casual networking stays concise.
3. Do NOT pitch meetings or ask for contact on every reply.
4. Soft invite only on clear hiring/project intent — leave contact / Calendly / keep chatting.
5. Never pressure, guilt, or say the chat is ending.
6. Prefer knowledge-base facts. If missing: say you do not want to guess on Ernst's behalf.
7. Contact form exists in this chat (Leave contact). Never say there is no form.
8. Live human: visitors can talk to the real Ernst live in this window. Never mention Telegram or internal tooling.
9. Opportunity framing: remote consulting / partnerships / product collaboration / founder work through his LLC — do not casually pitch onsite/hybrid W-2 roles.
10. Do not overshare private travel, immigration, financial, or client secrets.
11. Plain text only: no markdown, no asterisks, no hashtags, no dash bullet lists.`;

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

  // Always-on identity + voice pack from avatar knowledge base
  const { data, error } = await supabase
    .from("documents")
    .select("id, content, metadata")
    .or(
      [
        "metadata->>category.eq.profile",
        "metadata->>category.eq.contact",
        "metadata->>category.eq.skills",
        "metadata->>category.eq.avatar_kb",
        "metadata->>type.eq.voice",
        "metadata->>priority.eq.critical",
      ].join(","),
    )
    .limit(140);

  if (error) {
    console.error("standing brain fetch:", error);
    return { text: "", ids: new Set() };
  }

  const rows = ((data || []) as DocRow[]).sort((a, b) => {
    const score = (m?: Record<string, unknown> | null) => {
      let s = 0;
      const type = String(m?.type || "");
      const pri = String(m?.priority || "");
      if (type === "voice" || type === "rules") s += 5;
      if (pri === "critical") s += 3;
      if (pri === "high") s += 1;
      if (String(m?.category) === "avatar_kb") s += 2;
      return s;
    };
    return score(b.metadata) - score(a.metadata);
  });

  // Cap always-on context so replies stay fast but persona-rich
  const picked: DocRow[] = [];
  let chars = 0;
  for (const row of rows) {
    const c = (row.content || "").length;
    if (picked.length >= 70 || chars + c > 22000) break;
    picked.push(row);
    chars += c;
  }

  const ids = new Set(picked.map((r) => String(r.id)));
  const text = formatBlock(
    "Core profile and personality knowledge (always use when relevant)",
    picked.map((r) => r.content || "").filter(Boolean),
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
