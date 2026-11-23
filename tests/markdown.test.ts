import { describe, expect, it } from "vitest";
import { slug, sourceMarkers, titleFromName, unmarkedHeadings } from "../src/lib/markdown.ts";

describe("titleFromName (prototype behavior)", () => {
  it("drops the extension and turns dashes and underscores into spaces", () => {
    expect(titleFromName("http-caching_notes.md")).toBe("http caching notes");
    expect(titleFromName("Ideas.MARKDOWN")).toBe("Ideas");
    expect(titleFromName("chapter--1.txt")).toBe("chapter 1");
  });
  it("falls back to Untitled", () => {
    expect(titleFromName(".md")).toBe("Untitled");
    expect(titleFromName("__.md")).toBe("Untitled");
  });
});

describe("slug (prototype behavior)", () => {
  it("lowercases and joins with dashes", () => {
    expect(slug("How HTTP Caching Works!")).toBe("how-http-caching-works");
  });
  it("caps length at 60 and falls back to topic", () => {
    expect(slug("a".repeat(80))).toHaveLength(60);
    expect(slug("")).toBe("topic");
    expect(slug("ไทย")).toBe("topic");
  });
});

describe("sourceMarkers", () => {
  it("finds markers on ## to #### headings, dedups refs and keeps order", () => {
    const body = "## One [[1]]\ntext [[2]]\n### Two [[3, 1,1 ,3]]\n#### Three [[]]\n# Not counted [[1]]";
    expect(sourceMarkers(body)).toEqual([
      { line: 1, heading: "## One", refs: [1] },
      { line: 3, heading: "### Two", refs: [3, 1] },
      { line: 4, heading: "#### Three", refs: [] },
    ]);
  });
  it("ignores a marker that isn't at the end of the heading", () => {
    expect(sourceMarkers("## A [[1]] and more")).toEqual([]);
  });
});

describe("unmarkedHeadings", () => {
  it("reports ## and ### headings without markers, skipping code fences", () => {
    const body = "## Marked [[1]]\n## Unmarked\n```\n## inside fence\n```\n### Also unmarked\n#### h4 is optional";
    expect(unmarkedHeadings(body)).toEqual([2, 6]);
  });
});
