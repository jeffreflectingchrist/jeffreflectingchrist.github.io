import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n';

// A category from the admin. `id` is its file name, which is also its web address.
export interface Topic {
  id: string;
  name: { zh: string; en: string };
  show: 'both' | 'zh' | 'en';
  order: number;
}

// One post, from Substack or from the admin, in the same shape.
export interface Post {
  id: string; // 'zh/<slug>' or 'en/<slug>'
  lang: Lang;
  slug: string;
  source: 'substack' | 'admin';
  title: string;
  date: Date;
  summary: string;
  cover?: string;
  topic?: Topic;
  body: string;
  entry: CollectionEntry<'posts'> | CollectionEntry<'articles'>;
}

const fileId = (s: string) => s.split('/').pop()!.replace(/\.(json|md)$/i, '');
const same = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

let topicCache: Topic[] | null = null;
export async function getTopics(lang?: Lang): Promise<Topic[]> {
  if (!topicCache) {
    const all = await getCollection('categories');
    topicCache = all
      .map((c) => ({
        id: fileId(c.id),
        name: { en: c.data.name_en.trim(), zh: (c.data.name_zh ?? '').trim() },
        show: c.data.show ?? 'both',
        order: c.data.order ?? 100,
      }))
      .sort((a, b) => a.order - b.order || a.name.en.localeCompare(b.name.en));
  }
  if (!lang) return topicCache;
  return topicCache.filter((t) => (t.show === 'both' || t.show === lang) && topicName(t, lang));
}

export const topicName = (t: Topic, lang: Lang) => (lang === 'zh' ? t.name.zh || t.name.en : t.name.en);

// Plain text of a Markdown body, for summaries and reading time.
const plain = (md: string) =>
  md
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

let postCache: Post[] | null = null;
async function allPosts(): Promise<Post[]> {
  if (postCache) return postCache;
  const topics = await getTopics();
  const out: Post[] = [];

  for (const p of await getCollection('posts', (p) => !p.data.draft)) {
    const lang: Lang = p.id.startsWith('en/') ? 'en' : 'zh';
    const topic = topics.find((t) => p.data.tags.some((tag) => same(tag, t.name.en) || same(tag, t.name.zh) || same(tag, t.id)));
    out.push({
      id: p.id, lang, slug: p.id.split('/').slice(1).join('/'), source: 'substack',
      title: p.data.title, date: p.data.date, summary: p.data.summary, cover: p.data.cover,
      topic, body: p.body ?? '', entry: p,
    });
  }

  for (const a of await getCollection('articles', (a) => !a.data.draft)) {
    const lang: Lang = a.id.startsWith('en/') ? 'en' : 'zh';
    const body = plain(a.body ?? '');
    const max = lang === 'zh' ? 90 : 180;
    const summary = a.data.summary?.trim() || (body.length > max ? body.slice(0, max).trimEnd() + '…' : body);
    const topic = a.data.category ? topics.find((t) => t.id === fileId(a.data.category!)) : undefined;
    out.push({
      id: a.id, lang, slug: a.id.split('/').slice(1).join('/'), source: 'admin',
      title: a.data.title, date: a.data.date, summary, cover: a.data.cover ?? undefined,
      topic, body, entry: a,
    });
  }

  // If an admin article and a Substack post share an address, keep the admin one.
  const seen = new Set<string>();
  postCache = out
    .sort((x, y) => (x.source === 'admin' ? -1 : 1) - (y.source === 'admin' ? -1 : 1))
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  return postCache;
}

export async function getPosts(lang: Lang, topicId?: string) {
  return (await allPosts())
    .filter((p) => p.lang === lang && (!topicId || p.topic?.id === topicId))
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

export const slugOf = (p: Post) => p.slug;
export const renderPost = (p: Post) => render(p.entry as any);

export function readMinutes(body: string, lang: Lang) {
  if (lang === 'zh') {
    const chars = body.replace(/\s/g, '').length;
    return Math.max(1, Math.round(chars / 400));
  }
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
