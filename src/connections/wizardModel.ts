/**
 * Connection setup wizard: pure, testable step model.
 *
 * Secret-bearing authentication methods are supported through the server-side
 * credential vault: the wizard collects the credential in memory, hands it to
 * the vault edge function once, and never reads it back. Credential material is
 * never persisted in the draft, in query state or in the connection record.
 */
import { canAddConnection, type ConnectorDefinition } from './model';

export const WIZARD_STEPS = [
  { id: 'connector', title: 'Connector', description: 'Choose a connector with a real runtime adapter.' },
  { id: 'scope', title: 'Tenant and scope', description: 'Bind the connection to a tenant, facility and environment.' },
  { id: 'contract', title: 'Data contract', description: 'Declare direction, data classes and the connection name.' },
  { id: 'authentication', title: 'Authentication', description: 'Confirm the authentication method the platform can honour.' },
  { id: 'test', title: 'Test', description: 'Run the server-side health check before activation.' },
  { id: 'activate', title: 'Activate', description: 'Enable the connection once a check has passed.' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

export const ENVIRONMENTS = ['production', 'staging', 'development'] as const;
export const DIRECTIONS = ['READ', 'WRITE', 'READ_WRITE'] as const;

/** Authentication methods that require no stored secret. */
export const VAULT_FREE_AUTH = new Set(['jwt', 'none', 'iam_role', 'workload_identity', 'service_account']);

/** True when the method needs credential material held in the vault. */
export function requiresVaultCredential(authMethod: string): boolean {
  return Boolean(authMethod) && !VAULT_FREE_AUTH.has(authMethod);
}

/** Minimum credential length the vault will accept. Mirrors the server rule. */
export const MIN_CREDENTIAL_LENGTH = 12;

export interface WizardDraft {
  connector_id: string;
  tenant_id: string | null;
  facility_id: string | null;
  environment: string;
  display_name: string;
  data_direction: string;
  data_classes: string[];
  auth_method: string;
  endpoint_reference: string | null;
  /** In-memory only. Sent once to the vault, never persisted client-side. */
  credential_secret: string;
}

export function emptyWizardDraft(): WizardDraft {
  return {
    connector_id: '',
    tenant_id: null,
    facility_id: null,
    environment: 'production',
    display_name: '',
    data_direction: 'READ',
    data_classes: [],
    auth_method: '',
    endpoint_reference: null,
    credential_secret: '',
  };
}

export function selectableConnectors(definitions: ConnectorDefinition[]): ConnectorDefinition[] {
  return definitions.filter(canAddConnection);
}

/** A named, explainable blocker. Never a generic "cannot continue". */
export function authBlocker(
  definition: ConnectorDefinition | undefined,
  authMethod: string,
  credentialSecret = '',
): string | null {
  if (!definition) return 'Select a connector first.';
  if (!authMethod) return 'Select the authentication method this connection will use.';
  if (!definition.supported_auth_methods.includes(authMethod)) {
    return 'This connector does not support the selected authentication method.';
  }
  if (requiresVaultCredential(authMethod)) {
    const secret = credentialSecret.trim();
    if (!secret) {
      return 'This authentication method needs a credential. Enter it here; it is encrypted server-side and never read back.';
    }
    if (secret.length < MIN_CREDENTIAL_LENGTH) {
      return `The credential must be at least ${MIN_CREDENTIAL_LENGTH} characters.`;
    }
  }
  return null;
}

export interface StepValidation {
  complete: boolean;
  /** Reason the step is incomplete, shown in place. */
  reason: string | null;
}

export function validateStep(
  step: WizardStepId,
  draft: WizardDraft,
  definition: ConnectorDefinition | undefined,
  existing: Array<{ connector_id: string; environment: string; tenant_id: string | null; facility_id: string | null; display_name: string }>,
  lastCheckPassed: boolean,
): StepValidation {
  switch (step) {
    case 'connector':
      if (!draft.connector_id) return { complete: false, reason: 'Choose a connector.' };
      if (!definition || !canAddConnection(definition)) {
        return { complete: false, reason: 'This connector has no runtime adapter, so no connection can be created.' };
      }
      return { complete: true, reason: null };
    case 'scope':
      if (!draft.environment) return { complete: false, reason: 'Choose an environment.' };
      return { complete: true, reason: null };
    case 'contract': {
      if (draft.display_name.trim().length < 3) {
        return { complete: false, reason: 'Enter a connection name of at least 3 characters.' };
      }
      if (definition && !definition.supported_directions.some((d) => draft.data_direction.includes(d))) {
        return { complete: false, reason: 'This connector does not support the selected direction.' };
      }
      if (draft.data_classes.length === 0) {
        return { complete: false, reason: 'Select at least one data class.' };
      }
      if (isDuplicateScope(draft, existing)) {
        return { complete: false, reason: 'A connection with this connector, environment, scope and name already exists.' };
      }
      return { complete: true, reason: null };
    }
    case 'authentication': {
      const blocker = authBlocker(definition, draft.auth_method, draft.credential_secret);
      return { complete: !blocker, reason: blocker };
    }
    case 'test':
      return lastCheckPassed
        ? { complete: true, reason: null }
        : { complete: false, reason: 'Run the server-side health check and wait for a passing result.' };
    case 'activate':
      return lastCheckPassed
        ? { complete: true, reason: null }
        : { complete: false, reason: 'Activation requires a passing server-side health check.' };
    default:
      return { complete: false, reason: 'Unknown step.' };
  }
}

export function isDuplicateScope(
  draft: WizardDraft,
  existing: Array<{ connector_id: string; environment: string; tenant_id: string | null; facility_id: string | null; display_name: string }>,
): boolean {
  return existing.some(
    (c) =>
      c.connector_id === draft.connector_id &&
      c.environment === draft.environment &&
      (c.tenant_id ?? null) === (draft.tenant_id ?? null) &&
      (c.facility_id ?? null) === (draft.facility_id ?? null) &&
      c.display_name.trim().toLowerCase() === draft.display_name.trim().toLowerCase(),
  );
}

/** Steps completed before the draft is persisted server-side. */
export const PRE_PERSIST_STEPS: WizardStepId[] = ['connector', 'scope', 'contract', 'authentication'];

export function canPersistDraft(
  draft: WizardDraft,
  definition: ConnectorDefinition | undefined,
  existing: Parameters<typeof isDuplicateScope>[1],
): boolean {
  return PRE_PERSIST_STEPS.every((step) => validateStep(step, draft, definition, existing, false).complete);
}
