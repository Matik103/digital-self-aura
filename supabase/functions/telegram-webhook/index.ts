import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Always 200 to Telegram so it doesn't retry forever on auth mistakes
  const ok = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    if (secret) {
      const header = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (header !== secret) {
        console.warn("telegram-webhook: bad secret token");
        return new Response(JSON.stringify({ ok: false }), { status: 401 });
      }
    }

    const update = await req.json();
    const message = update.message || update.edited_message;
    if (!message?.text) return ok();

    const allowedChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (allowedChatId && String(message.chat?.id) !== String(allowedChatId)) {
      console.warn("telegram-webhook: ignoring other chat", message.chat?.id);
      return ok();
    }

    const text = String(message.text).trim();
    if (!text) return ok();

    const replyToId = message.reply_to_message?.message_id as number | undefined;
    if (replyToId == null) {
      // Require reply so we know which visitor session
      return ok();
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let sessionId: string | null = null;

    const { data: byAnchor } = await supabase
      .from("handoff_sessions")
      .select("id, status")
      .eq("telegram_anchor_message_id", replyToId)
      .maybeSingle();

    if (byAnchor?.id) {
      sessionId = byAnchor.id;
    } else {
      const { data: byMsg } = await supabase
        .from("handoff_messages")
        .select("session_id")
        .eq("telegram_message_id", replyToId)
        .maybeSingle();
      sessionId = byMsg?.session_id || null;
    }

    if (!sessionId) {
      console.log("telegram-webhook: no session for reply", replyToId);
      return ok();
    }

    const { data: session } = await supabase
      .from("handoff_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session || session.status === "closed") return ok();

    const isDone = /^\/(done|close|end)\b/i.test(text);
    if (isDone) {
      await supabase
        .from("handoff_sessions")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      await supabase.from("handoff_messages").insert({
        session_id: sessionId,
        role: "system",
        content: "Ernst ended the live chat.",
        telegram_message_id: message.message_id,
      });

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: "Handoff closed. Visitor was notified.",
            reply_to_message_id: session.telegram_anchor_message_id || undefined,
          }),
        }).catch(() => undefined);
      }

      return ok();
    }

    // First reply from Ernst → mark active
    if (session.status === "waiting") {
      await supabase
        .from("handoff_sessions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } else {
      await supabase
        .from("handoff_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    await supabase.from("handoff_messages").insert({
      session_id: sessionId,
      role: "ernst",
      content: text.slice(0, 4000),
      telegram_message_id: message.message_id,
    });

    return ok();
  } catch (error) {
    console.error("telegram-webhook error:", error);
    return ok();
  }
});
