# Jeff Reflecting Christ / 辉映基督

A bilingual blog (Chinese at `/`, English at `/en/`) built with Astro.

## Adding a post

Write and publish in Substack. The site reads both Substacks and shows the posts:

- Chinese posts: `huiyingjidu.substack.com` (shown at `/`)
- English posts: `jeffreflectingchrist.substack.com` (shown at `/en/`)

In Substack, add a tag to choose the category: `灵修` or `文章` (Chinese), `devotion` or `article` (English).
A post with no matching tag is shown under Articles. Free posts only; paid posts are skipped.
The two languages are separate and are not linked as translations.

New posts appear on the site a few minutes after you publish them in Substack.

How that works (and why):
- The website is built (not live), and Cloudflare Pages does the building. Substack turns away GitHub's servers and Cloudflare's live servers, but not Cloudflare's builder, so only Cloudflare builds can read the posts.
- `tools/substack-watcher.gs` runs in Google Apps Script every 5 minutes. It looks at both Substacks. When a post is new or edited it calls the Cloudflare deploy hook (a private address that starts a rebuild), then checks that the post is on the site. It asks again if not, emails the owner if it still fails, and rebuilds at least once a day as a backstop.
- If a build cannot read Substack at all, it stops, so the live site keeps its current posts instead of being replaced by an empty one.
- `/build-report.txt` on the site shows what Substack answered during the last build.
- The GitHub Pages copy cannot read Substack, so it does not show posts. Cloudflare is the real site.
Cloudflare Pages also needs a deploy hook: in Cloudflare Pages, Settings, Builds, add a deploy hook,
then in GitHub (repo Settings, Secrets and variables, Actions) save its address as `CLOUDFLARE_DEPLOY_HOOK`.

## Settings

- `src/config.ts`: the two Substack names, the tag names, and the contact email.
- `src/content/pages/zh/about.md` and `src/content/pages/en/about.md`: the About pages.
- `src/i18n.ts`: menu words, welcome note and other fixed text for both languages.

## Cloudflare Pages build settings

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`

## GitHub Pages

In the repo, go to Settings, then Pages, and set Source to GitHub Actions. The workflow in `.github/workflows/deploy.yml` does the rest.

## Run locally

```
npm install
npm run dev
```
