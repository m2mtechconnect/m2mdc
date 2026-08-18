/**
 * Phase 3 - canonical serialization + hashing shared by the trusted write
 * boundary. Mirrors `aura-canonical-v1` from the browser orchestrator so a
 * hash computed client-side can be compared with the server-derived hash.
 */
export const CANONICAL_SCHEMA_VERSION = "aura-canonical-v1";
export const EVIDENCE_SCHEMA_VERSION = "aura-evidence-v1";

export function canonicalize(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : `@${String(v)}`;
    if (typeof v === "bigint") return `@bigint:${v.toString()}`;
    if (typeof v === "undefined") return "@undefined";
    if (typeof v !== "object") return v;
    if (seen.has(v as object)) return "@cycle";
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = walk(obj[key]);
    return out;
  };
  return JSON.stringify(walk(value));
}

/** SHA-256 of the canonical form. Prefixed so the algorithm is never implied. */
export async function canonicalHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256-${hex}`;
}