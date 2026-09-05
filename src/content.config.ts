import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    statusLabel: z.string(),
    year: z.number().int(),
    href: z.string(),
    githubUrl: z.url().optional(),
    liveUrl: z.url().optional(),
    featured: z.boolean().default(false),
    order: z.number().int().default(0),
    platforms: z.array(z.string()).default([]),
  }),
});

export const collections = { projects };
