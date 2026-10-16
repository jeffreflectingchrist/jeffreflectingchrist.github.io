export type Lang = 'zh' | 'en';
export type Category = 'devotion' | 'article';

export const ui = {
  zh: {
    siteName: '辉映基督',
    tagline: '圣经灵修与文章',
    description: '圣经灵修与文章，写给在日常中寻求神的人。',
    htmlLang: 'zh-Hans',
    otherHtmlLang: 'en',
    navLabel: '主导航',
    nav: { devotions: '灵修', articles: '文章', about: '关于', subscribe: '订阅' },
    switchLabel: 'English',
    menu: '菜单',
    themeToggle: '切换明暗模式',
    latest: '最新灵修',
    readMore: '继续阅读 →',
    readTime: (n: number) => `${n} 分钟阅读`,
    welcome: '欢迎来到辉映基督。这里的灵修与文章，是写给在日常中寻求神的人。',
    author: '杰辉',
    subscribeTitle: '订阅',
    subscribeBlurb: '新的灵修与文章发布时，寄到你的邮箱。',
    subscribeButton: '订阅',
    subscribeSoon: '订阅功能即将开放。',
    contactTitle: '联系',
    contactBlurb: '有问题，或想交流，欢迎来信。',
    categories: { devotion: '灵修', article: '文章' },
    backTo: { devotion: '← 返回灵修', article: '← 返回文章' },
    empty: '这里还没有内容。',
    copyright: '© 辉映基督',
  },
  en: {
    siteName: 'Jeff Reflecting Christ',
    tagline: 'Bible devotions & articles',
    description: 'Bible devotions and articles for people seeking God in everyday life.',
    htmlLang: 'en',
    otherHtmlLang: 'zh-Hans',
    navLabel: 'Main navigation',
    nav: { devotions: 'DEVOTIONS', articles: 'ARTICLES', about: 'ABOUT', subscribe: 'SUBSCRIBE' },
    switchLabel: '中文',
    menu: 'Menu',
    themeToggle: 'Toggle light and dark mode',
    latest: 'Latest devotions',
    readMore: 'Continue reading →',
    readTime: (n: number) => `${n} min read`,
    welcome:
      'Welcome to jeffreflectingchrist. These devotions and articles are written for people seeking God in everyday life.',
    author: 'Jeff',
    subscribeTitle: 'Subscribe',
    subscribeBlurb: 'Get new devotions and articles by email.',
    subscribeButton: 'Subscribe',
    subscribeSoon: 'Subscriptions are opening soon.',
    contactTitle: 'Contact',
    contactBlurb: 'Questions, or just want to talk? Write to me.',
    categories: { devotion: 'Devotions', article: 'Articles' },
    backTo: { devotion: '← Back to devotions', article: '← Back to articles' },
    empty: 'Nothing here yet.',
    copyright: '© Jeff Reflecting Christ',
  },
};

export const paths = {
  zh: {
    home: '/',
    devotions: '/devotions/',
    articles: '/articles/',
    about: '/about/',
    subscribe: '/subscribe/',
    post: (slug: string) => `/posts/${slug}/`,
    rss: '/rss.xml',
  },
  en: {
    home: '/en/',
    devotions: '/en/devotions/',
    articles: '/en/articles/',
    about: '/en/about/',
    subscribe: '/en/subscribe/',
    post: (slug: string) => `/en/posts/${slug}/`,
    rss: '/en/rss.xml',
  },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(d: Date, lang: Lang) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return lang === 'zh' ? `${y}年${m}月${day}日` : `${MONTHS[m - 1]} ${day}, ${y}`;
}
