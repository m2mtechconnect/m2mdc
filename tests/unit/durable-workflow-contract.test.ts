import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const workflows = fs.readFileSync(path.resolve(process.cwd(), 'supabase/functions/_shared/workflows.ts'), 'utf8');
const provision = fs.readFileSync(path.resolve(process.cwd(), 'supabase/functions/organization-provision/index.ts'), 'utf8');

describe('AURA durable workflow contract', () => {
  it('defaults workflow execution to disabled and supports only the Inngest adapter', () => {
    expect(workflows).toContain("'disabled' | 'inngest'");
    expect(workflows).toContain("Deno.env.get('AURA_WORKFLOW_PROVIDER') ?? 'disabled'");
    expect(workflows).toContain("raw === 'inngest' ? 'inngest' : 'disabled'");
    expect(workflows).toContain("selected === 'disabled'");
    expect(workflows).not.toContain('lovable.app');
    expect(workflows).not.toContain('lovable.dev');
  });

  it('uses server-only workflow configuration and fails closed on insecure endpoints', () => {
    expect(workflows).toContain("Deno.env.get('INNGEST_EVENT_KEY')");
    expect(workflows).toContain("Deno.env.get('AURA_INNGEST_ENDPOINT')");
    expect(workflows).toContain("url.protocol !== 'https:'");
    expect(workflows).not.toContain('VITE_INNGEST');
  });

  it('requires an organization id and prevents caller override', () => {
    expect(workflows).toContain('organizationId: string');
    expect(workflows).toContain("RESERVED_KEYS = new Set(['organization_id'])");
    expect(workflows.indexOf('...sanitizeWorkflowData(event.data)')).toBeLessThan(
      workflows.indexOf('organization_id: event.organizationId'),
    );
  });

  it('filters sensitive workflow payload keys', () => {
    for (const sensitive of [
      'token', 'secret', 'password', 'authorization', 'credential', 'cookie',
      'content', 'document', 'body', 'email', 'phone', 'address', 'api[_-]?key',
    ]) {
      expect(workflows).toContain(sensitive);
    }
  });

  it('enqueues only after organization persistence and never includes invite token or owner email', () => {
    const rpcIndex = provision.indexOf("serviceClient.rpc('platform_provision_organization'");
    const workflowIndex = provision.indexOf('enqueueAuraWorkflow({');
    expect(rpcIndex).toBeGreaterThan(-1);
    expect(workflowIndex).toBeGreaterThan(rpcIndex);

    const workflowBlock = provision.slice(workflowIndex, provision.indexOf('});', workflowIndex) + 3);
    expect(workflowBlock).toContain("name: 'aura/onboarding.organization.provisioned'");
    expect(workflowBlock).toContain('organizationId: result.org_id');
    expect(workflowBlock).toContain('invite_id: result.invite_id');
    expect(workflowBlock).not.toContain('invite_token');
    expect(workflowBlock).not.toContain('ownerEmail');
    expect(workflowBlock).not.toContain('email:');
  });

  it('does not roll back provisioning when workflow delivery is disabled or fails', () => {
    expect(workflows).toContain("status: 'disabled'");
    expect(workflows).toContain("status: 'failed'");
    expect(provision).toContain('workflow,');
    expect(provision).toContain("status: 'pending_owner_acceptance'");
  });
});
