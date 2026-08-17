/**
 * Credential vault primitives.
 *
 * Credential material is encrypted with AES-GCM before it ever touches the
 * database, using a key derived from CONNECTION_CREDENTIAL_KEY (a Lovable
 * managed secret available only to backend functions). Nothing in this module
 * may be imported from browser code: the plaintext exists only inside an edge
 * function invocation, and the stored value is opaque to anyone reading the
 * table directly.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function vaultKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('CONNECTION_CREDENTIAL_KEY');
  if (!raw) throw new Error('CONNECTION_CREDENTIAL_KEY is not configured');
  // The stored secret is a random alphanumeric string, not base64, so the
  // AES key is the SHA-256 digest of it.
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptCredential(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await vaultKey(), encoder.encode(plaintext)),
  );
  const buf = new Uint8Array(iv.length + ciphertext.length);
  buf.set(iv);
  buf.set(ciphertext, iv.length);
  return btoa(String.fromCharCode(...buf));
}

/** Server-side only. Never return the result of this to a client response. */
export async function decryptCredential(stored: string): Promise<string> {
  const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: buf.subarray(0, 12) },
    await vaultKey(),
    buf.subarray(12),
  );
  return decoder.decode(plaintext);
}

/**
 * A non-reversible fingerprint operators can compare against the value held in
 * the source system, without the vault ever revealing the secret.
 */
export async function fingerprintCredential(plaintext: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(plaintext)));
  return Array.from(digest.subarray(0, 6)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Refuses material that is obviously a placeholder or too weak to be real. */
export function credentialRejectionReason(plaintext: string): string | null {
  const value = plaintext.trim();
  if (value.length < 12) return 'Credential must be at least 12 characters.';
  if (value.length > 8192) return 'Credential exceeds the 8192 character limit.';
  if (/^(test|demo|example|changeme|password|placeholder)/i.test(value)) {
    return 'Placeholder credentials are refused. Store the real credential or leave the connection unconfigured.';
  }
  return null;
}
