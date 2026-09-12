import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/resonance/_middleware.js";

test("only the practice document permits same-origin microphone access", async () => {
  for (const path of ["/resonance/practice", "/resonance/practice/", "/resonance/practice.html", "/resonance/", "/", "/sidequests/"]) {
    const response = await onRequest({ request: new Request(`https://pocketpowered.org${path}`), next: async () => new Response("document", { headers: { "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()", "ETag": "original-tag" } }) });
    assert.equal(response.headers.get("Permissions-Policy").includes("microphone=(self)"), path.includes("practice"));
    assert.equal(response.headers.get("ETag"), "original-tag");
    assert.equal(await response.text(), "document");
    if (path.includes("practice")) { assert.equal(response.headers.get("X-Frame-Options"), "DENY"); assert.match(response.headers.get("Content-Security-Policy"), /script-src 'self'/); }
  }
});
