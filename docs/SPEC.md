# Reading Library spec

## Product
A static, read-only reading library. Notes and merged topic pages are Markdown files in this repo. On every push to `main`, a GitHub Actions workflow builds a React + Vite + TypeScript site and deploys it to GitHub Pages.

The layout, tokens, copy, dark mode, mobile behavior and print rules follow `docs/prototype.html`. The prototype's server- and LLM-dependent features are **out of scope**: upload, drag-drop, automatic sorting and writing, live streaming, Rewrite page, Move to…, Remove, busy/"Writing…" states, the truncated notice, and Claude error toasts. The site never calls an AI model, and neither does the build.

## Content format
```
content/
  notes/<any-name>.md        raw notes, flat folder, filenames unique. Never edited after commit
  topics/<slug>.md           one merged article per topic; the filename (without .md) is the slug
```
Notes may be `.md`, `.markdown` or `.txt`.

Topic file:
```md
---
title: How HTTP caching works
summary: One sentence saying what the page covers.
updated: 2026-11-23
sources:            # note filenames, numbered 1..n in this order
  - caching-notes.md
  - cdn-reading.md
---
## Cache headers [[1,2]]
...
```
- `title` and `sources` are required. `summary` and `updated` (YYYY-MM-DD) are optional.
- Body rules (from the prototype's synthesize prompt):
  - Use `##` for sections and `###` for subsections. No `#` heading in the body.
  - Every `##` and `###` heading ends with `[[n,…]]`, pointing at positions in `sources`.
  - Never mention notes, files or the author in the text.
- A note's "added" date is the date of the git commit that added it. The build reads it with `git log --diff-filter=A`; if git history is unavailable the date is null.

## Build-time validation
This runs as `npm run check` and also as part of `npm run build`.

The build **fails** when:
- a topic is missing `title` or `sources`, or has malformed frontmatter;
- a source isn't found in `content/notes/`;
- a note is listed by more than one topic, or twice in the same topic;
- `updated` is present but not YYYY-MM-DD;
- a `[[n]]` marker is out of range (n < 1 or n > number of sources).

The build **warns**, listing filenames, when:
- a note isn't in any topic ("unsorted notes"), which is the to-do list for the next Claude Code session;
- a note was added in a commit newer than its topic's `updated` date ("notes changed since this page was written");
- a `##`/`###` heading has no `[[n]]` marker, or the body has a `#` heading.

## Site features
- **Sidebar:**
  - "N topics from M notes" count
  - "Find a topic" search over title and summary
  - topic list sorted by `updated` desc, showing "N notes, updated <date>"
  - a Download all link
- **Article:**
  - title with the highlight mark, and the summary as an italic lede
  - body rendered by `marked` + `DOMPurify`
  - heading markers turned into "From a.md, c.md" lines, which are hidden in print
- **Sources panel:** "Built from N notes (not printed)". Each note shows its name, added date, and a View/Hide toggle for the raw text.
- **Toolbar:** Topics back button (mobile only), Print, and Download HTML. Both downloads are built in the browser as a Blob using the prototype's `PRINT_CSS`. Download all sorts topics by title and adds a TOC and page breaks. Downloads strip the `[[n]]` markers.
- **Empty states:**
  - Sidebar with no topics: "No topics yet"
  - Main area with no topic selected: "Pick a topic"
  - Search with no hits: "No topics match."
- **Routing:** hash routes (`#/t/<slug>`) so deep links work on GitHub Pages, and Vite `base: './'` so the repo name doesn't matter.

## Adding notes (Claude Code workflow)
The project skill `.claude/skills/add-notes/SKILL.md` holds the prototype's classify and synthesize rules. Steps:
1. The user commits or copies new notes into `content/notes/`.
2. In a Claude Code session, the user asks to add or sort the notes. Claude runs `npm run check` to list the unsorted notes.
3. Claude puts each note into an existing topic only if the two would read naturally as one article. Otherwise it creates a new topic, and new notes on the same subject share one new topic.
4. Claude rewrites each affected topic page from all of its sources and sets `updated` to today.
5. Claude runs `npm run check` and stops so the user can review and commit.

Moving or removing a note is done the same way, by asking in a session. The site has no editing UI.

## Implementation plan

### Phase 1: Content pipeline
Project scaffold, content format, loader and validator, the add-notes skill, and tests.

Done when:
1. `npm test` (vitest) passes.
2. `npm run check` passes on valid fixtures and fails with a clear message on each invalid fixture.
3. The loader outputs a typed library (topics + notes + dates) from `content/`.
4. The skill file exists and covers both prompt rule sets.

### Phase 2: Reading UI
Everything under Site features except downloads.

Done when:
- it matches the prototype at desktop and 375px widths, in light and dark;
- print preview hides the chrome and the source lines;
- deep links (`#/t/<slug>`) open the right topic.

### Phase 3: Export and deploy
Download HTML and Download all, the GitHub Pages workflow (`actions/deploy-pages`, with `fetch-depth: 0` so dates work), and a README covering setup and enabling Pages.

Done when:
- downloaded HTML has no `[[n]]` markers;
- a push to `main` deploys and the live URL works, deep links included.
