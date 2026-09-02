// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { nodeScriptShebangPlugin, stripNodeShebang } from '../vitestScriptShebang';

describe('Vitest Node-script shebang handling', () => {
  it('removes the original Unix launcher before Vite prefixes module helpers', () => {
    expect(stripNodeShebang('#!/usr/bin/env node\nexport const ready = true;'))
      .toBe('export const ready = true;');
  });

  it('handles the analogous Windows CRLF representation', () => {
    expect(stripNodeShebang('#!/usr/bin/env node\r\nexport const ready = true;'))
      .toBe('export const ready = true;');
  });

  it('leaves near-miss source and non-script modules unchanged', () => {
    const source = 'const marker = "#!/usr/bin/env node";';
    expect(stripNodeShebang(source)).toBe(source);

    const plugin = nodeScriptShebangPlugin();
    const transform = plugin.transform as unknown as (
      code: string,
      id: string,
    ) => unknown;
    expect(transform(source, 'C:/repo/src/example.mjs')).toBeNull();
  });
});
