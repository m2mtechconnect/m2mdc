export type NotificationProvider = 'disabled' | 'resend' | 'brevo' | 'mailgun';
export type NotificationDeliveryStatus = 'disabled' | 'not_configured' | 'sent' | 'failed';

export interface NotificationDelivery {
  provider: NotificationProvider;
  status: NotificationDeliveryStatus;
  providerMessageId: string | null;
  error: string | null;
}

interface NotificationMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

interface OrganizationInviteNotification {
  email: string;
  organizationName: string;
  role: string;
  token: string;
  expiresAt: string;
  inviteId: string;
}

const KNOWN_PROVIDERS = new Set<NotificationProvider>(['disabled', 'resend', 'brevo', 'mailgun']);
const PROVIDER_TIMEOUT_MS = 10_000;

function configuredProvider(): NotificationProvider {
  const raw = (Deno.env.get('AURA_NOTIFICATION_PROVIDER') ?? 'disabled').trim().toLowerCase();
  return KNOWN_PROVIDERS.has(raw as NotificationProvider) ? raw as NotificationProvider : 'disabled';
}

function delivery(
  provider: NotificationProvider,
  status: NotificationDeliveryStatus,
  providerMessageId: string | null = null,
  error: string | null = null,
): NotificationDelivery {
  return { provider, status, providerMessageId, error };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeHeaderText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function isAllowedApplicationUrl(url: URL): boolean {
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

function senderConfig(): { address: string; name: string } | null {
  const address = (Deno.env.get('AURA_EMAIL_FROM_ADDRESS') ?? '').trim();
  if (!address) return null;
  const name = safeHeaderText((Deno.env.get('AURA_EMAIL_FROM_NAME') ?? 'AURA').trim() || 'AURA');
  return { address, name };
}

function appBaseUrl(): string | null {
  const raw = (Deno.env.get('AURA_APP_URL') ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!isAllowedApplicationUrl(url)) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function providerError(provider: NotificationProvider, status?: number): NotificationDelivery {
  const suffix = typeof status === 'number' ? ` (HTTP ${status})` : '';
  return delivery(provider, 'failed', null, `Notification provider request failed${suffix}`);
}

async function sendViaResend(message: NotificationMessage, from: { address: string; name: string }): Promise<NotificationDelivery> {
  const provider: NotificationProvider = 'resend';
  const apiKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  if (!apiKey) return delivery(provider, 'not_configured', null, 'Resend credentials are not configured');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: `${from.name} <${from.address}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) return providerError(provider, response.status);
    const body = await response.json().catch(() => ({}));
    return delivery(provider, 'sent', typeof body?.id === 'string' ? body.id : null);
  } catch {
    return providerError(provider);
  }
}

async function sendViaBrevo(message: NotificationMessage, from: { address: string; name: string }): Promise<NotificationDelivery> {
  const provider: NotificationProvider = 'brevo';
  const apiKey = (Deno.env.get('BREVO_API_KEY') ?? '').trim();
  if (!apiKey) return delivery(provider, 'not_configured', null, 'Brevo credentials are not configured');

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: from.address, name: from.name },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        headers: message.idempotencyKey ? { 'X-AURA-Idempotency-Key': message.idempotencyKey } : undefined,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) return providerError(provider, response.status);
    const body = await response.json().catch(() => ({}));
    return delivery(provider, 'sent', typeof body?.messageId === 'string' ? body.messageId : null);
  } catch {
    return providerError(provider);
  }
}

async function sendViaMailgun(message: NotificationMessage, from: { address: string; name: string }): Promise<NotificationDelivery> {
  const provider: NotificationProvider = 'mailgun';
  const apiKey = (Deno.env.get('MAILGUN_API_KEY') ?? '').trim();
  const domain = (Deno.env.get('MAILGUN_DOMAIN') ?? '').trim();
  if (!apiKey || !domain) return delivery(provider, 'not_configured', null, 'Mailgun credentials are not configured');

  const form = new FormData();
  form.set('from', `${from.name} <${from.address}>`);
  form.set('to', message.to);
  form.set('subject', message.subject);
  form.set('html', message.html);
  form.set('text', message.text);
  if (message.idempotencyKey) form.set('v:aura-idempotency-key', message.idempotencyKey);

  try {
    const response = await fetch(`https://api.mailgun.net/v3/${encodeURIComponent(domain)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}` },
      body: form,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) return providerError(provider, response.status);
    const body = await response.json().catch(() => ({}));
    return delivery(provider, 'sent', typeof body?.id === 'string' ? body.id : null);
  } catch {
    return providerError(provider);
  }
}

async function sendNotification(message: NotificationMessage): Promise<NotificationDelivery> {
  const provider = configuredProvider();
  if (provider === 'disabled') return delivery(provider, 'disabled');

  const from = senderConfig();
  if (!from) return delivery(provider, 'not_configured', null, 'AURA sender address is not configured');

  switch (provider) {
    case 'resend':
      return sendViaResend(message, from);
    case 'brevo':
      return sendViaBrevo(message, from);
    case 'mailgun':
      return sendViaMailgun(message, from);
    default:
      return delivery('disabled', 'disabled');
  }
}

export async function sendOrganizationInviteNotification(
  input: OrganizationInviteNotification,
): Promise<NotificationDelivery> {
  const provider = configuredProvider();
  if (provider === 'disabled') return delivery(provider, 'disabled');

  const baseUrl = appBaseUrl();
  if (!baseUrl) return delivery(provider, 'not_configured', null, 'AURA application URL is not configured');

  const acceptUrl = `${baseUrl}/invite/accept?token=${encodeURIComponent(input.token)}`;
  const organizationName = safeHeaderText(input.organizationName.trim() || 'your organization');
  const role = safeHeaderText(input.role.trim() || 'member');
  const expiration = new Date(input.expiresAt);
  const expirationText = Number.isNaN(expiration.getTime()) ? input.expiresAt : expiration.toUTCString();

  const safeOrganization = escapeHtml(organizationName);
  const safeRole = escapeHtml(role);
  const safeUrl = escapeHtml(acceptUrl);
  const safeExpiration = escapeHtml(expirationText);

  return sendNotification({
    to: input.email.trim().toLowerCase(),
    subject: `You're invited to ${organizationName} in AURA`,
    text: [
      `You've been invited to ${organizationName} in AURA with the ${role} role.`,
      `Accept the invitation: ${acceptUrl}`,
      `This invitation expires ${expirationText}.`,
    ].join('\n\n'),
    html: `<!doctype html><html><body><p>You've been invited to <strong>${safeOrganization}</strong> in AURA with the <strong>${safeRole}</strong> role.</p><p><a href="${safeUrl}">Accept invitation</a></p><p>This invitation expires ${safeExpiration}.</p></body></html>`,
    idempotencyKey: `aura-invite-${input.inviteId}`,
  });
}
