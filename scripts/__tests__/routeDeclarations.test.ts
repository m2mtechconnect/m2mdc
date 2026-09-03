// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { collectRouteDeclarations } from '../lib/route-declarations.mjs';

describe('route declaration extraction', () => {
  it('detects a multiline route that the former line parser missed', () => {
    const routes = collectRouteDeclarations('fixture.tsx', `
      <Routes>
        <Route
          path="/blocked-preview"
          element={<Preview />}
        />
      </Routes>
    `);
    expect(routes).toEqual([{ file: 'fixture.tsx', path: '/blocked-preview', devGated: false }]);
  });

  it('recognizes an actual multiline development guard', () => {
    const routes = collectRouteDeclarations('fixture.tsx', `
      <Routes>
        {import.meta.env.DEV && (
          <Route
            path="/blocked-preview"
            element={<Preview />}
          />
        )}
      </Routes>
    `);
    expect(routes[0]).toMatchObject({ path: '/blocked-preview', devGated: true });
  });

  it('does not accept an unrelated DEV reference as a route guard', () => {
    const routes = collectRouteDeclarations('fixture.tsx', `
      const isDevelopment = import.meta.env.DEV;
      export const routes = <Route path="/blocked-preview" element={<Preview />} />;
    `);
    expect(routes[0]).toMatchObject({ path: '/blocked-preview', devGated: false });
  });
});
