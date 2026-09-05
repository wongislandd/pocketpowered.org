import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");
const requiredFiles = [
  "index.html",
  "sidequests/index.html",
  "sidequests/privacy/index.html",
  "sitemap.xml",
];

for (const file of requiredFiles) {
  await access(path.join(outputDirectory, file));
}

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(entryPath));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }

  return files;
}

const redirectFile = await readFile(path.join(outputDirectory, "_redirects"), "utf8").catch(() => "");
const redirects = new Set(
  redirectFile
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/)[0]),
);

function pageUrlForFile(file) {
  const relative = path.relative(outputDirectory, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/index\.html$/, "")}`;
}

async function localTargetExists(pathname) {
  if (redirects.has(pathname)) return true;

  const decodedPath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const directPath = path.join(outputDirectory, decodedPath);
  const candidates = pathname.endsWith("/")
    ? [path.join(directPath, "index.html")]
    : [directPath, path.join(directPath, "index.html")];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return true;
    } catch {
      // Try the next generated-file shape.
    }
  }

  return false;
}

const htmlFiles = await collectHtml(outputDirectory);
const missingLinks = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const pageUrl = pageUrlForFile(file);
  const attributes = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g);

  for (const [, reference] of attributes) {
    if (!reference || reference.startsWith("#") || /^(?:https?:|mailto:|tel:|data:)/.test(reference)) continue;

    const target = new URL(reference, `https://pocketpowered.test${pageUrl}`);
    if (!await localTargetExists(target.pathname)) {
      missingLinks.push(`${pageUrl} -> ${target.pathname}`);
    }
  }
}

if (missingLinks.length > 0) {
  throw new Error(`Generated site has missing local links:\n${[...new Set(missingLinks)].join("\n")}`);
}

console.log(`Validated ${htmlFiles.length} generated HTML pages and their local links.`);
