import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveSession(
  supabase: SupabaseClient,
  replyToId: number | undefined,
  chatId: string,
): Promise<{ id: string; status: string; telegram_anchor_message_id: number | null } | null> {
  if (replyToId != null) {
    const { data: byAnchor } = await supabase
      .from("handoff_sessions")
      .select("id, status, telegram_anchor_message_id")
      .eq("telegram_anchor_message_id", replyToId)
      .neq("status", "closed")
      .maybeSingle();
    if (byAnchor?.id) return byAnchor;

    const { data: byMsg } = await supabase
      .from("handoff_messages")
      .select("session_id")
      .eq("telegram_message_id", replyToId)
      .maybeSingle();

    if (byMsg?.session_id) {
      const { data: session } = await supabase
        .from("handoff_sessions")
        .select("id, status, telegram_anchor_message_id")
        .eq("id", byMsg.session_id)
        .maybeSingle();
      if (session && session.status !== "closed") return session;
    }
  }

  // Fallback: most recent open session for this Telegram chat
  // (so Ernst can just type without tapping Reply)
  const { data: latest } = await supabase
    .from("handoff_sessions")
    .select("id, status, telegram_anchor_message_id")
    .eq("telegram_chat_id", chatId)
    .in("status", ["waiting", "active"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    if (!message) {
      console.log("telegram-webhook: no message in update", Object.keys(update || {}));
      return ok();
    }

    // Ignore bot's own echoes
    if (message.from?.is_bot) return ok();

    const text = String(message.text || message.caption || "").trim();
    if (!text) {
      console.log("telegram-webhook: empty text/caption");
      return ok();
    }

    const chatId = String(message.chat?.id ?? "");
    const allowedChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (allowedChatId && chatId !== String(allowedChatId)) {
      console.warn("telegram-webhook: ignoring other chat", chatId);
      return ok();
    }

    const replyToId = message.reply_to_message?.message_id as number | undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const session = await resolveSession(supabase, replyToId, chatId);
    if (!session) {
      console.log("telegram-webhook: no open session", { replyToId, chatId });
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (botToken && chatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "No open web handoff right now. Wait for a visitor to tap Talk to Ernst.",
            reply_to_message_id: message.message_id,
          }),
        }).catch(() => undefined);
      }
      return ok();
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const isDone = /^\/(done|close|end)\b/i.test(text);

    if (isDone) {
      await supabase
        .from("handoff_sessions")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      await supabase.from("handoff_messages").insert({
        session_id: session.id,
        role: "system",
        content: "Ernst ended the live chat.",
        telegram_message_id: message.message_id,
      });

      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Handoff closed. Visitor was notified.",
            reply_to_message_id: session.telegram_anchor_message_id || message.message_id,
          }),
        }).catch(() => undefined);
      }
      return ok();
    }

    await supabase
      .from("handoff_sessions")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    const { error: insertError } = await supabase.from("handoff_messages").insert({
      session_id: session.id,
      role: "ernst",
      content: text.slice(0, 4000),
      telegram_message_id: message.message_id,
    });

    if (insertError) {
      console.error("telegram-webhook insert failed:", insertError);
      return ok();
    }

    console.log("telegram-webhook: delivered ernst reply", {
      sessionId: session.id,
      replyToId: replyToId ?? null,
    });

    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✓ Sent to visitor",
          reply_to_message_id: message.message_id,
        }),
      }).catch(() => undefined);
    }

    return ok();
  } catch (error) {
    console.error("telegram-webhook error:", error);
    return ok();
  }
});
