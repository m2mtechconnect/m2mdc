import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('navigation consolidation authority contract', () => {
  const shell = read('src/AuthenticatedShell.tsx');
  const aliases = read('src/config/routeAliases.ts');
  const resolver = read('src/routing/ActiveBlueprintResolver.tsx');
  const header = read('src/components/blueprint/DesignerModeHeader.tsx');
  const blueprint = read('src/pages/Blueprint.tsx');\n  const routeRegistry = read('src/config/routeRegistry.ts');\n  const surfaceRegistry = read('src/data/dataset/surfaceRegistry.ts');

  it('retires standalone Marketplace behind the Builder edit boundary', () => {
    expect(shell).not.toContain('import("./pages/Marketplace")');
    expect(shell).toContain(
      'path="/marketplace" element={<PermissionRouteGuard permission="twin.edit"><PreserveNavigate to="/builder#templates" /></PermissionRouteGuard>}',
    );
  });

  it('classifies the retired Marketplace as a redirect', () => {\n    expect(routeRegistry).toContain("path: '/marketplace', shell: 'internal', kind: 'redirect'");\n    expect(surfaceRegistry).toContain("neutral('/marketplace', 'Retired marketplace redirect'");\n  });\n\n  it('guards every Evidence workspace with reporting access', () => {
    expect(shell).toContain(
      'path="/evidence" element={<PermissionRouteGuard permission="analytics.view"><EvidenceBetaShell /></PermissionRouteGuard>}',
    );
  });

  it('resolves Blueprint from active facility context without a sentinel id', () => {
    expect(aliases).not.toContain("from: '/blueprint'");\n    expect(aliases).not.toContain("/blueprint/default");
    expect(shell).toContain('path="/blueprint"');
    expect(shell).toContain('<ActiveBlueprintResolver />');
    expect(resolver).toContain('if (activeTwinId)');
    expect(resolver).toContain('/blueprint/${activeTwinId}');
    expect(resolver).toContain('Select a facility before opening Blueprint');\n    expect(routeRegistry).toContain("path: '/blueprint', shell: 'internal', kind: 'canonical'");\n    expect(surfaceRegistry).toContain("neutral('/blueprint', 'Blueprint facility resolver'");
  });

  it('derives Blueprint edit affordances from the canonical permission', () => {
    expect(blueprint).toContain("const canEdit = can('twin.edit')");
    expect(blueprint).toContain('canEdit={canEdit}');
    expect(header).toContain("canEdit ? 'Designer - editable' : 'Blueprint - read only'");
    expect(header).toContain('canEdit && onSave');
  });
});
