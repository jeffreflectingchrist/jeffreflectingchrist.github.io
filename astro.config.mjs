import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL lets the GitHub Pages build use its own address.
// On Cloudflare Pages nothing needs to be set.
export default defineConfig({
  site: process.env.SITE_URL || 'https://jeffreflectingchrist.pages.dev',
  integrations: [sitemap()],
});
