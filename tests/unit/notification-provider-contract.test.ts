import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const notifications = read('supabase/functions/_shared/notifications.ts');
const teamsInvite = read('supabase/functions/teams-invite/index.ts');
const publicRoutes = read('src/PublicAppRoutes.tsx');
const inviteRedirect = read('src/routing/InviteSignInRedirect.tsx');

describe('AURA notification provider contract', () => {
  it('is provider-neutral and disabled by default', () => {
    expect(notifications).toContain("'disabled' | 'resend' | 'brevo' | 'mailgun'");
    expect(notifications).toContain("Deno.env.get('AURA_NOTIFICATION_PROVIDER') ?? 'disabled'");
    expect(notifications).toContain("provider === 'disabled'");
    expect(notifications).toContain('status: NotificationDeliveryStatus');
    expect(notifications).not.toContain('lovable.app');
    expect(notifications).not.toContain('lovable.dev');
  });

  it('reads provider credentials only from server environment and bounds provider calls', () => {
    for (const envName of [
      'RESEND_API_KEY',
      'BREVO_API_KEY',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'AURA_EMAIL_FROM_ADDRESS',
      'AURA_EMAIL_FROM_NAME',
      'AURA_APP_URL',
    ]) {
      expect(notifications).toContain(`Deno.env.get('${envName}')`);
    }
    expect(notifications).toContain('AbortSignal.timeout(PROVIDER_TIMEOUT_MS)');
    expect(notifications).not.toMatch(/(?:re_|xkeysib-|key-)[A-Za-z0-9_-]{16,}/);
  });

  it('uses the real invite route, escapes content and permits local HTTP only for development', () => {
    expect(publicRoutes).toContain('path="/invite/accept"');
    expect(inviteRedirect).toContain('location.search');
    expect(notifications).toContain('/invite/accept?token=${encodeURIComponent(input.token)}');
    expect(notifications).toContain('escapeHtml(organizationName)');
    expect(notifications).toContain('escapeHtml(role)');
    expect(notifications).toContain('escapeHtml(acceptUrl)');
    expect(notifications).toContain("url.protocol === 'https:'");
    expect(notifications).toContain("url.protocol === 'http:'");
  });

  it('does not expose an owner invite token in the platform-provision response', () => {
    const modeStart = teamsInvite.indexOf("mode === 'platform_provision'");
    expect(modeStart).toBeGreaterThan(-1);
    expect(teamsInvite).toContain('token: result.invite_token');
    expect(teamsInvite).toContain('sendOrganizationInviteNotification');

    const workflowStart = teamsInvite.indexOf("name: 'aura/onboarding.organization.provisioned'", modeStart);
    const responseStart = teamsInvite.indexOf('return json(corsHeaders, {', workflowStart);
    const responseEnd = teamsInvite.indexOf('}, 201);', responseStart);
    const response = teamsInvite.slice(responseStart, responseEnd);
    expect(responseStart).toBeGreaterThan(workflowStart);
    expect(response).not.toContain('token:');
    expect(response).toContain('delivery: notification');
  });

  it('creates tenant invitations before attempting delivery and never returns the token', () => {
    const insertIndex = teamsInvite.lastIndexOf(".from('team_invites')");
    const notifyIndex = teamsInvite.lastIndexOf('sendOrganizationInviteNotification({');
    expect(insertIndex).toBeGreaterThan(-1);
    expect(notifyIndex).toBeGreaterThan(insertIndex);

    const workflowStart = teamsInvite.lastIndexOf("name: 'aura/onboarding.invite.created'");
    const responseStart = teamsInvite.indexOf('return json(corsHeaders, {', workflowStart);
    const responseEnd = teamsInvite.indexOf('}, 201);', responseStart);
    const response = teamsInvite.slice(responseStart, responseEnd);
    expect(responseStart).toBeGreaterThan(workflowStart);
    expect(response).not.toContain('token,');
    expect(response).toContain('delivery: notification');
  });

  it('keeps notification failure non-transactional with persisted invitation state', () => {
    expect(notifications).toContain("return delivery(provider, 'failed'");
    expect(teamsInvite).toContain("status: 'pending_owner_acceptance'");
    expect(teamsInvite).toContain('Invitation created for ${email}');
  });
});
