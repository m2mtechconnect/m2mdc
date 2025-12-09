import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export interface RestCallOptions<TResponse> {
  name: string;                // short name for logs
  url: string;
  options?: RequestInit;
  responseSchema: z.ZodType<TResponse>;
  timeoutMs?: number;
  correlationId?: string;
}

/**
 * Typed REST client for external APIs with:
 * - Automatic timeouts
 * - Zod schema validation
 * - Structured error handling
 * - Performance logging
 */
export async function callExternalApi<TResponse>({
  name,
  url,
  options = {},
  responseSchema,
  timeoutMs = 15000,
  correlationId,
}: RestCallOptions<TResponse>): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = Date.now();
  const logPrefix = correlationId ? `[REST:${correlationId}]` : "[REST]";

  try {
    console.log(logPrefix, name, "calling", url);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(logPrefix, name, "failed", {
        status: res.status,
        statusText: res.statusText,
        body: text.slice(0, 500),
      });
      throw new Error(`REST ${name} failed with status ${res.status}: ${res.statusText}`);
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      console.error(logPrefix, name, "invalid JSON", text.slice(0, 300));
      throw new Error(`REST ${name} returned invalid JSON`);
    }

    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      console.error(logPrefix, name, "schema mismatch", {
        issues: parsed.error.issues,
        received: json,
      });
      throw new Error(`REST ${name} response schema mismatch: ${parsed.error.message}`);
    }

    const duration = Date.now() - startedAt;
    console.log(logPrefix, name, "ok in", duration, "ms");
    
    return parsed.data;
  } catch (error) {
    const duration = Date.now() - startedAt;
    console.error(logPrefix, name, "error after", duration, "ms", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
