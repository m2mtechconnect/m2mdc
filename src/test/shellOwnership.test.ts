/**
 * Stage 6E structural guard: only the canonical shell owner may mount the
 * global application shell (<Layout>). Route pages must render page content
 * only, otherwise the header, navigation and operating-state bar duplicate.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");
const CANONICAL_OWNERS = ["src/AuthenticatedShell.tsx", "src/components/Layout.tsx"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("global shell ownership", () => {
  const files = walk(SRC);

  it("only the canonical shell owner imports the global Layout", () => {
    const offenders = files.filter((f) => {
      const rel = f.slice(f.indexOf("src/"));
      if (CANONICAL_OWNERS.includes(rel)) return false;
      return /from ["']@\/components\/Layout["']/.test(readFileSync(f, "utf8"));
    });
    expect(offenders).toEqual([]);
  });

  it("only the Layout mounts the operating-state bar", () => {
    const offenders = files.filter((f) => {
      const rel = f.slice(f.indexOf("src/"));
      if (rel === "src/components/Layout.tsx") return false;
      if (rel.includes("/capability/OperatingStateBar")) return false;
      if (/\.(test|spec)\.tsx?$/.test(rel)) return false;
      return /<OperatingStateBar\b/.test(readFileSync(f, "utf8"));
    });
    expect(offenders).toEqual([]);
  });
});
