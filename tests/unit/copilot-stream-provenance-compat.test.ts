/**
 * Streaming compatibility for the additive provenance SSE event.
 *
 * The client must keep streaming tokens and structured data unchanged when a
 * provenance event (or any unknown event type) appears in the stream.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import { streamCoPilotResponse } from '@/lib/copilot/streaming';

const SSE_LINES = [
  'data: {"type":"token","content":"Hello "}\n\n',
  'data: {"type":"token","content":"world"}\n\n',
  'data: {"type":"structured","data":{"summary":"s"}}\n\n',
  'data: {"type":"provenance","data":{"schema":"aura.response-provenance.v1","path":"model","model":null}}\n\n',
  'data: {"type":"future-unknown-event","data":{"x":1}}\n\n',
  'data: [DONE]\n\n',
];

function mockStream() {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of SSE_LINES) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('additive provenance SSE event', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => mockStream()));
  });

  it('does not break token, structured or completion handling when unhandled', async () => {
    const tokens: string[] = [];
    let structured: unknown = null;
    let completed = false;
    let error: unknown = null;

    await streamCoPilotResponse({
      query: 'hello',
      context: {},
      sessionId: 's1',
      onToken: (t) => tokens.push(t),
      onStructured: (d) => { structured = d; },
      onComplete: () => { completed = true; },
      onError: (e) => { error = e; },
    });

    expect(error).toBeNull();
    expect(tokens.join('')).toBe('Hello world');
    expect(structured).toEqual({ summary: 's' });
    expect(completed).toBe(true);
  });

  it('delivers the provenance record when a handler opts in', async () => {
    const seen: any[] = [];
    await streamCoPilotResponse({
      query: 'hello',
      context: {},
      sessionId: 's1',
      onToken: () => {},
      onProvenance: (p) => seen.push(p),
      onComplete: () => {},
      onError: () => {},
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].schema).toBe('aura.response-provenance.v1');
  });
});
