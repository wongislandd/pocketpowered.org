# Pocket Powered

Static Pocket Powered marketing site and the stable Sidequests NYC early-access landing page.

## Local development

```bash
npm install
npm run dev
```

## Store destinations

The public page links to stable `/sidequests/go/*` routes, so the landing-page URL never changes when a store invitation changes.

- Update redirect destinations in `public/_redirects`.
- Update platform availability in `public/sidequests/config.json`.
- Use `open`, `review`, or `paused` as platform statuses.
- Keep the iOS URL `null` until Apple approves the public TestFlight invitation.

## Deploy

```bash
npm run check
npm run deploy
```

The project is deployed with Cloudflare Pages Direct Upload. The production custom domain is `pocketpowered.org`; Cloudflare manages DNS and TLS.
