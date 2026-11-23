# Reading Library

A static, read-only site that shows merged, printable English topic pages built from Markdown reading notes. See `docs/SPEC.md`.

## Setup

```sh
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run check    # validate content/
npm run build    # check + typecheck + build into dist/
```

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the site and deploys it on every push to `main` (it can also be run by hand from the Actions tab).

One-time setup:
1. On GitHub, open the repo's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow from the Actions tab).

The site is then live at `https://<user>.github.io/<repo>/`. It uses hash routes (`#/t/<slug>`) and a relative base, so deep links work and the repo name doesn't matter.

## Adding notes

Put notes in `content/notes/`, then ask Claude Code to sort them (see `.claude/skills/add-notes/SKILL.md`).
