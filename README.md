# Jeff Reflecting Christ / 辉映基督

A bilingual blog (Chinese at `/`, English at `/en/`) built with Astro.

## Adding a post

Create a Markdown file in `src/content/posts/zh/` (Chinese) or `src/content/posts/en/` (English).
Use an English file name with dashes, for example `grace-enough.md`.
If the same file name exists in both folders, the language button on that post jumps to its translation.

```md
---
title: Your title
date: 2026-10-20
category: devotion        # devotion or article
summary: One or two lines shown on the list pages.
cover: illustration       # optional: 'illustration' or an image path like /images/photo.jpg
draft: false              # optional: true hides the post
---

Your text here.
```

Commit the file to `main`. Cloudflare Pages and GitHub Pages rebuild automatically.

## Settings

- `src/config.ts`: your Substack address and contact email.
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
