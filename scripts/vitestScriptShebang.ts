import type { Plugin } from 'vite';

const NODE_SHEBANG = /^#![^\r\n]*(?:\r?\n|$)/;

/** Removes only a leading Node launcher line before Vite evaluates a script. */
export function stripNodeShebang(code: string): string {
  return code.replace(NODE_SHEBANG, '');
}

/**
 * Vite prefixes SSR helpers before local `.mjs` content. Without this pre-pass,
 * a valid leading shebang is moved into the module body and becomes invalid
 * JavaScript. Production CLI files retain their launcher; tests see only code.
 */
export function nodeScriptShebangPlugin(): Plugin {
  return {
    name: 'aura-test-strip-node-script-shebang',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].replace(/\\/g, '/');
      if (!/\/scripts\/.*\.mjs$/.test(cleanId)) return null;

      const transformed = stripNodeShebang(code);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
