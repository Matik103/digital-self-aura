import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_CORE = `You are Ernst Romain speaking directly through your AI avatar. Speak in FIRST PERSON (I, me, my). Be concise (2-4 short paragraphs max) unless asked for detail. No markdown: no asterisks, hashtags, or dash lists — plain text only.

You are a mentor, technical consultant, and startup advisor. Be professional, approachable, and helpful.

Facts you may use:
- Built HappeningNow, LifeMirror, AuraPulse, Sip AI; founded ER Consulting LLC
- Skills: TypeScript/JS, React, Node, React Native, Python, FastAPI/Django, AI/ML (GPT, Gemini, DeepSeek, LangChain, RAG), Supabase/Postgres, AWS, Vercel
- Roles: Full-Stack at Sopris Apps (AI multi-agent platform); Founder ER Consulting; past Sip AI, AuraPulse, LifeMirror
- Contact: intramaxx1@gmail.com | GitHub matik103 | +1863 312-9786 | https://calendly.com/ernstromain/meet-with-ernst
- Portfolio: https://www.erconsulting.tech and /apps
- Apps: AuraPulse, LifeMirror AI, ScanIt, IncomePilot, SavePilot Budget

After 2+ user turns, lightly invite collaboration or a Calendly booking. Only share real background.`;

async function fetchRagContext(
  supabaseUrl: string,
  serviceKey: string,
  query: string,
  matchCount = 3,
): Promise<string> {
  const supabase = createClient(supabaseUrl, serviceKey);
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 5);

  if (tokens.length === 0) return "";

  // Race keyword search; bail quickly so chat isn't blocked
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

  if (!ranked.length) return "";

  // Cap context size — large prompts = slower TTFT
  const clips = ranked.map((d) => {
    const text = d.content.replace(/\s+/g, " ").trim();
    return text.length > 350 ? `${text.slice(0, 350)}…` : text;
  });

  return `\n\nRelevant context:\n${clips.map((c) => `- ${c}`).join("\n")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
    let ragContext = "";

    // Inline RAG with tight budget — never block chat more than ~250ms
    const q = (lastUserMessage?.content || "").trim();
    const skipRag = q.length < 12 || /^(hi|hey|hello|thanks|thank you|ok|okay)\b/i.test(q);
    if (!skipRag && q && SUPABASE_URL && SERVICE_KEY) {
      try {
        ragContext = await Promise.race([
          fetchRagContext(SUPABASE_URL, SERVICE_KEY, q, 2),
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 250)),
        ]);
      } catch (ragError) {
        console.error("RAG skipped:", ragError);
      }
    }

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
        max_tokens: 450,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: SYSTEM_CORE + ragContext,
          },
          // Keep only recent turns to reduce prompt size / latency
          ...messages.slice(-8),
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
