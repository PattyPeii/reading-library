// Usage: tsx scripts/check.ts [content-dir]   (default: content)
// Prints errors and warnings; exits 1 if there are errors.
import { loadLibrary } from "../src/lib/content.ts";
import type { Issue } from "../src/lib/types.ts";

const dir = process.argv[2] ?? "content";
const { library, validation } = loadLibrary(dir);
const { errors, warnings } = validation;
const fmt = (i: Issue) => `  ${i.file}: ${i.message}`;

console.log(`${dir}: ${library.topics.length} topic${library.topics.length === 1 ? "" : "s"}, ${library.notes.length} note${library.notes.length === 1 ? "" : "s"}`);
if (warnings.length) console.log(`\n${warnings.length} warning${warnings.length === 1 ? "" : "s"}:\n${warnings.map(fmt).join("\n")}`);
if (errors.length) {
  console.error(`\n${errors.length} error${errors.length === 1 ? "" : "s"}:\n${errors.map(fmt).join("\n")}`);
  process.exit(1);
}
console.log("\nContent OK.");
