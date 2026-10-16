import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { substackLoader } from './lib/substack';

const posts = defineCollection({
  // Posts come from the two Substacks (see src/config.ts), not from files.
  loader: substackLoader(),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['devotion', 'article']),
    summary: z.string(),
    // 'illustration' for the drawn sun-and-book, or an image path such as /images/photo.jpg
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({ title: z.string() }),
});

export const collections = { posts, pages };
