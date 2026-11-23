// Pure helpers shared by the build (Node) and the site (browser). No Node imports here.

/** Same behavior as the prototype's titleFromName. */
export const titleFromName = (name: string): string =>
  name.replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled";

/** Same behavior as the prototype's slug. */
export const slug = (s: string): string =>
  (s || "topic").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "topic";

/** A ## to #### heading that ends with a [[n,…]] source marker. */
export const MARKER_LINE = /^(#{2,4}\s+.*?)\s*\[\[([\d,\s]*)\]\]\s*$/;

export interface MarkerUse {
  /** 1-based line number in the body. */
  line: number;
  heading: string;
  /** Unique source numbers in first-seen order. Non-numeric parts are dropped. */
  refs: number[];
}

/** Every heading marker in a topic body. */
export function sourceMarkers(body: string): MarkerUse[] {
  const out: MarkerUse[] = [];
  (body || "").split("\n").forEach((text, i) => {
    const m = text.match(MARKER_LINE);
    if (!m) return;
    const refs = [...new Set(m[2].split(",").map(x => parseInt(x, 10)).filter(x => !Number.isNaN(x)))];
    out.push({ line: i + 1, heading: m[1], refs });
  });
  return out;
}

/** Headings (## to ####) that have no marker. Used for a warning only. */
export function unmarkedHeadings(body: string): number[] {
  const lines: number[] = [];
  let fence = false;
  (body || "").split("\n").forEach((text, i) => {
    if (/^\s*(```|~~~)/.test(text)) fence = !fence;
    if (!fence && /^#{2,3}\s+/.test(text) && !MARKER_LINE.test(text)) lines.push(i + 1);
  });
  return lines;
}
