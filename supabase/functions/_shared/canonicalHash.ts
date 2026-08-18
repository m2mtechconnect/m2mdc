/**
 * Phase 3 - canonical serialization + hashing for the trusted write boundary.
 *
 * This is `aura-canonical-v1`, the SAME rule set as
 * `src/simulation/orchestrator/canonical.ts`. The rules are duplicated in
 * source only because Deno edge functions cannot import from the browser
 * bundle; they are NOT allowed to drift. Two executable parity suites hold
 * them together over one shared corpus:
 *
 *   - src/truth/__tests__/canonicalParity.test.ts   (Node / vitest, both impls)
 *   - supabase/functions/_shared/canonicalHash.test.ts (Deno, this impl)
 *
 * Rules (see the orchestrator module for the full table):
 *   undefined -> "@undefined" (key kept)   |  null -> null
 *   -0 -> "@-0"    NaN -> "@NaN"    +/-Infinity -> "@Infinity" / "@-Infinity"
 *   bigint -> "@bigint:<digits>"           |  Date -> "@date:<iso>"
 *   string -> NFC, leading "@" doubled so a literal can never equal a tag
 *   Map/Set -> key-sorted object / sorted array
 *   arrays keep order; object keys are sorted; cycles are rejected.
 */
export const CANONICAL_SCHEMA_VERSION = "aura-canonical-v1";
export const EVIDENCE_SCHEMA_VERSION = "aura-evidence-v1";

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizationError";
  }
}

export function canonicalize(value: unknown): string {
  return serialize(value, new Set<object>());
}

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "number") {
    const n = value as number;
    if (Number.isNaN(n)) return '"@NaN"';
    if (!Number.isFinite(n)) return n > 0 ? '"@Infinity"' : '"@-Infinity"';
    if (n === 0 && Object.is(n, -0)) return '"@-0"';
    return JSON.stringify(n);
  }
  if (t === "string") {
    const s = (value as string).normalize("NFC");
    return JSON.stringify(s.startsWith("@") ? `@${s}` : s);
  }
  if (t === "boolean") return JSON.stringify(value);
  if (t === "bigint") return JSON.stringify(`@bigint:${(value as bigint).toString()}`);
  if (t === "undefined") return '"@undefined"';
  if (t === "function") {
    const name = (value as { name?: string }).name || "anonymous";
    return JSON.stringify(`@function:${name}`);
  }
  if (t === "symbol") return JSON.stringify(`@symbol:${(value as symbol).description ?? ""}`);
  if (value instanceof Date) {
    const ms = value.getTime();
    return JSON.stringify(Number.isNaN(ms) ? "@date:invalid" : `@date:${value.toISOString()}`);
  }

  const obj = value as object;
  if (seen.has(obj)) {
    throw new CanonicalizationError(
      "value contains a cyclic reference and has no canonical form",
    );
  }
  seen.add(obj);
  try {
    if (Array.isArray(value)) return `[${value.map((v) => serialize(v, seen)).join(",")}]`;
    if (value instanceof Map) {
      const entries = Array.from(value.entries()).map(
        ([k, v]) => [String(k), v] as [string, unknown],
      );
      entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      return `@map{${
        entries.map(([k, v]) => `${JSON.stringify(k)}:${serialize(v, seen)}`).join(",")
      }}`;
    }
    if (value instanceof Set) {
      const items = Array.from(value.values()).map((v) => serialize(v, seen));
      items.sort();
      return `@set[${items.join(",")}]`;
    }
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${serialize(rec[k], seen)}`).join(",")}}`;
  } finally {
    seen.delete(obj);
  }
}

/**
 * SHA-256 of the canonical text, hex encoded with no prefix.
 *
 * The encoding matches the browser `hashCanonical()` exactly, so a hash the
 * client displays and a hash the server persists are directly comparable -
 * `expected_output_hash` conflict detection depends on that.
 */
export async function canonicalHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
