import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const peopleLayout = read('src/pages/people/PeopleAccessLayout.tsx');
const capabilityPage = read('src/pages/admin/DsxCapabilityRegistryPage.tsx');
const allowlist = JSON.parse(read('docs/remediation/evidence/pr-0.1/route-allowlist.json')) as {
  production_routes: string[];
  production_blocked_routes: string[];
  development_only_routes: string[];
  redirect_only_routes: string[];
};

describe('P1 Batch C people and access authority separation', () => {
  it('routes active-organization callers to the tenant-specific people surface', () => {
    expect(peopleLayout).toContain("if (activeOrganization)");
    expect(peopleLayout).toContain("if (!can('tenant.view_members'))");
    expect(peopleLayout).toContain('return <TenantPeopleAccess />;');
  });

  it('keeps platform authorization and onboarding behind platform permissions', () => {
    expect(peopleLayout).toContain("can('authz.view_assignments')");
    expect(peopleLayout).toContain("can('platform.view_admin_console')");
    expect(peopleLayout).toContain("if (resolution.status === 'tenant')");
  });
});

describe('P1 Batch C provider-neutral admin presentation', () => {
  it('uses the canonical accelerated AI language for title and heading', () => {
    expect(capabilityPage).toContain("document.title = 'Accelerated AI capability registry | AURA admin'");
    expect(capabilityPage).toContain('>Accelerated AI capability registry</h1>');
    expect(capabilityPage).toContain('A reference mapping is not evidence that a vendor runtime is');
  });

  it('does not present the canonical page as a DSX or connected NVIDIA runtime', () => {
    expect(capabilityPage).not.toContain("document.title = 'DSX capability registry | AURA admin'");
    expect(capabilityPage).not.toContain('>DSX capability registry</h1>');
    expect(capabilityPage).not.toContain('what maps to the NVIDIA Omniverse');
    expect(capabilityPage).toContain('Architecture area:');
    expect(capabilityPage).toContain('Reference source:');
  });
});

describe('P1 route classification', () => {
  it('keeps the mock infrastructure surface out of production', () => {
    expect(allowlist.production_routes).not.toContain('/infrastructure');
    expect(allowlist.development_only_routes).not.toContain('/infrastructure');
    expect(allowlist.redirect_only_routes).toContain('/infrastructure');
  });

  it('promotes the truth-remediated Batch B manage route', () => {
    expect(allowlist.production_routes).toContain('/studio/systems/:systemId/manage');
    expect(allowlist.production_blocked_routes).not.toContain('/studio/systems/:systemId/manage');
  });

  /**
   * The recommendation preview routes were excluded from the production
   * perimeter on 2026-08-27. They remain permission-guarded in the shipped
   * router but are no longer part of the qualified production surface.
   */
  it('keeps the recommendation preview routes out of the production perimeter', () => {
    for (const route of ['/blueprint/preview', '/simulation/preview']) {
      expect(allowlist.production_routes).not.toContain(route);
      expect(allowlist.production_blocked_routes).toContain(route);
    }
  });
});
