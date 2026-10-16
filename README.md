# Jeff Reflecting Christ / 辉映基督

A bilingual blog (Chinese at `/`, English at `/en/`) built with Astro.

## Adding a post

Write and publish in Substack. The site reads both Substacks and shows the posts:

- Chinese posts: `huiyingjidu.substack.com` (shown at `/`)
- English posts: `jeffreflectingchrist.substack.com` (shown at `/en/`)

In Substack, add a tag to choose the category: `灵修` or `文章` (Chinese), `devotion` or `article` (English).
A post with no matching tag is shown under Articles. Free posts only; paid posts are skipped.
The two languages are separate and are not linked as translations.

New posts appear on the site within about an hour (GitHub Actions rebuilds on a schedule).
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
