import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://pocketpowered.org",
  output: "static",
  trailingSlash: "always",
  build: {
    // Cloudflare Pages uses style-src self; keep generated styles external.
    inlineStylesheets: "never",
    format: "directory",
  },
});
