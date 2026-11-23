// Node only: loads and validates content/ at build time. Never import from browser code.
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { gitAddedDates } from "./gitDates.ts";
import { sourceMarkers, unmarkedHeadings } from "./markdown.ts";
import type { Issue, Library, Note, Topic, Validation } from "./types.ts";

const NOTE_EXT = /\.(md|markdown|txt)$/i;
const TOPIC_EXT = /\.md$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class FrontmatterError extends Error {}

/** Split a leading `---` YAML block from the body. Returns data = {} when there is none. */
export function parseFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const m = src.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return { data: {}, body: src };
  let data: unknown;
  try {
    data = parseYaml(m[1]) ?? {};
  } catch (e) {
    throw new FrontmatterError(`frontmatter isn't valid YAML: ${(e as Error).message.split("\n")[0]}`);
  }
  if (typeof data !== "object" || Array.isArray(data)) throw new FrontmatterError("frontmatter must be a YAML mapping");
  return { data: data as Record<string, unknown>, body: src.slice(m[0].length) };
}

/** YAML turns `2026-11-23` into a Date; normalize to YYYY-MM-DD or keep the raw string. */
function toDateString(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

const listFiles = (dir: string, ext: RegExp): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile() && ext.test(d.name)).map(d => d.name).sort()
    : [];

export interface LoadResult {
  library: Library;
  validation: Validation;
}

/**
 * Read `<dir>/notes` and `<dir>/topics`, then validate.
 * Topics with fatal frontmatter problems are left out of the library and reported as errors.
 */
export function loadLibrary(dir: string, opts: { gitDates?: boolean } = {}): LoadResult {
  const abs = path.resolve(dir);
  // realpath so keys match the paths git reports (e.g. macOS /var -> /private/var).
  const root = fs.existsSync(abs) ? fs.realpathSync(abs) : abs;
  const notesDir = path.join(root, "notes");
  const topicsDir = path.join(root, "topics");
  const errors: Issue[] = [];
  const dates = opts.gitDates === false ? new Map<string, string>() : gitAddedDates(root);

  const notes: Note[] = listFiles(notesDir, NOTE_EXT).map(name => ({
    name,
    content: fs.readFileSync(path.join(notesDir, name), "utf8"),
    addedAt: dates.get(path.join(notesDir, name)) ?? null,
    topicSlug: null,
  }));

  const topics: Topic[] = [];
  for (const file of listFiles(topicsDir, TOPIC_EXT)) {
    const rel = `topics/${file}`;
    let parsed;
    try {
      parsed = parseFrontmatter(fs.readFileSync(path.join(topicsDir, file), "utf8"));
    } catch (e) {
      errors.push({ file: rel, message: (e as Error).message });
      continue;
    }
    const { data, body } = parsed;
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const sources = data.sources;
    if (!title) errors.push({ file: rel, message: "missing `title` in frontmatter" });
    if (!Array.isArray(sources) || !sources.length || !sources.every(s => typeof s === "string" && s.trim())) {
      errors.push({ file: rel, message: "`sources` must be a non-empty list of note filenames" });
      continue;
    }
    if (!title) continue;
    topics.push({
      slug: file.replace(TOPIC_EXT, ""),
      title,
      summary: typeof data.summary === "string" ? data.summary.trim() : "",
      updated: toDateString(data.updated),
      sources: (sources as string[]).map(s => s.trim()),
      markdown: body.trim(),
    });
  }

  topics.sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? "") || a.title.localeCompare(b.title));
  const library: Library = { topics, notes };
  const v = validate(library);
  return { library, validation: { errors: [...errors, ...v.errors], warnings: v.warnings } };
}

/** Cross-file checks. Also fills in note.topicSlug. */
export function validate(library: Library): Validation {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const byName = new Map(library.notes.map(n => [n.name, n]));
  const owner = new Map<string, string>();

  for (const t of library.topics) {
    const rel = `topics/${t.slug}.md`;
    if (t.updated && !DATE.test(t.updated)) errors.push({ file: rel, message: `\`updated\` must be YYYY-MM-DD, got "${t.updated}"` });

    const seen = new Set<string>();
    for (const s of t.sources) {
      if (seen.has(s)) { errors.push({ file: rel, message: `source "${s}" is listed twice` }); continue; }
      seen.add(s);
      const note = byName.get(s);
      if (!note) { errors.push({ file: rel, message: `source "${s}" not found in notes/` }); continue; }
      const prev = owner.get(s);
      if (prev) { errors.push({ file: rel, message: `note "${s}" is already a source of topics/${prev}.md; a note belongs to one topic` }); continue; }
      owner.set(s, t.slug);
      note.topicSlug = t.slug;
      if (note.addedAt && t.updated && DATE.test(t.updated) && note.addedAt > t.updated)
        warnings.push({ file: rel, message: `notes changed since this page was written: "${s}" was added ${note.addedAt}, page updated ${t.updated}` });
    }

    for (const m of sourceMarkers(t.markdown)) {
      const bad = m.refs.filter(n => n < 1 || n > t.sources.length);
      if (bad.length) errors.push({ file: rel, message: `body line ${m.line}: marker [[${bad.join(",")}]] is out of range (topic has ${t.sources.length} source${t.sources.length === 1 ? "" : "s"})` });
    }
    if (/^#\s/m.test(t.markdown.replace(/^(```|~~~)[\s\S]*?^\1/gm, "")))
      warnings.push({ file: rel, message: "body has a # heading; use ## and ### (the title comes from frontmatter)" });
    const unmarked = unmarkedHeadings(t.markdown);
    if (unmarked.length) warnings.push({ file: rel, message: `heading${unmarked.length > 1 ? "s" : ""} without a [[n]] source marker on body line ${unmarked.join(", ")}` });
  }

  const unsorted = library.notes.filter(n => !owner.has(n.name));
  for (const n of unsorted) warnings.push({ file: `notes/${n.name}`, message: "unsorted note: not a source of any topic" });

  return { errors, warnings };
}
