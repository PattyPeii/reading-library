---
name: add-notes
description: Sort new reading notes in content/notes into topics and write or update the merged English topic pages in content/topics. Use when the user asks to add, sort, organize, merge, move or remove notes, rewrite a topic page, or fix unsorted-note / stale-page warnings from npm run check.
---

# Add notes to the Reading Library

The site is static. A topic page exists only if a file in `content/topics/` describes it. Your job is to produce those files from the raw notes, following the rules below. These rules are carried over from the classify and synthesize prompts in `docs/prototype.html`. The format is defined in `docs/SPEC.md`.

## 1. Find the work
Run `npm run check`. Then:
- **Unsorted notes** are the notes to classify.
- **Notes changed since this page was written** are the pages to rewrite.
- **Errors** must be fixed before anything else.

If the user named specific notes or a topic, work on those only.

Never edit, rename or delete files in `content/notes/` unless the user explicitly asks. Notes are the user's originals.

## 2. Sort notes into topics (classify rules)
Each topic becomes one article. For each new note, read it and compare it with every existing topic's `title` and `summary`, and with its source notes if that's unclear.
- Put a note in an existing topic only if it covers substantially the same subject, so the two would read naturally as one article.
- Otherwise give it a new topic. New notes about the same subject as each other share one new topic.
- New topic titles are short, specific and in English.
- A note belongs to exactly one topic.
- A new topic's filename is `slug(title).md`: lowercase, runs of non `a-z0-9` replaced by `-`, at most 60 characters. Use the same rule as `slug()` in `src/lib/markdown.ts`. If that file already exists, add `-2`.

Before writing, tell the user which note goes to which topic in one short list. If a placement is a genuine judgment call, say so.

## 3. Write each affected topic page (synthesize rules)
Write the page from all of the topic's sources (existing plus new), not only the new note. Order `sources` with existing sources first, in their current order, then new notes. This keeps old `[[n]]` numbers stable.

How to write it:
- Turn the notes into a single well-organized article in English that reads smoothly from start to finish.
- Rewrite and reorganize; don't stitch notes end to end. Merge overlapping points and remove repetition.
- Keep every substantive idea, fact, number, definition, example and reference from the notes. Don't add facts that aren't in the notes.
- Where notes disagree, say so in the text.
- Translate any non-English content into English, keeping proper names and technical terms accurate.
- Use Markdown: `##` for sections, `###` for subsections, and lists, tables and code blocks only where they help. No `#` heading in the body; the title comes from frontmatter.
- End every `##` and `###` heading line with the numbers of the notes that section draws on, in double brackets, for example `## How caching works [[1,3]]`. The numbers are 1-based positions in `sources`.
- Don't mention notes, files or the author in the article text.

File format:
```md
---
title: <short, specific title>
summary: <one sentence saying what the page covers>
updated: <today, YYYY-MM-DD>
sources:
  - first-note.md
  - second-note.md
---
## First section [[1,2]]
...
```

## 4. Moving or removing a note
- **Move:** take the note out of the old topic's `sources` and add it to the target topic (or a new one). Rewrite both pages from their remaining sources, renumbering the markers.
- **Remove a note from a topic:** take it out of `sources` and rewrite the page. If the topic has no sources left, delete the topic file.
- **Delete a note entirely:** only if the user asks for it. Do the step above, then delete the note file.

## 5. Finish
Run `npm run check` again. It must report no errors, and no unsorted notes among the ones you handled. Then stop and summarize for the user:
- which topics were created and which were updated;
- any disagreements you wrote into the text;
- anything you weren't sure about.

Don't commit. The user reviews and commits.
