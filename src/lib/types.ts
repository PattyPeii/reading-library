export interface Note {
  /** Filename inside content/notes, e.g. "caching-notes.md". Unique. */
  name: string;
  content: string;
  /** ISO date (YYYY-MM-DD) of the commit that added the note, or null if unknown. */
  addedAt: string | null;
  /** Slug of the topic that lists this note, or null if unsorted. */
  topicSlug: string | null;
}

export interface Topic {
  /** Filename without extension, e.g. "http-caching". */
  slug: string;
  title: string;
  summary: string;
  /** YYYY-MM-DD, or null if not given. */
  updated: string | null;
  /** Note filenames, numbered 1..n in this order by the [[n]] markers. */
  sources: string[];
  /** Markdown body, markers still present. */
  markdown: string;
}

export interface Library {
  /** Sorted by updated desc, then title. */
  topics: Topic[];
  /** Sorted by name. */
  notes: Note[];
}

export interface Issue {
  file: string;
  message: string;
}

export interface Validation {
  errors: Issue[];
  warnings: Issue[];
}
