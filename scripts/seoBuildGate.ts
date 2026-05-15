/**
 * Vite plugin: hard gate on SEO errors at build time.
 *
 * Runs after the bundle is written to `dist/` and validates the
 * produced `index.html`, `robots.txt`, and `sitemap.xml` for the
 * same Lighthouse/Google issues as scripts/validateSeo.ts, but
 * against the local build artifacts (no network).
 *
 * If any error-severity finding is reported, the build fails with a
 * non-zero exit code, which blocks Lovable publish.
 *
 * Skip with SKIP_SEO_GATE=1 (use sparingly, e.g. emergency hotfix).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { Plugin } from "vite";

type Severity = "error" | "warn";
interface Finding { id: string; severity: Severity; message: string; }

function pickAttr(tag: string, attr: string): string | null {
  const m = tag.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}
function findMeta(html: string, key: "name" | "property", value: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]*${key}\\s*=\\s*"${value}"[^>]*>`, "i"));
  return m ? pickAttr(m[0], "content") : null;
}

function validateHtml(html: string, findings: Finding[]) {
  const add = (id: string, severity: Severity, message: string) =>
    findings.push({ id, severity, message });

  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  if (!title) add("title.missing", "error", "Missing <title>.");
  else if (title.length > 60) add("title.long", "warn", `Title is ${title.length} chars (>60).`);

  const desc = findMeta(html, "name", "description");
  if (!desc) add("description.missing", "error", "Missing <meta name=\"description\">.");

  if (!findMeta(html, "name", "viewport")) add("viewport.missing", "error", "Missing viewport meta.");

  const robots = findMeta(html, "name", "robots");
  if (robots && /noindex/i.test(robots)) {
    add("robots-meta.noindex", "error", `Robots meta contains noindex: "${robots}".`);
  }

  const ogRequired = ["og:title", "og:description", "og:type"];
  const ogMissing = ogRequired.filter((p) => !findMeta(html, "property", p));
  if (ogMissing.length) add("og.missing", "warn", `Missing OG tags: ${ogMissing.join(", ")}.`);

  const ldBlocks = [...html.matchAll(/<script[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  ldBlocks.forEach((m, i) => {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach((item, j) => {
        const label = `JSON-LD #${i + 1}${items.length > 1 ? `.${j + 1}` : ""}`;
        if (!item || typeof item !== "object") {
          add(`jsonld.${i}.${j}.shape`, "error", `${label}: not an object.`);
          return;
        }
        if (!item["@context"]) add(`jsonld.${i}.${j}.context`, "error", `${label}: missing @context.`);
        if (!item["@type"]) add(`jsonld.${i}.${j}.type`, "error", `${label}: missing @type.`);
      });
    } catch (e) {
      add(`jsonld.${i}.parse`, "error", `JSON-LD #${i + 1} failed to parse: ${(e as Error).message}`);
    }
  });
}

function validateRobots(text: string, findings: Finding[]) {
  if (/^\s*User-agent:\s*\*\s*\nDisallow:\s*\/\s*$/im.test(text)) {
    findings.push({
      id: "robots.disallow-all",
      severity: "error",
      message: "robots.txt disallows all crawlers.",
    });
  }
  const hasSitemap = text.split(/\r?\n/).some((l) => /^\s*Sitemap:/i.test(l));
  if (!hasSitemap) {
    findings.push({
      id: "robots.sitemap-missing",
      severity: "warn",
      message: "robots.txt does not declare a Sitemap: directive.",
    });
  }
}

function validateSitemap(text: string, findings: Finding[]) {
  if (!/<urlset[\s>]/i.test(text)) {
    findings.push({ id: "sitemap.urlset", severity: "error", message: "sitemap.xml has no <urlset> root." });
    return;
  }
  const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  if (locs.length === 0) {
    findings.push({ id: "sitemap.empty", severity: "error", message: "sitemap.xml has no <url><loc> entries." });
    return;
  }
  const bad = locs.filter((l) => !/^https?:\/\//i.test(l));
  if (bad.length) {
    findings.push({
      id: "sitemap.relative",
      severity: "error",
      message: `sitemap.xml has ${bad.length} non-absolute <loc> entries.`,
    });
  }
}

export function seoBuildGate(): Plugin {
  return {
    name: "seo-build-gate",
    apply: "build",
    closeBundle() {
      if (process.env.SKIP_SEO_GATE === "1") {
        console.log("\n[seo-build-gate] SKIP_SEO_GATE=1, skipping SEO validation.\n");
        return;
      }

      const dist = resolve(process.cwd(), "dist");
      const findings: Finding[] = [];

      const indexPath = resolve(dist, "index.html");
      if (!existsSync(indexPath)) {
        findings.push({ id: "build.index", severity: "error", message: "dist/index.html not found." });
      } else {
        validateHtml(readFileSync(indexPath, "utf8"), findings);
      }

      const robotsPath = resolve(dist, "robots.txt");
      if (!existsSync(robotsPath)) {
        findings.push({ id: "build.robots", severity: "error", message: "dist/robots.txt not found." });
      } else {
        validateRobots(readFileSync(robotsPath, "utf8"), findings);
      }

      const sitemapPath = resolve(dist, "sitemap.xml");
      if (!existsSync(sitemapPath)) {
        findings.push({ id: "build.sitemap", severity: "error", message: "dist/sitemap.xml not found." });
      } else {
        validateSitemap(readFileSync(sitemapPath, "utf8"), findings);
      }

      const errors = findings.filter((f) => f.severity === "error");
      const warns = findings.filter((f) => f.severity === "warn");

      console.log("\n[seo-build-gate] Validating built SEO artifacts...");
      for (const f of [...errors, ...warns]) {
        const tag = f.severity === "error" ? "FAIL" : "WARN";
        console.log(`  [${tag}] ${f.id} - ${f.message}`);
      }
      console.log(`[seo-build-gate] ${errors.length} error(s), ${warns.length} warning(s).\n`);

      if (errors.length > 0) {
        this.error(
          `SEO build gate FAILED with ${errors.length} error(s). ` +
          `Fix the issues above or set SKIP_SEO_GATE=1 to bypass (not recommended).`
        );
      }
    },
  };
}