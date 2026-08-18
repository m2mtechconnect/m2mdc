/**
 * Deno-side half of the cross-runtime canonicalization parity proof.
 * The Node half (src/truth/__tests__/canonicalParity.test.ts) runs the same
 * corpus through the browser implementation and asserts identical output.
 */
import { assertEquals, assertNotEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalize, canonicalHash, CanonicalizationError } from "./canonicalHash.ts";
import { CANONICAL_CORPUS, DISTINCT_PAIRS, EQUIVALENT_PAIRS } from "./canonicalCorpus.ts";

const byName = new Map(CANONICAL_CORPUS.map((c) => [c.name, c]));

for (const c of CANONICAL_CORPUS) {
  Deno.test(`edge canonicalize: ${c.name}`, () => {
    assertEquals(canonicalize(c.value), c.canonical);
  });
}

Deno.test("edge: semantically equal inputs hash identically", async () => {
  for (const [a, b] of EQUIVALENT_PAIRS) {
    assertEquals(
      await canonicalHash(byName.get(a)!.value),
      await canonicalHash(byName.get(b)!.value),
    );
  }
});

Deno.test("edge: distinct inputs never collide", async () => {
  for (const [a, b] of DISTINCT_PAIRS) {
    assertNotEquals(
      await canonicalHash(byName.get(a)!.value),
      await canonicalHash(byName.get(b)!.value),
    );
  }
});

Deno.test("edge: hash is bare lowercase hex (comparable with the client)", async () => {
  const h = await canonicalHash({ a: 1 });
  assertEquals(/^[0-9a-f]{64}$/.test(h), true);
});

Deno.test("edge: a cyclic structure is rejected, never truncated", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assertThrows(() => canonicalize(cyclic), CanonicalizationError);
});
