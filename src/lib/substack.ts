import type { Loader } from 'astro/loaders';
import { XMLParser } from 'fast-xml-parser';
import { readFile, writeFile } from 'node:fs/promises';
import { SITE } from '../config';
import { dropLeadingCover } from './dedupe';

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

// What Substack answered during this build. It is written to .build-report.txt
// and published by src/pages/build-report.txt.ts, so a missing post can be diagnosed.
const REPORT: string[] = [];

// Reads a web address. For local testing only: if SUBSTACK_MOCK_DIR is set,
// it reads sample files from that folder instead of the internet.
async function getText(url: string): Promise<string> {
  const mock = process.env.SUBSTACK_MOCK_DIR;
  if (mock) {
    const path = url.replace(/^https:\/\//, '').split('?')[0];
    return readFile(`${mock}/${path}`, 'utf8');
  }
  const res = await fetch(url, {
    headers: {
      // Some servers turn away requests that do not look like a normal browser.
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      accept: 'application/json,text/html,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) {
    const snippet = (await res.text().catch(() => '')).slice(0, 160).replace(/\s+/g, ' ');
    throw new Error(`${url} answered ${res.status}: ${snippet}`);
  }
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

// Substack's subscribe box text ("Thanks for reading … Subscribe …").
const SUBSCRIBE_JUNK = /thanks for reading|subscribe for free|感谢阅读|免费订阅/i;

// Plain text of the post's own paragraphs only: leaves out headings, captions,
// quotes, buttons and Substack's subscribe and share boxes.
function bodyText(html: string) {
  const cleaned = html
    .replace(/<(script|style|figcaption|blockquote|h[1-6])[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(subscription-widget|button-wrapper|share|captioned-button)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, ' ');
  const paras = [...cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => toText(m[1]))
    .filter((p) => p && !SUBSCRIBE_JUNK.test(p));
  return (paras.length ? paras.join(' ') : toText(cleaned)).replace(/\s+/g, ' ').trim();
}

function summaryOf(given: string | undefined, html: string, lang: Lang) {
  const s = (given ?? '').trim();
  // Use the post's subtitle when it is real text, not Substack's auto summary with the subscribe line.
  if (s && !SUBSCRIBE_JUNK.test(s)) return s;
  const text = bodyText(html);
  const max = lang === 'zh' ? 90 : 180;
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// Fetches one post (body and tags) by its address ending.
async function fetchPost(base: string, slug: string, lang: Lang, listed?: any): Promise<Raw | null> {
  const post = JSON.parse(await getText(`${base}/api/v1/posts/${slug}`));
  if ((post.audience ?? 'everyone') !== 'everyone') return null; // free posts only
  const html: string = post.body_html ?? '';
  const tags = (post.postTags ?? post.post_tags ?? listed?.postTags ?? listed?.post_tags ?? []).map(tagName);
  return {
    slug,
    title: (post.title ?? listed?.title ?? '').trim(),
    date: post.post_date ?? listed?.post_date,
    summary: summaryOf(post.subtitle ?? listed?.subtitle ?? listed?.description, html, lang),
    cover: post.cover_image ?? listed?.cover_image ?? undefined,
    html,
    tags,
  };
}

async function fetchPosts(base: string, slugs: string[], lang: Lang, listed: Map<string, any>): Promise<Raw[]> {
  const out: Raw[] = [];
  for (let i = 0; i < slugs.length; i += 5) {
    const chunk = await Promise.all(slugs.slice(i, i + 5).map((s) => fetchPost(base, s, lang, listed.get(s))));
    out.push(...chunk.filter((p): p is Raw => p !== null));
  }
  return out;
}

// Route 1: Substack's list of every post.
async function listFromApi(base: string): Promise<Map<string, any>> {
  const items: any[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = JSON.parse(await getText(`${base}/api/v1/archive?sort=new&limit=50&offset=${offset}`));
    if (!Array.isArray(page)) throw new Error('archive list is not a list');
    items.push(...page);
    if (page.length < 50) break;
  }
  return new Map(items.filter((i) => i.slug).map((i) => [i.slug as string, i]));
}

// Route 2: the public Archive page. Substack sometimes lags in updating route 1 and the feed.
async function listFromArchivePage(base: string): Promise<Map<string, any>> {
  const html = await getText(`${base}/archive?sort=new`);
  const slugs = [...html.matchAll(/\/p\/([A-Za-z0-9_%-]+)/g)].map((m) => m[1]);
  return new Map([...new Set(slugs)].map((s) => [s, undefined]));
}

// Route 3: the public feed (shows only the most recent posts).
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
      REPORT.length = 0;
      REPORT.push(`Substack build report, built ${new Date().toISOString()}`);
      for (const lang of ['zh', 'en'] as Lang[]) {
        const name = SITE.substack[lang];
        if (!name) continue;
        const base = `https://${name}.substack.com`;
        let posts: Raw[] = [];
        const routes: Array<[string, () => Promise<Raw[]>]> = [
          ['archive list', async () => {
            const listed = await listFromApi(base);
            return fetchPosts(base, [...listed.keys()], lang, listed);
          }],
          ['archive page', async () => {
            const listed = await listFromArchivePage(base);
            return fetchPosts(base, [...listed.keys()], lang, listed);
          }],
          ['feed', () => fromFeed(base, lang)],
        ];
        let failures = 0;
        for (const [label, run] of routes) {
          try {
            posts = await run();
            if (posts.length > 0) {
              REPORT.push(`${name} / ${label}: ${posts.length} post(s) found, used`);
              break;
            }
            REPORT.push(`${name} / ${label}: answered, but 0 posts`);
            logger.warn(`${name}: ${label} had no posts; trying the next route.`);
          } catch (err) {
            failures++;
            REPORT.push(`${name} / ${label}: FAILED - ${(err as Error).message}`);
            logger.warn(`${name}: ${label} unavailable (${(err as Error).message}); trying the next route.`);
          }
        }
        logger.info(`${name}: ${posts.length} post(s)`);
        REPORT.push(`${name}: ${posts.length} post(s) on the site`);
        await writeFile('.build-report.txt', REPORT.join('\n') + '\n').catch(() => {});
        // If Substack could not be read at all, stop the build. The site that is already
        // live stays as it is, instead of being replaced by an empty one.
        if (posts.length === 0 && failures === routes.length && !process.env.SUBSTACK_ALLOW_EMPTY) {
          throw new Error(
            `Could not read ${name}.substack.com (all ${routes.length} routes failed). ` +
              'Stopping so the live site keeps its current posts. See the lines above for what Substack answered.',
          );
        }
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
          const html = dropLeadingCover(p.html, p.cover);
          store.set({
            id,
            data,
            body: toText(html),
            rendered: { html },
            digest: generateDigest(p.html + p.title),
          });
        }
      }
    },
  };
}
