/**
 * Automated SEO validation.
 *
 * Checks the published (or any) URL for the SEO issues most often
 * flagged by Lighthouse and Google Search Console:
 *   - <title> + <meta name="description"> presence and length
 *   - canonical link
 *   - Open Graph + Twitter Card coverage
 *   - robots meta (no accidental noindex)
 *   - JSON-LD structured data parses + has @context/@type
 *   - /robots.txt exists and references a sitemap
 *   - /sitemap.xml exists and is valid XML with <url><loc> entries
 *
 * Usage:
 *   bunx tsx scripts/validateSeo.ts                          # defaults to https://auradc.m2mtechconnect.com
 *   bunx tsx scripts/validateSeo.ts https://example.com
 *   SEO_TARGET_URL=https://foo.com bunx tsx scripts/validateSeo.ts
 *
 * Exits non-zero on any error finding so it can gate a publish workflow.
 */

const DEFAULT_URL = "https://auradc.m2mtechconnect.com";
const target = (process.argv[2] || process.env.SEO_TARGET_URL || DEFAULT_URL).replace(/\/$/, "");

type Severity = "error" | "warn" | "ok";
interface Finding {
  id: string;
  severity: Severity;
  message: string;
}
const findings: Finding[] = [];
const add = (id: string, severity: Severity, message: string) =>
  findings.push({ id, severity, message });

async function fetchText(url: string): Promise<{ status: number; text: string; contentType: string }> {
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "M2M-AURA-SEO-Validator/1.0" } });
  return { status: res.status, text: await res.text(), contentType: res.headers.get("content-type") || "" };
}

function pickAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

function findMeta(html: string, key: "name" | "property", value: string): string | null {
  const re = new RegExp(`<meta[^>]*${key}\\s*=\\s*"${value}"[^>]*>`, "i");
  const m = html.match(re);
  if (!m) return null;
  return pickAttr(m[0], "content");
}

function validateHtml(html: string) {
  // Title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? "";
  if (!title) add("title.missing", "error", "Missing <title>.");
  else if (title.length < 10) add("title.short", "warn", `Title is short (${title.length} chars): "${title}".`);
  else if (title.length > 60) add("title.long", "warn", `Title is long (${title.length} chars, recommend <60).`);
  else add("title.ok", "ok", `Title length ${title.length} chars.`);

  // Description
  const desc = findMeta(html, "name", "description");
  if (!desc) add("description.missing", "error", "Missing <meta name=\"description\">.");
  else if (desc.length < 50) add("description.short", "warn", `Description is short (${desc.length} chars).`);
  else if (desc.length > 160) add("description.long", "warn", `Description is long (${desc.length} chars, recommend <160).`);
  else add("description.ok", "ok", `Description length ${desc.length} chars.`);

  // Canonical
  const canonical = html.match(/<link[^>]*rel\s*=\s*"canonical"[^>]*>/i);
  if (!canonical) add("canonical.missing", "warn", "Missing <link rel=\"canonical\">.");
  else {
    const href = pickAttr(canonical[0], "href");
    if (!href || !/^https?:\/\//i.test(href)) add("canonical.invalid", "error", `Canonical href is not absolute: ${href}`);
    else add("canonical.ok", "ok", `Canonical: ${href}`);
  }

  // Robots meta — flag accidental noindex on production
  const robotsMeta = findMeta(html, "name", "robots");
  if (robotsMeta && /noindex/i.test(robotsMeta)) {
    add("robots-meta.noindex", "error", `Page contains <meta name="robots" content="${robotsMeta}"> — search engines will skip it.`);
  }

  // Viewport
  if (!findMeta(html, "name", "viewport")) add("viewport.missing", "error", "Missing viewport meta tag.");

  // Open Graph
  const ogRequired = ["og:title", "og:description", "og:type", "og:image"];
  const ogMissing = ogRequired.filter((p) => !findMeta(html, "property", p));
  if (ogMissing.length) add("og.missing", "warn", `Missing Open Graph tags: ${ogMissing.join(", ")}.`);
  else add("og.ok", "ok", "Open Graph tags present.");

  // Twitter
  if (!findMeta(html, "name", "twitter:card")) add("twitter.card.missing", "warn", "Missing twitter:card meta tag.");

  // H1
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 0) add("h1.missing", "warn", "No <h1> found in initial HTML (SPA may render later).");
  else if (h1Count > 1) add("h1.multiple", "warn", `Found ${h1Count} <h1> tags — recommend exactly one.`);

  // JSON-LD
  const ldBlocks = [...html.matchAll(/<script[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (ldBlocks.length === 0) {
    add("jsonld.missing", "warn", "No JSON-LD structured data found.");
  } else {
    ldBlocks.forEach((m, i) => {
      const raw = m[1].trim();
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        items.forEach((item, j) => {
          const label = `JSON-LD #${i + 1}${items.length > 1 ? `.${j + 1}` : ""}`;
          if (!item || typeof item !== "object") {
            add(`jsonld.${i}.shape`, "error", `${label}: not an object.`);
            return;
          }
          if (!item["@context"]) add(`jsonld.${i}.context`, "error", `${label}: missing @context.`);
          if (!item["@type"]) add(`jsonld.${i}.type`, "error", `${label}: missing @type.`);
          else add(`jsonld.${i}.ok`, "ok", `${label}: ${item["@type"]} parsed OK.`);
        });
      } catch (e) {
        add(`jsonld.${i}.parse`, "error", `JSON-LD #${i + 1} failed to parse: ${(e as Error).message}`);
      }
    });
  }
}

async function validateRobots(base: string, sitemapAbs: string) {
  const url = `${base}/robots.txt`;
  try {
    const { status, text } = await fetchText(url);
    if (status !== 200) {
      add("robots.status", "error", `${url} returned HTTP ${status}.`);
      return;
    }
    if (/^\s*User-agent:\s*\*\s*\nDisallow:\s*\/\s*$/im.test(text)) {
      add("robots.disallow-all", "error", "robots.txt disallows all crawlers (User-agent: * / Disallow: /).");
    }
    const sitemapLine = text.split(/\r?\n/).find((l) => /^\s*Sitemap:/i.test(l));
    if (!sitemapLine) {
      add("robots.sitemap-missing", "warn", "robots.txt does not declare a Sitemap: directive.");
    } else {
      const declared = sitemapLine.replace(/^\s*Sitemap:\s*/i, "").trim();
      if (declared !== sitemapAbs) {
        add("robots.sitemap-mismatch", "warn", `robots.txt sitemap "${declared}" != expected "${sitemapAbs}".`);
      } else {
        add("robots.ok", "ok", "robots.txt OK.");
      }
    }
  } catch (e) {
    add("robots.fetch", "error", `Failed to fetch ${url}: ${(e as Error).message}`);
  }
}

async function validateSitemap(base: string) {
  const url = `${base}/sitemap.xml`;
  try {
    const { status, text, contentType } = await fetchText(url);
    if (status !== 200) {
      add("sitemap.status", "error", `${url} returned HTTP ${status}.`);
      return;
    }
    if (!/xml/i.test(contentType)) {
      add("sitemap.content-type", "warn", `sitemap.xml content-type is "${contentType}" (expected XML).`);
    }
    if (!/<urlset[\s>]/i.test(text)) {
      add("sitemap.urlset", "error", "sitemap.xml has no <urlset> root.");
      return;
    }
    const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
    if (locs.length === 0) {
      add("sitemap.empty", "error", "sitemap.xml has no <url><loc> entries.");
      return;
    }
    const bad = locs.filter((l) => !/^https?:\/\//i.test(l));
    if (bad.length) add("sitemap.relative", "error", `sitemap.xml has ${bad.length} non-absolute <loc> entries.`);
    add("sitemap.ok", "ok", `sitemap.xml OK (${locs.length} URLs).`);
  } catch (e) {
    add("sitemap.fetch", "error", `Failed to fetch ${url}: ${(e as Error).message}`);
  }
}

async function main() {
  console.log(`\nSEO validation → ${target}\n`);
  const { status, text } = await fetchText(target + "/");
  if (status !== 200) {
    add("home.status", "error", `Homepage returned HTTP ${status}.`);
  } else {
    validateHtml(text);
  }
  await validateRobots(target, `${target}/sitemap.xml`);
  await validateSitemap(target);

  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");
  const oks = findings.filter((f) => f.severity === "ok");

  for (const f of [...errors, ...warns, ...oks]) {
    const tag = f.severity === "error" ? "FAIL" : f.severity === "warn" ? "WARN" : " OK ";
    console.log(`[${tag}] ${f.id} — ${f.message}`);
  }
  console.log(`\nSummary: ${errors.length} error(s), ${warns.length} warning(s), ${oks.length} passing.\n`);

  if (errors.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Validator crashed:", e);
  process.exit(2);
});