# Sidequests invitations

The app shares `https://pocketpowered.org/sidequests/invite/?code=…`.
The landing page validates a 12-character code, opens the existing custom scheme only on a user click, offers code copying, and links to beta installation. It does not automatically accept invitations or promise that codes survive installation; users return to the link or enter the saved code after signing in.

Root association files authorize only the existing Sidequests app. Apple uses team ZPAL78XLW6 and bundle com.sidequests.nyc; the invite paths include the bare route and trailing slash. Android uses the Play signing certificate retrieved from generated APK metadata for version 1789002449 on 2026-09-14, not the upload key.

Publish this change before distributing the mobile build that changes its associated domain. The companion mobile/backend PR changes legal URLs, generated invites, and Android/iOS declarations. Existing installed clients continue to recognize the custom scheme; verified HTTPS opening requires the updated mobile build. Domain association verification on the signed store build remains a release check.

Validation: Astro check, 35 existing tests, build/link validation, valid/invalid invite browser walkthrough, code-copy feedback, and a 375px mobile viewport with no horizontal overflow. No real user invitation was accepted during testing.
