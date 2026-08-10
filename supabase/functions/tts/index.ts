import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Adam — override with ELEVENLABS_VOICE_ID secret if needed
const DEFAULT_VOICE_ID = "IRHApOXLvnW57QJPQH2P";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Warm the isolate without calling ElevenLabs (cheap first-Listen speedup)
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { text } = await req.json();
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const voiceId = Deno.env.get("ELEVENLABS_VOICE_ID") || DEFAULT_VOICE_ID;
    const modelId = Deno.env.get("ELEVENLABS_MODEL_ID") || "eleven_flash_v2_5";

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }
    if (!text || typeof text !== "string" || !text.trim()) {
      throw new Error("text is required");
    }

    // Keep clips short for snappy first-byte latency
    const clean = text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 900);

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream` +
        `?optimize_streaming_latency=4&output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: clean,
          model_id: modelId,
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text();
      console.error("ElevenLabs error:", upstream.status, errText);
      return new Response(
        JSON.stringify({
          error: "TTS failed",
          status: upstream.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("tts error:", error);
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
