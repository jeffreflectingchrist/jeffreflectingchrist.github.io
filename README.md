# Jeff Reflecting Christ / 辉映基督

A bilingual blog (Chinese at `/`, English at `/en/`) built with Astro.

## Adding a post

Write and publish in Substack. The site reads both Substacks and shows the posts:

- Chinese posts: `huiyingjidu.substack.com` (shown at `/`)
- English posts: `jeffreflectingchrist.substack.com` (shown at `/en/`)

All posts are Articles (the Devotions section was removed on 2026-10-21; old /devotions links redirect to /articles).
To put a Substack post in a category, give it a Substack tag with the same name as the category (Chinese or English name).
Free posts only; paid posts are skipped.
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

## Admin (Pages CMS)

Go to https://jeffreflectingchrist.pages.dev/admin (it forwards to https://app.pagescms.org) and sign in with GitHub.
The admin is set up by `.pages.yml`. In it you can:

- write, edit and delete articles (中文文章 / English articles), with a cover picture, category and Draft switch;
- make categories (文章类别). Each category appears under the Articles menu and gets its own page at `/articles/<english-name>/`;
- edit both About pages;
- edit the menu names, welcome note, sidebar text and the Tools menu links (网站文字 Site text & menus).

Every save is a GitHub commit, so Cloudflare rebuilds the site (2-4 minutes). Pictures go to `public/images/uploads`.
Files: articles `src/content/articles/zh|en/*.md`, categories `src/content/categories/*.json`, site text `src/data/site.json`.
Substack posts are not in the admin; edit those on Substack. Both kinds show together on the site.

## Settings

- `src/config.ts`: the two Substack names, the tag names, and the contact email.
- `src/content/pages/zh/about.md` and `src/content/pages/en/about.md`: the About pages.
- `src/data/site.json`: menu words, welcome note, sidebar text, Tools menu (edited in the admin).
- `src/i18n.ts`: fallback text used when a box in site.json is empty.

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

## Substack copy page (translation helper)

`public/tools/copy-page.html` is a single self-contained page for preparing a post for Substack without any other tool. After a deploy it is at `https://jeffreflectingchrist.pages.dev/tools/copy-page.html` (not linked from the site and marked noindex). It also works if you download the file and open it in a browser.

- Tabs: English and 中文. Each has a Title box and a Post box with a Copy button; the copy keeps headings, bold, italics and images, so it pastes into the Substack editor with no Markdown symbols.
- Click into the title or post to type or edit. Cmd/Ctrl+Z undoes. "Start new translation" clears the tab. "+ Add Bible passage box" adds a yellow paste box.
- Yellow boxes: copy verses from esv.org (English) or YouVersion RCUVSS 和合本修订版 (Chinese) and paste into the box. Footnote marks are removed and verse numbers become small raised numerals.
- Nothing is saved when the page is reloaded. The page starts blank. Images cannot be pasted in; to include one, drag it into the Post box if your browser allows it, or add it directly in Substack after pasting.
