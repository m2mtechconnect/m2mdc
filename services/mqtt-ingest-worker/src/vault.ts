/**
 * Server-side credential retrieval.
 *
 * The ciphertext never leaves this process in plaintext form: it is decrypted
 * in memory, handed to the broker client and never written to a log, an
 * evidence row or an HTTP response. Mirrors
 * supabase/functions/_shared/credentialVault.ts byte-for-byte in algorithm.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function vaultKey(raw: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function decryptCredential(stored: string, keyMaterial: string): Promise<string> {
  const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: buf.subarray(0, 12) },
    await vaultKey(keyMaterial),
    buf.subarray(12),
  );
  return decoder.decode(plaintext);
}

export interface BrokerCredential {
  username?: string;
  password?: string;
  clientCert?: string;
  clientKey?: string;
  ca?: string;
}

/**
 * Vault material is either a JSON object (mTLS material or username/password)
 * or a bare secret string, in which case it is the password.
 */
export function parseCredential(plaintext: string, fallbackUsername: string | null): BrokerCredential {
  const trimmed = plaintext.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const pick = (k: string) => (typeof parsed[k] === 'string' ? (parsed[k] as string) : undefined);
      return {
        username: pick('username') ?? fallbackUsername ?? undefined,
        password: pick('password'),
        clientCert: pick('client_cert'),
        clientKey: pick('client_key'),
        ca: pick('ca'),
      };
    } catch {
      // fall through: treat as an opaque secret
    }
  }
  return { username: fallbackUsername ?? undefined, password: trimmed };
}