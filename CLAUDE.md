# Reading Library

Static, read-only site on GitHub Pages that shows merged, printable English topic pages built from .md reading notes. No server, and no AI at runtime or build time.

## Source of truth
- docs/SPEC.md is the spec. If code and spec disagree, ask before changing either.
- docs/prototype.html is the visual and behavioral reference. Match its layout, tokens, copy and print rules. Its upload, AI-writing and editing features are out of scope (see SPEC.md).

## How to work
- Build one phase from SPEC.md "Implementation plan" at a time. Stop at the end of each phase and report.
- Before writing code for a phase, show a short plan: files to create or change, and how you will verify the "Done when" criteria.
- When asked to add, sort, move or remove notes, follow .claude/skills/add-notes/SKILL.md. Never edit files in content/notes/ unless asked.
- Don't push or create the GitHub repo without being asked.

## Commands
- Install: npm install
- Tests: npm test
- Validate content: npm run check  (or: npx tsx scripts/check.ts <content-dir>)
- Dev server: npm run dev
- Build: npm run build  (runs check first; output in dist/)

## Conventions
- React + Vite + TypeScript at the repo root. No UI framework; plain CSS with the tokens from the prototype.
- Content is loaded at build time via the `virtual:library` Vite module, so the site makes no runtime fetches.
- Node-only code (fs, git) lives in src/lib/content.ts and src/lib/gitDates.ts. Never import those from browser code.
- UI copy in English, sentence case.
- Commit at the end of each phase: "phase N: <summary>".
