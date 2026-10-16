import rss from '@astrojs/rss';
import { getPosts, slugOf } from '../../lib/posts';

export async function GET(context) {
  const posts = await getPosts('en');
  return rss({
    title: 'Jeff Reflecting Christ',
    description: 'Bible devotions and articles for people seeking God in everyday life.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.summary,
      link: `/en/posts/${slugOf(p)}/`,
    })),
    customData: '<language>en</language>',
  });
}
