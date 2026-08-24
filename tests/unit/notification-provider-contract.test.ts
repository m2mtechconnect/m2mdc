import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const notifications = read('supabase/functions/_shared/notifications.ts');
const organizationProvision = read('supabase/functions/organization-provision/index.ts');
const teamsInvite = read('supabase/functions/teams-invite/index.ts');
const publicRoutes = read('src/PublicAppRoutes.tsx');
const inviteRedirect = read('src/routing/InviteSignInRedirect.tsx');

describe('AURA notification provider contract', () => {
  it('is provider-neutral and disabled by default', () => {
    expect(notifications).toContain("'disabled' | 'resend' | 'brevo' | 'mailgun'");
    expect(notifications).toContain("Deno.env.get('AURA_NOTIFICATION_PROVIDER') ?? 'disabled'");
    expect(notifications).toContain("provider === 'disabled'");
    expect(notifications).toContain("status: NotificationDeliveryStatus");
    expect(notifications).not.toContain('lovable.app');
    expect(notifications).not.toContain('lovable.dev');
  });

  it('reads provider credentials only from server environment', () => {
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
    expect(notifications).not.toMatch(/(?:re_|xkeysib-|key-)[A-Za-z0-9_-]{16,}/);
  });

  it('uses the real invite route and escapes invite content', () => {
    expect(publicRoutes).toContain('path="/invite/accept"');
    expect(inviteRedirect).toContain('location.search');
    expect(notifications).toContain('/invite/accept?token=${encodeURIComponent(input.token)}');
    expect(notifications).toContain('escapeHtml(organizationName)');
    expect(notifications).toContain('escapeHtml(role)');
    expect(notifications).toContain('escapeHtml(acceptUrl)');
  });

  it('does not expose an owner invite token in the provisioning response', () => {
    expect(organizationProvision).toContain('token: result.invite_token');
    expect(organizationProvision).toContain('sendOrganizationInviteNotification');

    const responseStart = organizationProvision.indexOf('return json(corsHeaders, {\n      success: true');
    expect(responseStart).toBeGreaterThan(-1);
    const response = organizationProvision.slice(responseStart, organizationProvision.indexOf("}, 201);", responseStart));
    expect(response).not.toContain('token:');
    expect(response).toContain('delivery: notification');
  });

  it('creates invitations before attempting delivery and never returns the team invite token', () => {
    const insertIndex = teamsInvite.indexOf(".from('team_invites')");
    const notifyIndex = teamsInvite.indexOf('sendOrganizationInviteNotification({');
    expect(insertIndex).toBeGreaterThan(-1);
    expect(notifyIndex).toBeGreaterThan(insertIndex);

    const responseStart = teamsInvite.indexOf('return json(corsHeaders, {\n      success: true');
    expect(responseStart).toBeGreaterThan(-1);
    const response = teamsInvite.slice(responseStart, teamsInvite.indexOf('});', responseStart));
    expect(response).not.toContain('token');
    expect(response).toContain('delivery: notification');
  });

  it('keeps notification failure non-transactional with invite creation', () => {
    expect(notifications).toContain("return delivery(provider, 'failed'");
    expect(organizationProvision).toContain('status: \'pending_owner_acceptance\'');
    expect(teamsInvite).toContain('Invitation created for ${normalisedEmail}');
  });
});
