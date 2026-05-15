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
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
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

function findLink(html: string, rel: string): string | null {
  const m = html.match(new RegExp(`<link[^>]*rel\\s*=\\s*"${rel}"[^>]*>`, "i"));
  return m ? pickAttr(m[0], "href") : null;
}
function findAllLinks(html: string, rel: string): string[] {
  const re = new RegExp(`<link[^>]*rel\\s*=\\s*"${rel}"[^>]*>`, "gi");
  return [...html.matchAll(re)].map((m) => pickAttr(m[0], "href") ?? "");
}

function findAllMeta(
  html: string,
  key: "name" | "property",
  value: string,
): string[] {
  const re = new RegExp(`<meta[^>]*${key}\\s*=\\s*"${value}"[^>]*>`, "gi");
  return [...html.matchAll(re)].map((m) => pickAttr(m[0], "content") ?? "");
}

/**
 * Tags where multiple instances are legitimately allowed by the
 * spec (e.g. og:image can repeat for multi-image previews) and
 * should NOT be flagged as duplicates.
 */
const REPEATABLE_OG_TAGS = new Set<string>([
  // og:image group can repeat (each image gets its own image:width etc.)
  // but we still warn so the user is aware.
]);

function checkDuplicateSocialTags(html: string, findings: Finding[]) {
  const ogTags = [
    "og:title",
    "og:description",
    "og:type",
    "og:url",
    "og:site_name",
    "og:locale",
    "og:image",
    "og:image:alt",
    "og:image:width",
    "og:image:height",
  ] as const;
  const twitterTags = [
    "twitter:card",
    "twitter:site",
    "twitter:creator",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
  ] as const;

  for (const tag of ogTags) {
    const values = findAllMeta(html, "property", tag);
    if (values.length <= 1) continue;
    const unique = new Set(values.map((v) => v.trim()));
    const severity: Severity =
      tag === "og:image" ? "warn" : "error";
    const detail =
      unique.size === 1
        ? `${values.length} identical copies`
        : `${values.length} tags with ${unique.size} different values: ${[...unique]
            .map((v) => `"${v}"`)
            .join(", ")}`;
    findings.push({
      id: `og.duplicate.${tag}`,
      severity,
      message: `Duplicate <meta property="${tag}"> found (${detail}). ${
        tag === "og:image"
          ? "Multiple og:image tags are allowed but social crawlers pick one unpredictably."
          : "Only one is allowed; social crawlers will pick one unpredictably."
      }`,
    });
  }

  for (const tag of twitterTags) {
    const values = findAllMeta(html, "name", tag);
    if (values.length <= 1) continue;
    const unique = new Set(values.map((v) => v.trim()));
    const detail =
      unique.size === 1
        ? `${values.length} identical copies`
        : `${values.length} tags with ${unique.size} different values: ${[...unique]
            .map((v) => `"${v}"`)
            .join(", ")}`;
    findings.push({
      id: `twitter.duplicate.${tag}`,
      severity: "error",
      message: `Duplicate <meta name="${tag}"> found (${detail}). Only one is allowed; X/Twitter will pick one unpredictably.`,
    });
  }
}

/**
 * Validate og:image group consistency.
 *
 * Per the Open Graph protocol, structured image properties
 * (og:image:url, og:image:secure_url, og:image:type, og:image:width,
 * og:image:height, og:image:alt) attach to the most recent og:image
 * declared above them. So for N og:image tags we expect at most N of
 * each supporting tag, and they should appear in document order
 * grouped under their parent og:image.
 *
 * Common breakages we catch here:
 *  - og:image:width without a matching og:image:height (or vice
 *    versa) — Facebook/LinkedIn require both to skip the re-fetch.
 *  - og:image:alt missing on one or more images in a multi-image
 *    group (accessibility regression).
 *  - More og:image:width/height/alt tags than og:image tags
 *    (orphans that attach to the wrong parent).
 *  - Non-numeric og:image:width / og:image:height values.
 */
function checkOgImageGroupConsistency(html: string, findings: Finding[]) {
  // Walk every og:* meta tag in document order so we can group
  // structured properties under their parent og:image.
  const re = /<meta\b[^>]*\bproperty\s*=\s*"(og:[^"]+)"[^>]*>/gi;
  const ordered: { prop: string; content: string }[] = [];
  for (const m of html.matchAll(re)) {
    ordered.push({
      prop: m[1].toLowerCase(),
      content: pickAttr(m[0], "content") ?? "",
    });
  }

  interface Group {
    url: string;
    width?: string;
    height?: string;
    alt?: string;
    type?: string;
    secureUrl?: string;
  }
  const groups: Group[] = [];
  const orphans: { prop: string; content: string }[] = [];

  for (const tag of ordered) {
    if (tag.prop === "og:image" || tag.prop === "og:image:url") {
      groups.push({ url: tag.content });
      continue;
    }
    const current = groups[groups.length - 1];
    switch (tag.prop) {
      case "og:image:width":
        if (!current) orphans.push(tag);
        else current.width = tag.content;
        break;
      case "og:image:height":
        if (!current) orphans.push(tag);
        else current.height = tag.content;
        break;
      case "og:image:alt":
        if (!current) orphans.push(tag);
        else current.alt = tag.content;
        break;
      case "og:image:type":
        if (!current) orphans.push(tag);
        else current.type = tag.content;
        break;
      case "og:image:secure_url":
        if (!current) orphans.push(tag);
        else current.secureUrl = tag.content;
        break;
      default:
        // Other og:* tags (og:title, og:url, etc.) are unrelated.
        break;
    }
  }

  if (groups.length === 0) return; // og.image-missing is handled elsewhere

  for (const orphan of orphans) {
    findings.push({
      id: `og.image-group.orphan.${orphan.prop}`,
      severity: "error",
      message: `<meta property="${orphan.prop}" content="${orphan.content}"> appears before any og:image. Structured image properties must follow their parent og:image.`,
    });
  }

  const multi = groups.length > 1;
  groups.forEach((g, i) => {
    const label = multi ? `og:image #${i + 1} ("${g.url}")` : `og:image ("${g.url}")`;
    const idSuffix = multi ? `.${i}` : "";

    // width <-> height must come as a pair.
    if (g.width && !g.height) {
      findings.push({
        id: `og.image-group.height-missing${idSuffix}`,
        severity: "error",
        message: `${label} declares og:image:width=${g.width} but no og:image:height. Facebook/LinkedIn require both to skip a server-side re-fetch.`,
      });
    }
    if (g.height && !g.width) {
      findings.push({
        id: `og.image-group.width-missing${idSuffix}`,
        severity: "error",
        message: `${label} declares og:image:height=${g.height} but no og:image:width. Facebook/LinkedIn require both to skip a server-side re-fetch.`,
      });
    }

    // Numeric sanity for dimensions.
    if (g.width && !/^\d+$/.test(g.width.trim())) {
      findings.push({
        id: `og.image-group.width-invalid${idSuffix}`,
        severity: "error",
        message: `${label} has non-numeric og:image:width="${g.width}".`,
      });
    }
    if (g.height && !/^\d+$/.test(g.height.trim())) {
      findings.push({
        id: `og.image-group.height-invalid${idSuffix}`,
        severity: "error",
        message: `${label} has non-numeric og:image:height="${g.height}".`,
      });
    }

    // alt is a warning at the per-image level — og.image-alt-missing
    // already flags the first og:image; we extend coverage to every
    // image in a multi-image group so none silently lose their alt.
    if (multi && !g.alt) {
      findings.push({
        id: `og.image-group.alt-missing${idSuffix}`,
        severity: "warn",
        message: `${label} is missing og:image:alt (other images in the group declare one — keep the set consistent).`,
      });
    }

    // secure_url should be HTTPS when present.
    if (g.secureUrl && !/^https:\/\//i.test(g.secureUrl)) {
      findings.push({
        id: `og.image-group.secure-url-not-https${idSuffix}`,
        severity: "error",
        message: `${label} has og:image:secure_url="${g.secureUrl}" which is not HTTPS.`,
      });
    }
  });

  // Cross-group consistency: if SOME images in a multi-image set
  // declare width/height/alt and others don't, flag the mismatch so
  // crawlers don't render an inconsistent carousel.
  if (multi) {
    const fields: (keyof Group)[] = ["width", "height", "alt"];
    for (const field of fields) {
      const withField = groups.filter((g) => g[field]).length;
      if (withField > 0 && withField < groups.length) {
        findings.push({
          id: `og.image-group.mismatched-${field}`,
          severity: "warn",
          message: `Inconsistent og:image:${field} coverage: ${withField}/${groups.length} og:image tags declare it. Either set it on every image or none.`,
        });
      }
    }
  }
}

const DEFAULT_PROD_BASE_URL = "https://auradc.m2mtechconnect.com";

function getProdBaseUrl(): { url: string; source: string } {
  const raw =
    process.env.PROD_BASE_URL ||
    process.env.VITE_PROD_BASE_URL ||
    process.env.SITE_URL ||
    "";
  const source = process.env.PROD_BASE_URL
    ? "PROD_BASE_URL"
    : process.env.VITE_PROD_BASE_URL
    ? "VITE_PROD_BASE_URL"
    : process.env.SITE_URL
    ? "SITE_URL"
    : "default";
  const url = (raw || DEFAULT_PROD_BASE_URL).replace(/\/+$/, "");
  return { url, source };
}

function originOf(u: string): string | null {
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}

function validateHtml(html: string, findings: Finding[]) {
  const add = (id: string, severity: Severity, message: string) =>
    findings.push({ id, severity, message });

  // Duplicate Open Graph / Twitter meta detection.
  // Inconsistent or repeated tags cause unpredictable previews on
  // Facebook/LinkedIn/Slack/X.
  checkDuplicateSocialTags(html, findings);
  // Per-image structured-property consistency (width/height pairs,
  // alt coverage, orphaned children, secure_url scheme).
  checkOgImageGroupConsistency(html, findings);

  const { url: prodBase, source: prodBaseSource } = getProdBaseUrl();
  const prodOrigin = originOf(prodBase);

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

  // Canonical
  const canonicals = findAllLinks(html, "canonical");
  if (canonicals.length === 0) {
    add("canonical.missing", "error", 'Missing <link rel="canonical">.');
  } else if (canonicals.length > 1) {
    add("canonical.duplicate", "error", `Found ${canonicals.length} canonical links; only one is allowed.`);
  } else {
    const href = canonicals[0];
    if (!/^https?:\/\//i.test(href)) {
      add("canonical.relative", "error", `Canonical must be absolute (got "${href}").`);
    } else if (prodOrigin) {
      const hrefOrigin = originOf(href);
      if (hrefOrigin && hrefOrigin !== prodOrigin) {
        add(
          "canonical.origin-mismatch",
          "error",
          `Canonical origin "${hrefOrigin}" does not match production base URL "${prodOrigin}" (from ${prodBaseSource}). ` +
            `Staging/dev builds must not publish a canonical pointing to a different origin.`,
        );
      }
    }
  }

  // og:url should be absolute when present
  const ogUrl = findMeta(html, "property", "og:url");
  if (ogUrl && !/^https?:\/\//i.test(ogUrl)) {
    add("og.url-relative", "error", `og:url must be absolute (got "${ogUrl}").`);
  }
  if (ogUrl && /^https?:\/\//i.test(ogUrl) && prodOrigin) {
    const ogUrlOrigin = originOf(ogUrl);
    if (ogUrlOrigin && ogUrlOrigin !== prodOrigin) {
      add(
        "og.url-origin-mismatch",
        "warn",
        `og:url origin "${ogUrlOrigin}" does not match production base URL "${prodOrigin}" (from ${prodBaseSource}).`,
      );
    }
  }

  // og:image (warn if missing - optional but recommended)
  const ogImage = findMeta(html, "property", "og:image");
  if (!ogImage) {
    add("og.image-missing", "warn", "Missing og:image (recommended for social previews).");
  } else {
    if (!/^https?:\/\//i.test(ogImage)) {
      add("og.image-relative", "error", `og:image must be an absolute URL (got "${ogImage}").`);
    }
    const ogImageAlt = findMeta(html, "property", "og:image:alt");
    if (!ogImageAlt) add("og.image-alt-missing", "warn", "Missing og:image:alt (improves accessibility).");
  }

  // Twitter card tags
  const twitterCard = findMeta(html, "name", "twitter:card");
  const twitterImage = findMeta(html, "name", "twitter:image");
  if (!twitterCard) {
    add("twitter.card-missing", "error", 'Missing <meta name="twitter:card">.');
  } else {
    const allowed = ["summary", "summary_large_image", "app", "player"];
    if (!allowed.includes(twitterCard)) {
      add("twitter.card-invalid", "error", `Invalid twitter:card "${twitterCard}". Expected one of: ${allowed.join(", ")}.`);
    }
    if (twitterCard === "summary_large_image") {
      // Hard requirement: twitter:image must be present (og:image is no longer
      // an acceptable fallback for the large-image card per X/Twitter docs).
      if (!twitterImage) {
        if (ogImage) {
          add(
            "twitter.image-missing",
            "error",
            'twitter:card="summary_large_image" requires <meta name="twitter:image">. og:image is not a guaranteed fallback.',
          );
        } else {
          add(
            "twitter.image-missing",
            "error",
            'twitter:card="summary_large_image" requires <meta name="twitter:image"> (og:image also missing).',
          );
        }
      }
    }
  }

  // twitter:image-specific validation (independent of card type so summary cards
  // that opt into a custom image are still checked).
  if (twitterImage) {
    if (!/^https?:\/\//i.test(twitterImage)) {
      add(
        "twitter.image-relative",
        "error",
        `twitter:image must be an absolute URL (got "${twitterImage}").`,
      );
    }
    const twitterImageAlt = findMeta(html, "name", "twitter:image:alt");
    if (!twitterImageAlt) {
      add(
        "twitter.image-alt-missing",
        "warn",
        "Missing twitter:image:alt (improves accessibility for screen readers on social previews).",
      );
    } else if (twitterImageAlt.length > 420) {
      add(
        "twitter.image-alt-long",
        "warn",
        `twitter:image:alt is ${twitterImageAlt.length} chars (>420, X truncates).`,
      );
    }
  }
  if (!findMeta(html, "name", "twitter:title") && !findMeta(html, "property", "og:title")) {
    add("twitter.title-missing", "warn", "Missing twitter:title (falls back to og:title if present).");
  }
  if (!findMeta(html, "name", "twitter:description") && !findMeta(html, "property", "og:description")) {
    add("twitter.description-missing", "warn", "Missing twitter:description (falls back to og:description if present).");
  }

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

      const passed = errors.length === 0;
      const report = {
        generatedAt: new Date().toISOString(),
        status: passed ? "pass" : "fail",
        summary: {
          errors: errors.length,
          warnings: warns.length,
          total: findings.length,
        },
        artifacts: {
          indexHtml: existsSync(indexPath),
          robotsTxt: existsSync(robotsPath),
          sitemapXml: existsSync(sitemapPath),
        },
        findings,
      };

      // Write JSON report (always, so users can inspect even on pass)
      const reportPath = resolve(dist, "seo-report.json");
      try {
        mkdirSync(dirname(reportPath), { recursive: true });
        writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
      } catch (e) {
        console.warn(`[seo-build-gate] Failed to write report: ${(e as Error).message}`);
      }

      // Human-readable console report
      const bar = "─".repeat(64);
      console.log("\n" + bar);
      console.log(" SEO Validation Report");
      console.log(bar);
      console.log(` Status   : ${passed ? "PASS ✓" : "FAIL ✗"}`);
      console.log(` Errors   : ${errors.length}`);
      console.log(` Warnings : ${warns.length}`);
      console.log(` Artifacts: index.html=${report.artifacts.indexHtml}  robots.txt=${report.artifacts.robotsTxt}  sitemap.xml=${report.artifacts.sitemapXml}`);
      console.log(` Report   : ${reportPath}`);
      console.log(bar);
      if (errors.length) {
        console.log(" Errors:");
        for (const f of errors) console.log(`   ✗ [${f.id}] ${f.message}`);
      }
      if (warns.length) {
        console.log(" Warnings:");
        for (const f of warns) console.log(`   ! [${f.id}] ${f.message}`);
      }
      if (passed && warns.length === 0) {
        console.log(" All SEO checks passed. Safe to publish.");
      }
      console.log(bar + "\n");

      if (!passed) {
        this.error(
          `SEO build gate FAILED with ${errors.length} error(s). ` +
          `See report at ${reportPath} or fix issues above. ` +
          `Set SKIP_SEO_GATE=1 to bypass (not recommended).`
        );
      }
    },
  };
}