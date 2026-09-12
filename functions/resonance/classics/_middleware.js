// These newly recorded compositions have U.S. public-domain clearance only.
// Cloudflare supplies cf.country; client headers must never override it.
export async function onRequest(context) {
  const headers = {
    "Cache-Control": "private, no-store",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (context.request.cf?.country !== "US") {
    return new Response("This Resonance rendition is available for listening in the United States only.", {
      status: 451,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" }
    });
  }
  const response = await context.next();
  const merged = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) merged.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged });
}
