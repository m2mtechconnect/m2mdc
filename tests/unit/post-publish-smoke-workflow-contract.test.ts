import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/post-publish-smoke.yml'),
  'utf8',
);

describe('post-publish smoke workflow contract', () => {
  it('binds automatic smoke to the triggering exact SHA', () => {
    expect(workflow).toContain(
      'AURA_EXPECTED_SHA: ${{ github.event.workflow_run.head_sha || inputs.expected_sha || github.sha }}',
    );
  });

  it('fetches the evidence branch before a lease-protected update', () => {
    const fetchBranch = 'git fetch --no-tags origin "refs/heads/$evidence_ref:$remote_evidence_ref"';
    const checkoutEvidence = 'git checkout -B "$evidence_ref"';
    const leasePush = '--force-with-lease="refs/heads/$evidence_ref:$expected_evidence_oid"';

    const fetchIndex = workflow.indexOf(fetchBranch);
    const checkoutIndex = workflow.indexOf(checkoutEvidence);
    const leasePushIndex = workflow.indexOf(leasePush);

    expect(fetchIndex).toBeGreaterThan(-1);
    expect(checkoutIndex).toBeGreaterThan(fetchIndex);
    expect(leasePushIndex).toBeGreaterThan(checkoutIndex);
  });
});
