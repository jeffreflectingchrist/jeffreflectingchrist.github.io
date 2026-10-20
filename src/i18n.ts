import settings from './data/site.json';

export type Lang = 'zh' | 'en';

// Wording that the owner can change in the admin lives in src/data/site.json.
// The fixed words below are used when a setting is missing.
const base = {
  zh: {
    siteName: '辉映基督',
    tagline: '默想基督的荣耀，反映基督的光辉',
    description: '圣经灵修与文章，写给在日常中寻求神的人。',
    htmlLang: 'zh-Hans',
    otherHtmlLang: 'en',
    navLabel: '主导航',
    switchLabel: 'English',
    menu: '菜单',
    themeToggle: '切换明暗模式',
    readMore: '继续阅读 →',
    readTime: (n: number) => `${n} 分钟阅读`,
    welcome: '欢迎来到辉映基督。这里的默想是为你而写，愿你在日常生活中反映基督的荣耀。',
    author: '杰辉',
    subscribeTitle: '订阅',
    subscribeBlurb: '新的灵修与文章发布时，寄到你的邮箱。',
    subscribeButton: '订阅',
    subscribeSoon: '订阅功能即将开放。',
    emailPlaceholder: '你的邮箱',
    contactTitle: '联系',
    contactBlurb: '有问题，或想交流，欢迎来信。',
    article: '文章',
    allArticles: '全部文章',
    latest: '最新文章',
    backTo: '← 返回文章',
    empty: '这里还没有内容。',
    supportTitle: '奉献支持',
    supportText: '若这些资源对你有帮助，欢迎支持我们以便帮助更多人。',
    supportButton: '奉献 →',
    menuTools: '工具',
    menuArticles: '文章',
    menuAbout: '关于',
    menuSubscribe: '订阅',
    tools: [] as { label: string; url: string }[],
  },
  en: {
    siteName: 'Jeff Reflecting Christ',
    tagline: 'Reflecting on Christ to reflect Christ',
    description: 'Bible devotions and articles for people seeking God in everyday life.',
    htmlLang: 'en',
    otherHtmlLang: 'zh-Hans',
    navLabel: 'Main navigation',
    switchLabel: '中文',
    menu: 'Menu',
    themeToggle: 'Toggle light and dark mode',
    readMore: 'Continue reading →',
    readTime: (n: number) => `${n} min read`,
    welcome:
      'Welcome to jeffreflectingchrist. These reflections are written for you as you seek to reflect Christ in everyday life.',
    author: 'Jeff',
    subscribeTitle: 'Subscribe',
    subscribeBlurb: 'Get new devotions and articles by email.',
    subscribeButton: 'Subscribe',
    subscribeSoon: 'Subscriptions are opening soon.',
    emailPlaceholder: 'Your email',
    contactTitle: 'Contact',
    contactBlurb: 'Questions, or just want to talk? Write to me.',
    article: 'Article',
    allArticles: 'All articles',
    latest: 'Latest articles',
    backTo: '← Back to articles',
    empty: 'Nothing here yet.',
    supportTitle: 'Support',
    supportText: 'If these resources have helped you, you can support it here to help them reach more people.',
    supportButton: 'Give →',
    menuTools: 'TOOLS',
    menuArticles: 'ARTICLES',
    menuAbout: 'ABOUT',
    menuSubscribe: 'SUBSCRIBE',
    tools: [] as { label: string; url: string }[],
  },
};

// Empty boxes in the admin fall back to the fixed words above.
function merge<T extends Record<string, any>>(fixed: T, edited: Record<string, any> = {}): T {
  const out: Record<string, any> = { ...fixed };
  for (const [k, v] of Object.entries(edited)) {
    if (Array.isArray(v)) out[k] = v.filter((x) => x && x.label && x.url);
    else if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return out as T;
}

const zh = merge(base.zh, (settings as any).zh);
const en = merge(base.en, (settings as any).en);

export const ui = {
  zh: { ...zh, copyright: `© ${zh.siteName}` },
  en: { ...en, copyright: `© ${en.siteName}` },
};

export const paths = {
  zh: {
    home: '/',
    articles: '/articles/',
    topic: (id: string) => `/articles/${id}/`,
    about: '/about/',
    subscribe: '/subscribe/',
    post: (slug: string) => `/posts/${slug}/`,
    rss: '/rss.xml',
  },
  en: {
    home: '/en/',
    articles: '/en/articles/',
    topic: (id: string) => `/en/articles/${id}/`,
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
