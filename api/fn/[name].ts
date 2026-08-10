import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabasePublic";

export const config = {
  runtime: "edge",
};

/**
 * Same-origin proxy: browser → /api/fn/:name → Supabase Edge Function
 * Injects the public anon key so React never needs VITE_SUPABASE_*.
 */
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /api/fn/:name
  const name = parts[parts.length - 1];

  if (!name || name === "fn") {
    return new Response(JSON.stringify({ error: "Function name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
      },
    });
  }

  const upstreamUrl = `${SUPABASE_URL}/functions/v1/${name}${url.search}`;
  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": req.headers.get("Content-Type") || "application/json",
    },
    body,
  });

  const headers = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
