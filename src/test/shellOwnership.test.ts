/**
 * Stage 6F structural guards.
 *
 * 1. Only the canonical shell owner may mount the global application shell.
 * 2. Global chrome (state bar, assistant launcher, facility switcher) has a
 *    single owner.
 * 3. Navigation destinations are unique: no primary item and Manage item, and
 *    no two visible entries, resolve to the same canonical page.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MANAGE_NAV, WORKSPACE_NAV } from "@/config/appNavigation";

const SRC = join(process.cwd(), "src");
const CANONICAL_SHELL_OWNERS = ["src/AuthenticatedShell.tsx", "src/components/Layout.tsx"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}
const files = walk(SRC).map((f) => ({ rel: f.slice(f.indexOf("src/")), body: readFileSync(f, "utf8") }));
const appFiles = files.filter((f) => !/\.(test|spec)\.tsx?$/.test(f.rel));

describe("global shell ownership", () => {
  it("only the canonical shell owner imports the global Layout", () => {
    const offenders = appFiles
      .filter((f) => !CANONICAL_SHELL_OWNERS.includes(f.rel))
      .filter((f) => /from ["']@\/components\/Layout["']/.test(f.body))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("only the Layout mounts the operating-state bar", () => {
    const offenders = appFiles
      .filter((f) => f.rel !== "src/components/Layout.tsx")
      .filter((f) => !f.rel.includes("/capability/OperatingStateBar"))
      .filter((f) => /<OperatingStateBar\b/.test(f.body))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("only the Layout mounts the global assistant launcher and panel", () => {
    const offenders = appFiles
      .filter((f) => f.rel !== "src/components/Layout.tsx")
      .filter((f) => !f.rel.startsWith("src/components/copilot/"))
      .filter((f) => /<CoPilotBubble\b|<CoPilotPanel\b/.test(f.body))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("only the Layout mounts the facility switcher", () => {
    const offenders = appFiles
      .filter((f) => f.rel !== "src/components/Layout.tsx")
      .filter((f) => !f.rel.startsWith("src/components/twin-selector"))
      .filter((f) => /<DataCentreSelector\b/.test(f.body))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });
});

describe("navigation destination uniqueness", () => {
  const all = [...WORKSPACE_NAV, ...MANAGE_NAV];

  it("no two visible navigation entries share a destination", () => {
    const hrefs = all.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("no Manage item duplicates a primary workspace destination", () => {
    const primary = new Set(WORKSPACE_NAV.map((i) => i.href));
    expect(MANAGE_NAV.filter((i) => primary.has(i.href)).map((i) => i.name)).toEqual([]);
  });

  it("navigation never points at a redirect-only alias", () => {
    const aliases = ["/intelligence", "/operations", "/universal-search", "/twin-datacentre", "/agents", "/marketplace/integrations", "/settings/integrations/nvidia-dsx"];
    expect(all.filter((i) => aliases.includes(i.href)).map((i) => i.href)).toEqual([]);
  });
});

describe("canonical single implementations", () => {
  it("NVIDIA DSX readiness has one implementation", () => {
    const owners = appFiles.filter((f) => /export function NvidiaDsxReadinessPanel/.test(f.body)).map((f) => f.rel);
    expect(owners).toEqual(["src/components/integrations/NvidiaDsxReadinessPanel.tsx"]);
  });

  it("there is one search page implementation", () => {
    const searchPages = appFiles.filter((f) => /^src\/pages\/(Universal)?Search\.tsx$/.test(f.rel)).map((f) => f.rel);
    expect(searchPages).toEqual(["src/pages/Search.tsx"]);
  });
});
