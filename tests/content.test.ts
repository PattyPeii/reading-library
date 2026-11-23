import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadLibrary, parseFrontmatter, validate } from "../src/lib/content.ts";
import type { Library } from "../src/lib/types.ts";

const fx = (name: string) => path.join(__dirname, "fixtures", name);
const load = (name: string) => loadLibrary(fx(name), { gitDates: false });
const messages = (issues: { file: string; message: string }[]) => issues.map(i => `${i.file}: ${i.message}`);

describe("parseFrontmatter", () => {
  it("splits YAML from the body and normalizes CRLF and BOM", () => {
    const { data, body } = parseFrontmatter("﻿---\r\ntitle: Hi\r\nsources: [a.md]\r\n---\r\n## Body [[1]]\r\n");
    expect(data).toEqual({ title: "Hi", sources: ["a.md"] });
    expect(body).toBe("## Body [[1]]\n");
  });
  it("returns empty data when there is no frontmatter", () => {
    expect(parseFrontmatter("## Just body")).toEqual({ data: {}, body: "## Just body" });
  });
  it("throws on invalid YAML and on non-mapping YAML", () => {
    expect(() => parseFrontmatter("---\ntitle: [x\n---\n")).toThrow(/isn't valid YAML/);
    expect(() => parseFrontmatter("---\n- a\n---\n")).toThrow(/must be a YAML mapping/);
  });
});

describe("loadLibrary on the valid fixture", () => {
  const { library, validation } = load("valid");

  it("has no errors", () => {
    expect(validation.errors).toEqual([]);
  });

  it("orders topics by updated desc and parses fields", () => {
    expect(library.topics.map(t => t.slug)).toEqual(["sleep", "http-caching"]);
    const http = library.topics[1];
    expect(http).toMatchObject({
      title: "How HTTP caching works",
      summary: "Freshness, revalidation and where caches live.",
      updated: "2026-11-20",
      sources: ["caching-notes.md", "cdn_reading.md"],
    });
    expect(http.markdown.startsWith("## Freshness [[1]]")).toBe(true);
    expect(library.topics[0].summary).toBe("");
  });

  it("loads .md and .txt notes, sorted, and links them to their topic", () => {
    expect(library.notes.map(n => [n.name, n.topicSlug])).toEqual([
      ["caching-notes.md", "http-caching"],
      ["cdn_reading.md", "http-caching"],
      ["sleep-chapter-1.txt", "sleep"],
      ["unsorted-idea.md", null],
    ]);
    expect(library.notes[2].content).toBe("Adults need 7 to 9 hours of sleep.\n");
  });

  it("every source resolves to a note", () => {
    const names = new Set(library.notes.map(n => n.name));
    for (const t of library.topics) for (const s of t.sources) expect(names.has(s)).toBe(true);
  });

  it("warns about the unsorted note only (fenced # line is not a heading)", () => {
    expect(messages(validation.warnings)).toEqual(["notes/unsorted-idea.md: unsorted note: not a source of any topic"]);
  });

  it("dates are null without git", () => {
    expect(library.notes.every(n => n.addedAt === null)).toBe(true);
  });
});

describe("invalid fixtures fail with a clear message", () => {
  it.each([
    ["missing-source", ['topics/t.md: source "ghost.md" not found in notes/']],
    ["dup-note", ['topics/second.md: note "shared.md" is already a source of topics/first.md; a note belongs to one topic']],
    ["bad-marker", [
      "topics/t.md: body line 3: marker [[3]] is out of range (topic has 1 source)",
      "topics/t.md: body line 5: marker [[0]] is out of range (topic has 1 source)",
    ]],
    ["no-title", ["topics/t.md: missing `title` in frontmatter"]],
  ])("%s", (name, expected) => {
    expect(messages(load(name).validation.errors)).toEqual(expected);
  });

  it("bad-yaml", () => {
    const errs = messages(load("bad-yaml").validation.errors);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/^topics\/t\.md: frontmatter isn't valid YAML/);
  });
});

describe("validate edge cases", () => {
  const lib = (over: Partial<Library["topics"][0]>, addedAt: string | null = null): Library => ({
    notes: [{ name: "a.md", content: "a", addedAt, topicSlug: null }],
    topics: [{ slug: "t", title: "T", summary: "", updated: "2026-11-01", sources: ["a.md"], markdown: "## A [[1]]", ...over }],
  });

  it("warns when a note was added after the page was updated", () => {
    expect(messages(validate(lib({}, "2026-11-05")).warnings)).toEqual([
      'topics/t.md: notes changed since this page was written: "a.md" was added 2026-11-05, page updated 2026-11-01',
    ]);
    expect(validate(lib({}, "2026-11-01")).warnings).toEqual([]);
  });

  it("errors on a bad updated date and a source listed twice", () => {
    expect(messages(validate(lib({ updated: "Nov 1", sources: ["a.md", "a.md"] })).errors)).toEqual([
      'topics/t.md: `updated` must be YYYY-MM-DD, got "Nov 1"',
      'topics/t.md: source "a.md" is listed twice',
    ]);
  });

  it("warns on a # heading and on headings without markers", () => {
    expect(messages(validate(lib({ markdown: "# Big\n## A [[1]]\n## B" })).warnings)).toEqual([
      "topics/t.md: body has a # heading; use ## and ### (the title comes from frontmatter)",
      "topics/t.md: heading without a [[n]] source marker on body line 3",
    ]);
  });

  it("errors when sources is missing or empty", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rl-"));
    fs.mkdirSync(path.join(dir, "topics"));
    fs.writeFileSync(path.join(dir, "topics", "x.md"), "---\ntitle: X\nsources: []\n---\n");
    expect(messages(loadLibrary(dir, { gitDates: false }).validation.errors)).toEqual([
      "topics/x.md: `sources` must be a non-empty list of note filenames",
    ]);
  });
});

describe("git added dates", () => {
  it("uses the date of the commit that added each note; uncommitted notes stay null", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rl-git-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
    fs.mkdirSync(path.join(dir, "content", "notes"), { recursive: true });
    fs.writeFileSync(path.join(dir, "content", "notes", "old.md"), "v1");
    git("init", "-q");
    git("-c", "user.email=t@example.com", "-c", "user.name=t", "add", ".");
    execFileSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "add"], {
      cwd: dir, stdio: "ignore", env: { ...process.env, GIT_COMMITTER_DATE: "2026-01-02T10:00:00Z", GIT_AUTHOR_DATE: "2026-01-02T10:00:00Z" },
    });
    // A later edit must not change the "added" date.
    fs.writeFileSync(path.join(dir, "content", "notes", "old.md"), "v2");
    execFileSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qam", "edit"], {
      cwd: dir, stdio: "ignore", env: { ...process.env, GIT_COMMITTER_DATE: "2026-03-04T10:00:00Z", GIT_AUTHOR_DATE: "2026-03-04T10:00:00Z" },
    });
    fs.writeFileSync(path.join(dir, "content", "notes", "new.md"), "not committed");

    const { library } = loadLibrary(path.join(dir, "content"));
    expect(Object.fromEntries(library.notes.map(n => [n.name, n.addedAt]))).toEqual({ "new.md": null, "old.md": "2026-01-02" });
  });
});
