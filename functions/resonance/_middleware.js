// Keep the rest of Pocket Powered's microphone policy unchanged. Only the
// practice document opts into same-origin microphone permission (still user-gated).
export async function onRequest(context) {
  const response = await context.next();
  const pathname = new URL(context.request.url).pathname;
  if (!["/resonance/practice", "/resonance/practice/", "/resonance/practice.html"].includes(pathname)) return response;
  const headers = new Headers(response.headers);
  headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=()");
  headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' https://ktrglbdocowhekhjfkir.supabase.co; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
