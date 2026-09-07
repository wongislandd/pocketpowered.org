import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/tfc-amenities/[[path]].js";

test("forwards subpath, query, method, and only TFC cookies; scopes returned cookies", async (t) => {
  t.mock.method(globalThis, "fetch", async (target, options) => {
    assert.equal(target.href, "https://tfc-reserve.wongislandd.chatgpt.site/tfc-amenities/api/session?x=1");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("cookie"), "tfc-reservation-session=abc");
    assert.equal(options.headers.get("authorization"), null);
    assert.equal(options.headers.get("origin"), "https://tfc-reserve.wongislandd.chatgpt.site");
    assert.equal(await new Response(options.body).text(), "{}");
    return new Response("{}", { headers: { "set-cookie": "tfc-reservation-session=xyz; Path=/; HttpOnly; Secure; SameSite=Lax" } });
  });
  const response = await onRequest({ request: new Request("https://pocketpowered.org/tfc-amenities/api/session?x=1", { method: "POST", body: "{}", headers: { origin: "https://pocketpowered.org", cookie: "other=private; tfc-reservation-session=abc", authorization: "Bearer unrelated" } }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Path=\/tfc-amenities;/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("rejects cross-origin mutations and unrelated routes", async () => {
  assert.equal((await onRequest({ request: new Request("https://pocketpowered.org/tfc-amenities/api/session", { method: "POST", headers: { origin: "https://other.example" } }) })).status, 403);
  assert.equal((await onRequest({ request: new Request("https://pocketpowered.org/sidequests") })).status, 404);
});

test("keeps upstream redirects on Pocket Powered", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.redirect("https://tfc-reserve.wongislandd.chatgpt.site/tfc-amenities", 302));
  const response = await onRequest({ request: new Request("https://pocketpowered.org/tfc-amenities/") });
  assert.equal(response.headers.get("location"), "https://pocketpowered.org/tfc-amenities");
});
