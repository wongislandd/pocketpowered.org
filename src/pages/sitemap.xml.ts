import { getCollection } from "astro:content";

export const prerender = true;

const fixedPaths = [
  "/",
  "/sidequests/",
  "/sidequests/privacy/",
  "/sidequests/delete-account/",
  "/sidequests/terms/",
  "/sidequests/support/",
];

export async function GET() {
  const projects = await getCollection("projects");
  const projectPaths = projects
    .map((project) => project.data.href)
    .filter((href) => href.startsWith("/"));
  const paths = [...new Set([...fixedPaths, ...projectPaths])];
  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, "https://pocketpowered.org").href}</loc></url>`)
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
