/**
 * Phase 6 guard: AURA's generic MQTT/NATS bridge must not be presented as
 * NVIDIA's DSX Exchange product.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AURA_MESSAGE_BRIDGE,
  EXCHANGE_BOUNDARIES,
  NVIDIA_DSX_EXCHANGE,
  auraImplementedBoundary,
  claimsNvidiaExchange,
} from '../exchangeBoundary';

const ROOT = process.cwd();
const AURA_TRANSPORT_DIRS = ['src/dsx/exchange', 'src/runtime/mqtt'];
const EXEMPT = new Set([
  'src/dsx/exchange/exchangeBoundary.ts',
  'src/dsx/exchange/index.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      walk(full, out);
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

describe('exchange boundary naming', () => {
  it('separates the AURA bridge from the NVIDIA product', () => {
    expect(AURA_MESSAGE_BRIDGE.owner).toBe('aura');
    expect(AURA_MESSAGE_BRIDGE.implementedByAura).toBe(true);
    expect(NVIDIA_DSX_EXCHANGE.owner).toBe('nvidia');
    expect(NVIDIA_DSX_EXCHANGE.implementedByAura).toBe(false);
    expect(auraImplementedBoundary()).toBe(AURA_MESSAGE_BRIDGE);
  });

  it('never labels an AURA-implemented boundary with the vendor name', () => {
    for (const boundary of EXCHANGE_BOUNDARIES) {
      if (!boundary.implementedByAura) continue;
      expect(claimsNvidiaExchange(boundary.label)).toBe(false);
    }
  });

  it('keeps vendor-name claims out of AURA transport code', () => {
    const offenders: string[] = [];
    for (const dir of AURA_TRANSPORT_DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        if (EXEMPT.has(file)) continue;
        const src = readFileSync(join(ROOT, file), 'utf8');
        // Strip comments: prose may explain the distinction.
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
        if (/DSX Exchange/i.test(code)) offenders.push(file);
      }
    }
    expect(offenders, 'use AURA_MESSAGE_BRIDGE.label instead').toEqual([]);
  });
});
