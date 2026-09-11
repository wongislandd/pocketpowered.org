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

## TFC Amenities

`/tfc-amenities` and its child routes proxy the live TFC Amenities Sites deployment.
The app is built with `/tfc-amenities` as its base path, including API calls and assets.
The Pages Function forwards only TFC session cookies and scopes returned cookies to
this path. Other Pocket Powered routes continue to serve static pages.

Keep `functions/tfc-amenities/[[path]].js` and `public/_routes.json` in deployments.
Reservation application updates are published through the TFC Reserve Sites project.

## Hexicon showcase

`/hexicon/` is the dedicated word-roguelike showcase, with a bespoke homepage
feature and the actual 0.2.6 game screenshots and artwork. Its collection entry
adds it to the sitemap. `/hexicon/go/ios` redirects to the public TestFlight link.
The iPhone beta is open, with two numbered buttons to install TestFlight and
join the public beta. Essential details are inline, matching the Android card. `/hexicon/go/android-group` redirects to the
public Pocket Powered Early Testers group. `/hexicon/go/android` redirects to
Hexicon's Google Play closed-test opt-in. `/hexicon/go/android-store` redirects to
the Play Store listing. The Android instructions have three matching buttons for
joining the group, opting into the test, and installing through Google Play.
Essential account and device details appear inside the buttons. The Android card
identifies United States availability without claiming a current review status.
Both enrollment steps and the phone's Play Store must use the same Google account.
The group is reusable across participating apps, each of which
requires a separate Play opt-in. Asset provenance is in
`public/hexicon/assets/README.md`.

Hexicon also includes a separate invited-tester section. The stable routes
`/hexicon/go/android-paid-internal` and `/hexicon/go/android-internal` point to
the paid and original Android internal tracks, respectively. Access requires an
account on the corresponding tester list; public beta enrollment remains above.
