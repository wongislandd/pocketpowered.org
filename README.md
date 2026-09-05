# Pocket Powered

Static Pocket Powered portfolio and the stable Sidequests NYC early-access landing page. Astro provides a small shared brand shell while every product keeps its own page structure, visual language, and interaction model.

## Local development

```bash
npm install
npm run dev
```

## Add a project

Pocket Powered is optimized for a few high-quality products, not a large uniform catalogue. Adding a project is intentionally a small product-design task:

1. Add its identity, status, and canonical URL to `src/content/projects/` so shared navigation and the sitemap know it exists.
2. Create a bespoke homepage feature under `src/components/projects/<project>/`.
3. Build the product page at its own route with whatever components, media, styling, and interaction model suit that product.

Shared code should cover Pocket Powered navigation, accessibility, metadata, and deployment—not force product pages into one template. Sidequests is the reference for this approach.

## Store destinations

The public page links to stable `/sidequests/go/*` routes, so the landing-page URL never changes when a store invitation changes.

- Update redirect destinations in `public/_redirects`.
- Update platform availability in `public/sidequests/config.json`.
- Use `open`, `review`, or `paused` as platform statuses.
- Keep the iOS URL `null` until Apple approves the public TestFlight invitation.

## Deploy

Every push to `main` is validated and deployed automatically to the
`pocketpowered-site` Cloudflare Pages project by GitHub Actions. The workflow
can also be run manually from the repository's **Actions** tab.

The workflow requires these GitHub Actions repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with Cloudflare Pages Write access

For a manual fallback deployment:

```bash
npm run check
npm run build
npm run validate
npm run deploy
```

The project is deployed with Cloudflare Pages Direct Upload. The production custom domain is `pocketpowered.org`; Cloudflare manages DNS and TLS.
