# Resonance classic recordings

Six new AI studio renditions are U.S.-only practice previews. Their audio, lyric
text and display JSON live in private Workers KV, not this public repository.
See `public/resonance/classics-manifest.json` for 42 asset hashes and sizes.
`wrangler.toml` preserves the existing Pages name and compatibility date and binds
the private `RESONANCE_CLASSICS` namespace for production and preview deployments.

All `/resonance/classics/*` requests run through country middleware, then the asset
handler. Unknown and non-U.S. countries fail closed. Client country headers do not
override Cloudflare's country. Responses are never cached by browsers/shared CDNs.
Keep the route in `_routes.json`; never copy restricted assets into `public/`.

The immutable prefix is `classics-20260912-v1/`. Deployment does not re-upload or
delete KV media. Future media updates require a new prefix and matching manifest.
The original source, generation receipts and complete export are retained in the
owner's private Resonance workspace and private Sites source repository.
R2 is not enabled on this account; migrate to object storage as the catalog grows.

All charts are `needs_review` with scoring disabled. Karaoke uses acoustic ASR word
timings, and uncertain words do not receive confident highlighting.
