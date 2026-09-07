const ORIGIN = "https://tfc-reserve.wongislandd.chatgpt.site";
const PREFIX = "/tfc-amenities";

export async function onRequest({ request }) {
  const url = new URL(request.url);
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return new Response("Not found", { status: 404 });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.get("origin") && request.headers.get("origin") !== url.origin) {
    return new Response("Forbidden", { status: 403 });
  }
  const target = new URL(url.pathname + url.search, ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("authorization");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-proto");
  // Only send this application's session cookies to the reservation site.
  const cookies = (headers.get("cookie") || "").split(";").map((cookie) => cookie.trim()).filter((cookie) => /^tfc-reservation-(session|name)=/.test(cookie));
  headers.delete("cookie");
  if (cookies.length) headers.set("cookie", cookies.join("; "));
  if (headers.has("origin")) headers.set("origin", ORIGIN);
  headers.delete("referer");
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    const setCookies = upstream.headers.getSetCookie();
    responseHeaders.delete("set-cookie");
    for (const cookie of setCookies) {
      if (!/^tfc-reservation-(session|name)=/.test(cookie)) continue;
      responseHeaders.append("set-cookie", cookie.replace(/;\s*Domain=[^;]*/gi, "").replace(/;\s*Path=[^;]*/gi, `; Path=${PREFIX}`));
    }
    const location = responseHeaders.get("location");
    if (location) {
      const destination = new URL(location, target);
      if (destination.origin === ORIGIN) responseHeaders.set("location", new URL(destination.pathname + destination.search + destination.hash, url.origin).href);
    }
    if (!upstream.ok || url.pathname.startsWith(`${PREFIX}/api/`)) responseHeaders.set("cache-control", "private, no-store");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch {
    return new Response("TFC Amenities is temporarily unavailable. Please try again shortly.", { status: 502, headers: { "cache-control": "no-store" } });
  }
}
