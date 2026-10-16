import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { Lang, Category } from '../i18n';

export type Post = CollectionEntry<'posts'>;

// Files live in src/content/posts/zh/ and src/content/posts/en/.
// The same file name in both folders means "this is a translation of that".
export const langOf = (p: Post): Lang => (p.id.startsWith('en/') ? 'en' : 'zh');
export const slugOf = (p: Post) => p.id.split('/').slice(1).join('/');

export async function getPosts(lang: Lang, category?: Category) {
  const all = await getCollection('posts', (p) => langOf(p) === lang && !p.data.draft);
  return all
    .filter((p) => !category || p.data.category === category)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function hasTranslation(slug: string, lang: Lang) {
  const all = await getCollection('posts');
  return all.some((p) => langOf(p) === lang && slugOf(p) === slug && !p.data.draft);
}

export function readMinutes(body: string, lang: Lang) {
  if (lang === 'zh') {
    const chars = body.replace(/\s/g, '').length;
    return Math.max(1, Math.round(chars / 400));
  }
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
