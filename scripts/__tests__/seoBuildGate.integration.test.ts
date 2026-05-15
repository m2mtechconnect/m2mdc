import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { seoBuildGate } from "../seoBuildGate";

/**
 * Integration tests for the seo-build-gate Vite plugin.
 *
 * These tests stage a fake `dist/` directory on disk, invoke the
 * plugin's `closeBundle` hook with a mocked rollup PluginContext,
 * and assert that:
 *  - duplicate OG/Twitter tags cause `this.error(...)` to be called
 *    (which is what aborts a Vite build in CI), and
 *  - clean fixtures pass without aborting.
 *
 * `this.error` throws in real Rollup, so we mirror that behavior.
 */

const ROBOTS = `User-agent: *\nAllow: /\nSitemap: https://auradc.m2mtechconnect.com/sitemap.xml\n`;
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://auradc.m2mtechconnect.com/</loc></url>
</urlset>`;

function baseHead(extra = "") {
  return `<!doctype html><html lang="en"><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>M2M AURA</title>
    <meta name="description" content="Sovereign DC digital twin.">
    <link rel="canonical" href="https://auradc.m2mtechconnect.com/">
    <meta property="og:title" content="M2M AURA">
    <meta property="og:description" content="Sovereign DC digital twin.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://auradc.m2mtechconnect.com/">
    <meta property="og:image" content="https://auradc.m2mtechconnect.com/og.png">
    <meta property="og:image:alt" content="M2M AURA dashboard">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="https://auradc.m2mtechconnect.com/og.png">
    <meta name="twitter:image:alt" content="M2M AURA dashboard">
    ${extra}
  </head><body></body></html>`;
}

interface RunResult {
  errored: boolean;
  errorMessage: string;
  reportPath: string;
  report: any | null;
}

/**
 * Stage dist/ with the given index.html and run the plugin's
 * closeBundle hook from that directory. Returns the captured
 * this.error call (if any) and the parsed seo-report.json.
 */
function runGate(indexHtml: string, opts: { robots?: string; sitemap?: string } = {}): RunResult {
  const tmp = mkdtempSync(join(tmpdir(), "seo-gate-"));
  const dist = join(tmp, "dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, "index.html"), indexHtml, "utf8");
  writeFileSync(join(dist, "robots.txt"), opts.robots ?? ROBOTS, "utf8");
  writeFileSync(join(dist, "sitemap.xml"), opts.sitemap ?? SITEMAP, "utf8");

  const prevCwd = process.cwd();
  process.chdir(tmp);

  let errored = false;
  let errorMessage = "";
  const ctx = {
    error(msg: string) {
      errored = true;
      errorMessage = msg;
      // Real Rollup throws to abort the build; mirror that so the
      // gate's control flow matches CI exactly.
      throw new Error(msg);
    },
  };

  const plugin = seoBuildGate();
  const hook: any = (plugin as any).closeBundle;
  try {
    hook.call(ctx);
  } catch {
    // Expected when the gate fails - swallow so the test can assert.
  } finally {
    process.chdir(prevCwd);
  }

  const reportPath = join(dist, "seo-report.json");
  const report = existsSync(reportPath)
    ? JSON.parse(readFileSync(reportPath, "utf8"))
    : null;

  // Cleanup
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch { /* ignore */ }

  return { errored, errorMessage, reportPath, report };
}

describe("seoBuildGate integration - duplicate OG/Twitter aborts the build", () => {
  beforeEach(() => {
    delete process.env.SKIP_SEO_GATE;
  });
  afterEach(() => {
    delete process.env.SKIP_SEO_GATE;
  });

  it("passes a clean fixture without calling this.error", () => {
    const result = runGate(baseHead());
    expect(result.errored).toBe(false);
    expect(result.report?.status).toBe("pass");
    expect(result.report?.summary.errors).toBe(0);
  });

  it("FAILS the build when duplicate og:title is present", () => {
    const html = baseHead(`<meta property="og:title" content="Conflicting Title">`);
    const result = runGate(html);

    expect(result.errored).toBe(true);
    expect(result.errorMessage).toMatch(/SEO build gate FAILED/);
    expect(result.report?.status).toBe("fail");
    const ids = result.report.findings.map((f: any) => f.id);
    expect(ids).toContain("og.duplicate.og:title");
    const dup = result.report.findings.find((f: any) => f.id === "og.duplicate.og:title");
    expect(dup.severity).toBe("error");
  });

  it("FAILS the build when duplicate twitter:card is present", () => {
    const html = baseHead(`<meta name="twitter:card" content="summary">`);
    const result = runGate(html);

    expect(result.errored).toBe(true);
    expect(result.report?.status).toBe("fail");
    const ids = result.report.findings.map((f: any) => f.id);
    expect(ids).toContain("twitter.duplicate.twitter:card");
  });

  it("FAILS the build when og and twitter duplicates are stacked", () => {
    const html = baseHead(`
      <meta property="og:url" content="https://other.example.com/">
      <meta name="twitter:title" content="Conflict">
      <meta name="twitter:title" content="Conflict 2">
    `);
    const result = runGate(html);

    expect(result.errored).toBe(true);
    const ids = result.report.findings.map((f: any) => f.id);
    expect(ids).toContain("og.duplicate.og:url");
    expect(ids).toContain("twitter.duplicate.twitter:title");
    expect(result.report.summary.errors).toBeGreaterThanOrEqual(2);
  });

  it("does NOT fail the build when og:image is duplicated (warn-only)", () => {
    // og:image is intentionally a warning since the spec allows multiple
    // images. Build must still pass when this is the only duplicate.
    const html = baseHead(`<meta property="og:image" content="https://auradc.m2mtechconnect.com/og2.png">`);
    const result = runGate(html);

    expect(result.errored).toBe(false);
    expect(result.report?.status).toBe("pass");
    const ids = result.report.findings.map((f: any) => f.id);
    expect(ids).toContain("og.duplicate.og:image");
    const dup = result.report.findings.find((f: any) => f.id === "og.duplicate.og:image");
    expect(dup.severity).toBe("warn");
  });

  it("detects duplicates across attribute order/case/quote variation", () => {
    const html = baseHead(`<META Name='twitter:card' Content='summary'>`);
    // baseHead already declares twitter:card="summary_large_image" with
    // standard quoting; the variant above MUST still be recognized as a
    // duplicate, otherwise the parser is regressing.
    const result = runGate(html);

    expect(result.errored).toBe(true);
    const ids = result.report.findings.map((f: any) => f.id);
    expect(ids).toContain("twitter.duplicate.twitter:card");
  });

  it("respects SKIP_SEO_GATE=1 and does not abort even on duplicates", () => {
    process.env.SKIP_SEO_GATE = "1";
    const html = baseHead(`<meta property="og:title" content="Conflict">`);
    const result = runGate(html);

    expect(result.errored).toBe(false);
    // Report is not written when skipped.
    expect(result.report).toBeNull();
  });
});