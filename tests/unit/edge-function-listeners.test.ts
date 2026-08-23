import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const functionsRoot = join(process.cwd(), 'supabase', 'functions');

function entrypointsUsingSharedHandlerWithoutListener(): string[] {
  return readdirSync(functionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
    .flatMap((entry) => {
      const entrypoint = join(functionsRoot, entry.name, 'index.ts');
      if (!existsSync(entrypoint)) return [];

      const source = readFileSync(entrypoint, 'utf8');
      if (!/\bcreateHandler\s*</.test(source) && !/\bcreateHandler\s*\(/.test(source)) return [];

      const startsHttpListener = /\bserve\s*\(/.test(source) || /\bDeno\.serve\s*\(/.test(source);
      return startsHttpListener ? [] : [entry.name];
    })
    .sort();
}

describe('Supabase Edge Function entrypoints', () => {
  it('starts an HTTP listener when using the shared createHandler boundary', () => {
    expect(entrypointsUsingSharedHandlerWithoutListener()).toEqual([]);
  });
});
