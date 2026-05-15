import { describe, it, expect } from "vitest";
import {
  checkDuplicateSocialTags,
  type Finding,
} from "../seoBuildGate";

const wrap = (head: string) =>
  `<!doctype html><html><head>${head}</head><body></body></html>`;

const run = (head: string): Finding[] => {
  const findings: Finding[] = [];
  checkDuplicateSocialTags(wrap(head), findings);
  return findings;
};

const ids = (f: Finding[]) => f.map((x) => x.id).sort();

describe("checkDuplicateSocialTags - Open Graph", () => {
  it("returns nothing when each og tag appears once", () => {
    const head = `
      <meta property="og:title" content="Hello">
      <meta property="og:description" content="A page">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://example.com/">
      <meta property="og:image" content="https://example.com/a.png">
    `;
    expect(run(head)).toEqual([]);
  });

  it("flags duplicate og:title with conflicting values as error", () => {
    const head = `
      <meta property="og:title" content="Hello">
      <meta property="og:title" content="Hello v2">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("og.duplicate.og:title");
    expect(f[0].severity).toBe("error");
    expect(f[0].message).toContain("2 tags with 2 different values");
    expect(f[0].message).toContain('"Hello"');
    expect(f[0].message).toContain('"Hello v2"');
  });

  it("flags duplicate og:title with identical values as error (still ambiguous)", () => {
    const head = `
      <meta property="og:title" content="Hello">
      <meta property="og:title" content="Hello">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("og.duplicate.og:title");
    expect(f[0].severity).toBe("error");
    expect(f[0].message).toContain("2 identical copies");
  });

  it("flags duplicate og:image as warn (multi-image is allowed by spec)", () => {
    const head = `
      <meta property="og:image" content="https://example.com/a.png">
      <meta property="og:image" content="https://example.com/b.png">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("og.duplicate.og:image");
    expect(f[0].severity).toBe("warn");
    expect(f[0].message).toContain("unpredictably");
  });

  it("flags duplicate og:url, og:type, og:description independently", () => {
    const head = `
      <meta property="og:url" content="https://a.com/">
      <meta property="og:url" content="https://b.com/">
      <meta property="og:type" content="website">
      <meta property="og:type" content="article">
      <meta property="og:description" content="x">
      <meta property="og:description" content="y">
    `;
    expect(ids(run(head))).toEqual([
      "og.duplicate.og:description",
      "og.duplicate.og:type",
      "og.duplicate.og:url",
    ]);
  });

  it("detects duplicates regardless of attribute order, casing, and quote style", () => {
    const head = `
      <META Property='og:title' Content='A'>
      <meta content="B" property="OG:TITLE">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("og.duplicate.og:title");
    expect(f[0].severity).toBe("error");
    expect(f[0].message).toContain('"A"');
    expect(f[0].message).toContain('"B"');
  });
});

describe("checkDuplicateSocialTags - Twitter", () => {
  it("returns nothing when each twitter tag appears once", () => {
    const head = `
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="Hello">
      <meta name="twitter:description" content="x">
      <meta name="twitter:image" content="https://example.com/a.png">
    `;
    expect(run(head)).toEqual([]);
  });

  it("flags duplicate twitter:card with conflicting values as error", () => {
    const head = `
      <meta name="twitter:card" content="summary">
      <meta name="twitter:card" content="summary_large_image">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("twitter.duplicate.twitter:card");
    expect(f[0].severity).toBe("error");
    expect(f[0].message).toContain("2 tags with 2 different values");
    expect(f[0].message).toContain('"summary"');
    expect(f[0].message).toContain('"summary_large_image"');
  });

  it("flags duplicate twitter:image identical copies as error", () => {
    const head = `
      <meta name="twitter:image" content="https://example.com/a.png">
      <meta name="twitter:image" content="https://example.com/a.png">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("twitter.duplicate.twitter:image");
    expect(f[0].severity).toBe("error");
    expect(f[0].message).toContain("2 identical copies");
  });

  it("flags duplicate twitter:title, twitter:description, twitter:image:alt", () => {
    const head = `
      <meta name="twitter:title" content="A">
      <meta name="twitter:title" content="B">
      <meta name="twitter:description" content="x">
      <meta name="twitter:description" content="y">
      <meta name="twitter:image:alt" content="alt one">
      <meta name="twitter:image:alt" content="alt two">
    `;
    expect(ids(run(head))).toEqual([
      "twitter.duplicate.twitter:description",
      "twitter.duplicate.twitter:image:alt",
      "twitter.duplicate.twitter:title",
    ]);
  });

  it("detects twitter duplicates regardless of attribute order, casing, and quotes", () => {
    const head = `
      <META Name='twitter:card' Content='summary'>
      <meta content="summary_large_image" name="TWITTER:CARD">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("twitter.duplicate.twitter:card");
    expect(f[0].severity).toBe("error");
  });
});

describe("checkDuplicateSocialTags - mixed and isolation", () => {
  it("does not cross-pollute og and twitter namespaces", () => {
    // Same logical name but in og vs twitter - should NOT be a duplicate.
    const head = `
      <meta property="og:title" content="A">
      <meta name="twitter:title" content="A">
    `;
    expect(run(head)).toEqual([]);
  });

  it("reports og and twitter duplicates together when both present", () => {
    const head = `
      <meta property="og:title" content="A">
      <meta property="og:title" content="B">
      <meta name="twitter:card" content="summary">
      <meta name="twitter:card" content="summary_large_image">
    `;
    expect(ids(run(head))).toEqual([
      "og.duplicate.og:title",
      "twitter.duplicate.twitter:card",
    ]);
  });

  it("treats three+ duplicates with the right count in the message", () => {
    const head = `
      <meta property="og:title" content="A">
      <meta property="og:title" content="B">
      <meta property="og:title" content="C">
    `;
    const f = run(head);
    expect(f).toHaveLength(1);
    expect(f[0].message).toContain("3 tags with 3 different values");
  });
});