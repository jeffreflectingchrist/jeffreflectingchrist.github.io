import rss from '@astrojs/rss';
import { getPosts, slugOf } from '../lib/posts';

export async function GET(context) {
  const posts = await getPosts('zh');
  return rss({
    title: '辉映基督',
    description: '圣经灵修与文章，写给在日常中寻求神的人。',
    site: context.site,
    items: posts.map((p) => ({
      title: p.title,
      pubDate: p.date,
      description: p.summary,
      link: `/posts/${slugOf(p)}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}
