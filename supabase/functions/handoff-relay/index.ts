import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action as string;
    const token = typeof body.token === "string" ? body.token : "";

    if (!token || token.length < 16) {
      return json({ error: "Invalid session token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error: sessionError } = await supabase
      .from("handoff_sessions")
      .select("*")
      .eq("public_token", token)
      .maybeSingle();

    if (sessionError || !session) {
      return json({ error: "Session not found" }, 404);
    }

    if (action === "poll") {
      const after = typeof body.after === "string" ? body.after : null;
      // Visitor already has their own sends locally — only pull Ernst + system
      let q = supabase
        .from("handoff_messages")
        .select("id, role, content, created_at")
        .eq("session_id", session.id)
        .in("role", ["ernst", "system"])
        .order("created_at", { ascending: true })
        .limit(100);

      if (after) {
        q = q.gt("created_at", after);
      }

      const { data: messages, error } = await q;
      if (error) throw new Error(error.message);

      return json({
        success: true,
        status: session.status,
        messages: messages || [],
      });
    }

    if (action === "close") {
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
        content: "Visitor ended the live chat.",
      });

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chatId = session.telegram_chat_id || Deno.env.get("TELEGRAM_CHAT_ID");
      if (botToken && chatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Visitor ended the live handoff.",
            reply_to_message_id: session.telegram_anchor_message_id || undefined,
          }),
        }).catch(() => undefined);
      }

      return json({ success: true, status: "closed" });
    }

    if (action === "send") {
      if (session.status === "closed") {
        return json({ error: "This handoff is closed", status: "closed" }, 409);
      }

      const content =
        typeof body.content === "string" ? body.content.trim() : "";
      if (!content) return json({ error: "Message is empty" }, 400);
      if (content.length > 4000) {
        return json({ error: "Message too long" }, 400);
      }

      const { data: row, error: insertError } = await supabase
        .from("handoff_messages")
        .insert({
          session_id: session.id,
          role: "visitor",
          content,
        })
        .select()
        .single();

      if (insertError || !row) {
        throw new Error(insertError?.message || "Failed to save message");
      }

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chatId = session.telegram_chat_id || Deno.env.get("TELEGRAM_CHAT_ID");
      if (botToken && chatId) {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `👤 Visitor:\n${content.slice(0, 3500)}`,
              reply_to_message_id: session.telegram_anchor_message_id || undefined,
            }),
          },
        );
        const tgData = await tgRes.json();
        if (tgRes.ok && tgData.ok && tgData.result?.message_id != null) {
          await supabase
            .from("handoff_messages")
            .update({ telegram_message_id: tgData.result.message_id })
            .eq("id", row.id);
        }
      }

      await supabase
        .from("handoff_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", session.id);

      return json({
        success: true,
        message: {
          id: row.id,
          role: row.role,
          content: row.content,
          created_at: row.created_at,
        },
        status: session.status,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("handoff-relay error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      500,
    );
  }
});
