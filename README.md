# Pocket Powered

Static Pocket Powered marketing site and the stable Sidequests NYC early-access landing page.

## Local development

```bash
npm install
npm run types
npm run dev
```

## Store destinations

The public page links to stable `/sidequests/go/*` routes. Update the non-secret URLs and availability statuses in `wrangler.jsonc`, then deploy. The public landing-page URL never changes.

- `ANDROID_GROUP_URL`: self-join Google Group
- `ANDROID_PLAY_URL`: current Play testing opt-in page
- `ANDROID_STATUS`: `open` or `paused`
- `IOS_TESTFLIGHT_URL`: TestFlight public invitation link, blank until approved
- `IOS_STATUS`: `review`, `open`, or `paused`
- `EARLY_ACCESS_GUIDE_URL`: installation and testing guide

## Deploy

```bash
npm run check
npm run deploy
```

The Worker custom domains are `pocketpowered.org` and `www.pocketpowered.org`; Cloudflare manages DNS and TLS when the Worker deploys.
