import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

interface RepositorySearchOptions {
  roots: string[];
  pattern: RegExp;
  exclude?: (repositoryPath: string) => boolean;
}

const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.aura-local-browser-build',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

/**
 * Search repository source without depending on a runner-installed binary.
 * CI images are intentionally minimal, so policy guards must remain portable
 * while preserving the same repository-wide assertions.
 */
export function repositoryFilesContaining({
  roots,
  pattern,
  exclude = () => false,
}: RepositorySearchOptions): string[] {
  const repositoryRoot = process.cwd();
  const matcher = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
  const matches: string[] = [];

  const visit = (absolutePath: string) => {
    for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;

      const candidate = resolve(absolutePath, entry.name);
      if (entry.isDirectory()) {
        visit(candidate);
        continue;
      }
      if (!entry.isFile()) continue;

      const repositoryPath = relative(repositoryRoot, candidate).replace(/\\/g, '/');
      if (exclude(repositoryPath)) continue;

      try {
        if (matcher.test(readFileSync(candidate, 'utf8'))) matches.push(repositoryPath);
      } catch {
        // Non-text or unreadable files cannot contain a source-code match.
      }
    }
  };

  for (const root of roots) {
    const absoluteRoot = resolve(repositoryRoot, root);
    if (existsSync(absoluteRoot)) visit(absoluteRoot);
  }

  return matches.sort();
}
