import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = (body.messages || []) as ChatMessage[];
    const conversationSummary =
      typeof body.conversationSummary === "string"
        ? body.conversationSummary
        : "";
    const visitorLabel =
      typeof body.visitorLabel === "string" && body.visitorLabel.trim()
        ? body.visitorLabel.trim().slice(0, 80)
        : "Website visitor";

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!token || !chatId) {
      return new Response(
        JSON.stringify({ error: "Telegram is not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const publicToken = randomToken();
    const { data: session, error: sessionError } = await supabase
      .from("handoff_sessions")
      .insert({
        public_token: publicToken,
        status: "waiting",
        visitor_label: visitorLabel,
        conversation_summary: conversationSummary.slice(0, 8000) || null,
        telegram_chat_id: String(chatId),
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error(sessionError?.message || "Failed to create handoff session");
    }

    const transcriptLines = messages
      .filter((m) => m?.content?.trim())
      .slice(-20)
      .map((m) => {
        const who = m.role === "user" ? "Visitor" : "AI";
        return `${who}: ${m.content.trim().slice(0, 400)}`;
      });

    // Only live traffic is stored for the web client; transcript goes to Telegram only.
    await supabase.from("handoff_messages").insert({
      session_id: session.id,
      role: "system",
      content:
        "Visitor requested a live handoff to Ernst. Waiting for Ernst on Telegram.",
    });

    const recent = transcriptLines.slice(-8).join("\n") || "(no prior messages)";
    const tgText = [
      "<b>Live handoff — Ernst AI</b>",
      "",
      `<b>From:</b> ${escapeHtml(visitorLabel)}`,
      `<b>Session:</b> <code>${escapeHtml(publicToken.slice(0, 8))}</code>`,
      "",
      "<b>Recent chat:</b>",
      `<pre>${escapeHtml(recent).slice(0, 2500)}</pre>`,
      "",
      "<i>Reply to this message to talk to the visitor.</i>",
      "<i>Send /done (as a reply) when finished.</i>",
    ].join("\n");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: tgText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      console.error("Telegram handoff notify failed:", tgData);
      await supabase
        .from("handoff_sessions")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", session.id);
      throw new Error(
        typeof tgData.description === "string"
          ? tgData.description
          : "Failed to notify Telegram",
      );
    }

    const anchorId = tgData.result?.message_id as number | undefined;
    if (anchorId != null) {
      await supabase
        .from("handoff_sessions")
        .update({
          telegram_anchor_message_id: anchorId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        token: publicToken,
        status: "waiting",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("request-handoff error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
