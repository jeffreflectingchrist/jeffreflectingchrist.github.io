import type { Loader } from 'astro/loaders';
import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'node:fs/promises';
import { SITE } from '../config';

type Lang = 'zh' | 'en';
type Category = 'devotion' | 'article';

interface Raw {
  slug: string;
  title: string;
  date: string;
  summary: string;
  cover?: string;
  html: string;
  tags: string[];
}

// Reads a web address. For local testing only: if SUBSTACK_MOCK_DIR is set,
// it reads sample files from that folder instead of the internet.
async function getText(url: string): Promise<string> {
  const mock = process.env.SUBSTACK_MOCK_DIR;
  if (mock) {
    const path = url.replace(/^https:\/\//, '').split('?')[0];
    return readFile(`${mock}/${path}`, 'utf8');
  }
  const res = await fetch(url, { headers: { 'user-agent': 'jeffreflectingchrist-site-build' } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}

const tagName = (t: unknown): string =>
  typeof t === 'string' ? t : String((t as any)?.name ?? (t as any)?.slug ?? '');

const toText = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

function summaryOf(given: string | undefined, html: string, lang: Lang) {
  const s = (given ?? '').trim();
  if (s) return s;
  const text = toText(html);
  const max = lang === 'zh' ? 90 : 180;
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// Preferred route: Substack's archive list, which includes every post and its tags.
async function fromArchive(base: string, lang: Lang): Promise<Raw[]> {
  const items: any[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = JSON.parse(await getText(`${base}/api/v1/archive?sort=new&limit=50&offset=${offset}`));
    if (!Array.isArray(page)) throw new Error('archive list is not a list');
    items.push(...page);
    if (page.length < 50) break;
  }
  const free = items.filter((i) => i.slug && (i.audience ?? 'everyone') === 'everyone');
  const out: Raw[] = [];
  for (let i = 0; i < free.length; i += 5) {
    const chunk = await Promise.all(
      free.slice(i, i + 5).map(async (item) => {
        const post = JSON.parse(await getText(`${base}/api/v1/posts/${item.slug}`));
        const html: string = post.body_html ?? '';
        const tags = (post.postTags ?? post.post_tags ?? item.postTags ?? item.post_tags ?? []).map(tagName);
        return {
          slug: item.slug as string,
          title: (post.title ?? item.title ?? '').trim(),
          date: post.post_date ?? item.post_date,
          summary: summaryOf(post.subtitle ?? item.subtitle ?? item.description, html, lang),
          cover: post.cover_image ?? item.cover_image ?? undefined,
          html,
          tags,
        } as Raw;
      }),
    );
    out.push(...chunk);
  }
  return out;
}

// Backup route: the public feed (shows only the most recent posts).
async function fromFeed(base: string, lang: Lang): Promise<Raw[]> {
  const xml = await getText(`${base}/feed`);
  const doc = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml);
  const raw = doc?.rss?.channel?.item;
  const items: any[] = !raw ? [] : Array.isArray(raw) ? raw : [raw];
  return items
    .map((it) => {
      const html: string = it['content:encoded'] ?? '';
      const cats = it.category == null ? [] : Array.isArray(it.category) ? it.category : [it.category];
      const slug = String(it.link ?? '').split('/p/')[1]?.split(/[?#]/)[0] ?? '';
      return {
        slug,
        title: String(it.title ?? '').trim(),
        date: new Date(it.pubDate).toISOString(),
        summary: summaryOf(it.description ? toText(String(it.description)) : '', html, lang),
        cover: it.enclosure?.['@_url'],
        html,
        tags: cats.map(tagName),
      } as Raw;
    })
    .filter((p) => p.slug && p.html);
}

export function categoryOf(tags: string[], lang: Lang): Category {
  const have = tags.map((t) => t.trim().toLowerCase());
  return have.includes(SITE.tags[lang].devotion.toLowerCase()) ? 'devotion' : 'article';
}

export function substackLoader(): Loader {
  return {
    name: 'substack',
    load: async ({ store, parseData, generateDigest, logger }) => {
      store.clear();
      for (const lang of ['zh', 'en'] as Lang[]) {
        const name = SITE.substack[lang];
        if (!name) continue;
        const base = `https://${name}.substack.com`;
        let posts: Raw[];
        try {
          posts = await fromArchive(base, lang);
        } catch (err) {
          logger.warn(`${name}: archive list unavailable (${(err as Error).message}); using the feed instead.`);
          posts = await fromFeed(base, lang);
        }
        logger.info(`${name}: ${posts.length} post(s)`);
        for (const p of posts) {
          const id = `${lang}/${p.slug}`;
          const data = await parseData({
            id,
            data: {
              title: p.title,
              date: p.date,
              category: categoryOf(p.tags, lang),
              summary: summaryOf(p.summary, p.html, lang),
              cover: p.cover,
              draft: false,
            },
          });
          store.set({
            id,
            data,
            body: toText(p.html),
            rendered: { html: p.html },
            digest: generateDigest(p.html + p.title),
          });
        }
      }
    },
  };
}
