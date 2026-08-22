import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabasePublic.js";

export const config = {
  runtime: "edge",
};

/**
 * Lightweight DB ping so the Supabase free-tier project is not auto-paused
 * after ~7 days of inactivity. Must query Postgres (not just /auth health).
 */
export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Optional: Vercel Cron can send CRON_SECRET — reject other callers if set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?select=id&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
      },
    );

    const body = await res.text();
    const ok = res.ok;

    return new Response(
      JSON.stringify({
        ok,
        supabaseStatus: res.status,
        project: "hlkzgmppfowvkoppqckk",
        checkedAt: new Date().toISOString(),
        hint: ok
          ? "Database activity recorded — resets free-tier inactivity timer."
          : "Ping failed — check Supabase project status.",
        sample: ok ? undefined : body.slice(0, 200),
      }),
      {
        status: ok ? 200 : 502,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Keepalive failed",
        checkedAt: new Date().toISOString(),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
