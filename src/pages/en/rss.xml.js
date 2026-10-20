import rss from '@astrojs/rss';
import { getPosts, slugOf } from '../../lib/posts';

export async function GET(context) {
  const posts = await getPosts('en');
  return rss({
    title: 'Jeff Reflecting Christ',
    description: 'Bible devotions and articles for people seeking God in everyday life.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.title,
      pubDate: p.date,
      description: p.summary,
      link: `/en/posts/${slugOf(p)}/`,
    })),
    customData: '<language>en</language>',
  });
}
