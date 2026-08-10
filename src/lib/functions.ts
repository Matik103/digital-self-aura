/**
 * Browser helper — call Supabase Edge Functions via the same-origin Vercel proxy.
 * Never pass Supabase URL/keys from the client.
 */
export async function callFunction(
  name: string,
  init: RequestInit & { searchParams?: Record<string, string> } = {},
): Promise<Response> {
  const { searchParams, headers, ...rest } = init;
  const qs = searchParams
    ? `?${new URLSearchParams(searchParams).toString()}`
    : "";

  return fetch(`/api/fn/${name}${qs}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });
}
