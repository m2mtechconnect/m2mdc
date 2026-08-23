import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AURA_DEPLOYMENT_OFFERINGS, deploymentOffering } from '../../src/deployment/deploymentProfiles';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const migration = read('supabase/migrations/20260823233000_organization_deployment_profiles.sql');
const builder = read('src/components/builder/dc-steps/DCStep5Deploy.tsx');
const organizationList = read('supabase/functions/organization-list/index.ts');

describe('AURA deployment topology truth', () => {
  it('keeps shared cloud as the only currently available topology', () => {
    const available = AURA_DEPLOYMENT_OFFERINGS.filter((offering) => offering.capabilityStatus === 'AVAILABLE');
    expect(available.map((offering) => offering.type)).toEqual(['shared_cloud']);
    expect(deploymentOffering('private_cloud').capabilityStatus).toBe('PLANNED');
    expect(deploymentOffering('hybrid').capabilityStatus).toBe('PARTIAL');
    expect(deploymentOffering('sovereign_air_gapped').capabilityStatus).toBe('PLANNED');
  });

  it('creates one server-controlled deployment profile per organization', () => {
    expect(migration).toContain('CREATE TABLE public.organization_deployment_profiles');
    expect(migration).toContain('org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id)');
    expect(migration).toContain("deployment_type text NOT NULL DEFAULT 'shared_cloud'");
    expect(migration).toContain("capability_status text NOT NULL DEFAULT 'AVAILABLE'");
    expect(migration).toContain("automation_status text NOT NULL DEFAULT 'EXISTING_PLATFORM'");
    expect(migration).toContain('ALTER TABLE public.organization_deployment_profiles ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('GRANT SELECT ON public.organization_deployment_profiles TO authenticated');
    expect(migration).toContain('GRANT ALL ON public.organization_deployment_profiles TO service_role');
    expect(migration).not.toMatch(/GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)[^;]+organization_deployment_profiles\s+TO\s+authenticated/i);
  });

  it('backfills and auto-seeds new organizations to the truthful shared-cloud profile', () => {
    expect(migration).toContain("'shared_cloud',\n  'AVAILABLE',\n  'ACTIVE',\n  'EXISTING_PLATFORM'");
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.seed_organization_deployment_profile()');
    expect(migration).toContain('CREATE TRIGGER organizations_seed_deployment_profile');
  });

  it('returns deployment truth in the platform customer inventory', () => {
    expect(organizationList).toContain(".from('organization_deployment_profiles')");
    expect(organizationList).toContain('deploymentProfile: deployment');
    expect(organizationList).toContain('capabilityStatus: deployment.capability_status');
    expect(organizationList).toContain('automationStatus: deployment.automation_status');
  });

  it('does not claim twin activation provisions infrastructure', () => {
    expect(builder).toContain('This action does not provision cloud infrastructure.');
    expect(builder).toContain('Twin Data Region');
    expect(builder).toContain('Infrastructure placement is configured separately.');
    expect(builder).toContain('Save & Activate Twin');
    expect(builder).not.toContain('Choose where your twin will be deployed');
    expect(builder).not.toContain('Data Centre Twin deployed successfully!');
  });
});
