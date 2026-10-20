import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { substackLoader } from './lib/substack';

// Posts published on the two Substacks (see src/config.ts).
const posts = defineCollection({
  loader: substackLoader(),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    cover: z.string().optional(),
    // Substack tags; a tag with the same name as a category puts the post in it.
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Articles written in the admin (Pages CMS): src/content/articles/zh and /en.
const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '{zh,en}/*.md' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // The chosen category, saved by the admin as the category file's path.
    category: z.string().nullish(),
    summary: z.string().nullish(),
    cover: z.string().nullish(),
    draft: z.boolean().nullish(),
  }),
});

// Article categories, shown in the Articles dropdown. Made in the admin.
const categories = defineCollection({
  loader: glob({ base: './src/content/categories', pattern: '*.json' }),
  schema: z.object({
    name_en: z.string(),
    name_zh: z.string().nullish(),
    show: z.enum(['both', 'zh', 'en']).nullish(),
    order: z.number().nullish(),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({ title: z.string() }),
});

export const collections = { posts, articles, categories, pages };
