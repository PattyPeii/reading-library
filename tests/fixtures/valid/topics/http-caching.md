---
title: How HTTP caching works
summary: Freshness, revalidation and where caches live.
updated: 2026-11-20
sources:
  - caching-notes.md
  - cdn_reading.md
---
## Freshness [[1]]

`Cache-Control: max-age` sets how long a response stays fresh.

## Revalidation and the edge [[2, 1, 2]]

CDNs cache at the edge, and an ETag lets clients revalidate.

```md
# not a heading, inside a fence
```
