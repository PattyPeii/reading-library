// Node only. Reads the date each file was first added to git.
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Map of absolute file path -> YYYY-MM-DD of the commit that added it.
 * Files that aren't committed (or no git / shallow history) are simply absent.
 */
export function gitAddedDates(dir: string): Map<string, string> {
  const dates = new Map<string, string>();
  let root: string;
  let out: string;
  try {
    root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    // Newest first; walking it and overwriting leaves the oldest "added" date per file.
    out = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--format=@%cs", "--name-only", "--", "."],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch {
    return dates;
  }
  let current = "";
  for (const line of out.split("\n")) {
    if (line.startsWith("@")) current = line.slice(1).trim();
    else if (line.trim() && current) dates.set(path.resolve(root, line.trim()), current);
  }
  return dates;
}
