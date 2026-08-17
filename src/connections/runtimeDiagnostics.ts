/**
 * Runtime diagnostics for the connections control plane.
 *
 * Answers one question truthfully, per connection and per tenant: why does this
 * tenant have 0 active signal-to-twin mappings and 0 vaulted credentials?
 *
 * Every finding is derived from rows that actually exist (or provably do not
 * exist) in the database. Nothing here infers a cause it cannot evidence, and
 * nothing here is simulated.
 */
import { validateMapping, type MappingDraft } from './mappingValidation';

export type FindingSeverity = 'BLOCKER' | 'WARNING' | 'INFO';
export type FindingArea = 'connection' | 'contract' | 'mapping' | 'credential';

export interface DiagnosticFinding {
  code: string;
  area: FindingArea;
  severity: FindingSeverity;
  title: string;
  /** What the data actually shows. */
  detail: string;
  /** The next concrete action that removes this blocker. */
  remedy: string;
  /** Named fields that are missing, when the finding is about missing evidence. */
  missingFields?: string[];
}

export interface DiagnosticsConnectionRow {
  id: string;
  connector_id: string;
  display_name: string;
  tenant_id: string | null;
  status: string;
  enabled: boolean;
  status_reason?: string | null;
  last_error?: string | null;
}

export interface DiagnosticsContractRow {
  id: string;
  connector_id: string;
  direction: string;
  schema_type: string | null;
  schema_version: string | null;
  validation_status: string;
  unit_rules: Record<string, unknown> | null;
  timestamp_rules: Record<string, unknown> | null;
  official_source: string | null;
  checksum: string | null;
}

export interface DiagnosticsMappingRow extends Partial<MappingDraft> {
  id: string;
  connection_id: string;
  source_identifier: string;
  data_type: string;
  direction: string;
  validation_status: string;
  active: boolean;
}

export interface DiagnosticsCredentialRow {
  id: string;
  connection_id: string;
  status: string;
  auth_method: string;
  version: number;
  expires_at: string | null;
}

export interface DiagnosticsCredentialEvent {
  connection_id: string;
  action: string;
  version: number;
  created_at: string;
}

export interface ConnectionDiagnosis {
  connectionId: string;
  displayName: string;
  connectorId: string;
  tenantId: string | null;
  mappingCount: number;
  activeMappingCount: number;
  credentialCount: number;
  activeCredentialCount: number;
  findings: DiagnosticFinding[];
}

export interface TenantDiagnosis {
  tenantId: string | null;
  connectionCount: number;
  activeMappingCount: number;
  activeCredentialCount: number;
  connections: ConnectionDiagnosis[];
  /** Findings that apply to the tenant as a whole, not one connection. */
  tenantFindings: DiagnosticFinding[];
}

const FAILED_EVENT_ACTIONS = ['failed', 'error', 'denied', 'rejected'];

function isEmptyRules(rules: Record<string, unknown> | null | undefined): boolean {
  return !rules || Object.keys(rules).length === 0;
}

export function isVaultFailureEvent(action: string): boolean {
  const needle = action.toLowerCase();
  return FAILED_EVENT_ACTIONS.some((token) => needle.includes(token));
}

/** Contract fields the ingestion runtime requires before a mapping can validate. */
export function diagnoseContract(
  connectorId: string,
  contract: DiagnosticsContractRow | null,
): DiagnosticFinding[] {
  if (!contract) {
    return [
      {
        code: 'NO_INBOUND_CONTRACT',
        area: 'contract',
        severity: 'BLOCKER',
        title: 'No inbound data contract',
        detail: `No inbound contract exists for connector ${connectorId}, so no signal can be validated or mapped.`,
        remedy: 'Publish an inbound data contract for this connector in the Contracts tab.',
      },
    ];
  }

  const findings: DiagnosticFinding[] = [];
  const missing: string[] = [];
  if (isEmptyRules(contract.unit_rules)) missing.push('unit_rules');
  if (isEmptyRules(contract.timestamp_rules)) missing.push('timestamp_rules');
  if (!contract.schema_type) missing.push('schema_type');
  if (!contract.schema_version) missing.push('schema_version');

  if (missing.length > 0) {
    findings.push({
      code: 'CONTRACT_MISSING_FIELDS',
      area: 'contract',
      severity: 'BLOCKER',
      title: 'Inbound contract is incomplete',
      detail: `Contract ${contract.id} is missing ${missing.join(', ')}. Unit conversion and timestamp authority cannot be resolved without them.`,
      remedy: 'Complete the missing contract fields, then revalidate the contract.',
      missingFields: missing,
    });
  }

  if (contract.validation_status !== 'VALIDATED') {
    findings.push({
      code: 'CONTRACT_NOT_VALIDATED',
      area: 'contract',
      severity: 'BLOCKER',
      title: 'Contract is not validated',
      detail: `Contract ${contract.id} is ${contract.validation_status}. Mappings cannot be activated against an unvalidated contract.`,
      remedy: 'Validate the contract before activating mappings.',
    });
  }

  const provenanceMissing: string[] = [];
  if (!contract.official_source) provenanceMissing.push('official_source');
  if (!contract.checksum) provenanceMissing.push('checksum');
  if (provenanceMissing.length > 0) {
    findings.push({
      code: 'CONTRACT_MISSING_PROVENANCE',
      area: 'contract',
      severity: 'WARNING',
      title: 'Contract provenance is incomplete',
      detail: `Contract ${contract.id} has no ${provenanceMissing.join(' and ')}, so its origin cannot be proven.`,
      remedy: 'Record the official source document and checksum for this contract.',
      missingFields: provenanceMissing,
    });
  }

  return findings;
}

export function diagnoseMappings(
  connection: DiagnosticsConnectionRow,
  mappings: DiagnosticsMappingRow[],
): DiagnosticFinding[] {
  if (mappings.length === 0) {
    return [
      {
        code: 'NO_MAPPING_ROWS',
        area: 'mapping',
        severity: 'BLOCKER',
        title: 'No signal-to-twin mappings exist',
        detail: `Connection "${connection.display_name}" has no mapping rows at all, so no ingested signal can reach a twin property.`,
        remedy: 'Create a mapping in the Mappings tab: source identifier, target facility, target asset or prim path, target property, units and timestamp rule.',
      },
    ];
  }

  const findings: DiagnosticFinding[] = [];
  const inactive = mappings.filter((m) => !m.active);

  for (const mapping of inactive) {
    const draft: MappingDraft = {
      connection_id: mapping.connection_id,
      source_identifier: mapping.source_identifier ?? '',
      target_facility_id: mapping.target_facility_id ?? null,
      target_entity: mapping.target_entity ?? null,
      target_prim_path: mapping.target_prim_path ?? null,
      target_property: mapping.target_property ?? null,
      source_unit: mapping.source_unit ?? null,
      target_unit: mapping.target_unit ?? null,
      conversion_rule: mapping.conversion_rule ?? null,
      data_type: mapping.data_type,
      direction: mapping.direction,
      quality_rule: mapping.quality_rule ?? null,
      timestamp_rule: mapping.timestamp_rule ?? null,
      active: mapping.active,
    };
    const result = validateMapping(draft);

    if (result.canActivate) {
      findings.push({
        code: 'MAPPING_VALID_BUT_INACTIVE',
        area: 'mapping',
        severity: 'BLOCKER',
        title: `Mapping "${mapping.source_identifier}" is complete but switched off`,
        detail: 'Every required field is present and the mapping validates, but active is false so the runtime skips it.',
        remedy: 'Activate the mapping in the Mappings tab.',
      });
    } else {
      findings.push({
        code: 'MAPPING_INCOMPLETE',
        area: 'mapping',
        severity: 'BLOCKER',
        title: `Mapping "${mapping.source_identifier}" cannot be activated`,
        detail: result.errors.join(' '),
        remedy: 'Complete the listed fields in the mapping editor, then activate the mapping.',
        missingFields: result.errors,
      });
    }
  }

  return findings;
}

export function diagnoseCredentials(
  connection: DiagnosticsConnectionRow,
  credentials: DiagnosticsCredentialRow[],
  events: DiagnosticsCredentialEvent[],
  now: Date = new Date(),
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const failures = events.filter((e) => isVaultFailureEvent(e.action));

  if (credentials.length === 0) {
    findings.push({
      code: failures.length > 0 ? 'VAULT_WRITE_FAILED' : 'NO_VAULTED_CREDENTIAL',
      area: 'credential',
      severity: 'BLOCKER',
      title: failures.length > 0 ? 'Credential was never stored: vault writes failed' : 'No credential in the vault',
      detail:
        failures.length > 0
          ? `The vault holds no credential for "${connection.display_name}". The most recent failed vault event is ${failures[0].action} at ${failures[0].created_at}.`
          : `The vault holds no credential for "${connection.display_name}", and no vault event has ever been recorded for it, so no store attempt was made.`,
      remedy:
        failures.length > 0
          ? 'Retry the credential store from the Credential vault dialog and check the connection-credential function logs for the recorded failure.'
          : 'Store the broker credential through the Credential vault dialog. Credentials are never accepted from the browser in plaintext storage.',
    });
    return findings;
  }

  for (const credential of credentials) {
    if (credential.status.toLowerCase() === 'revoked') {
      findings.push({
        code: 'CREDENTIAL_REVOKED',
        area: 'credential',
        severity: 'BLOCKER',
        title: `Credential v${credential.version} is revoked`,
        detail: `The ${credential.auth_method} credential for "${connection.display_name}" was revoked, so the worker refuses to connect.`,
        remedy: 'Rotate in a new credential through the Credential vault dialog.',
      });
      continue;
    }
    if (credential.expires_at && Date.parse(credential.expires_at) < now.getTime()) {
      findings.push({
        code: 'CREDENTIAL_EXPIRED',
        area: 'credential',
        severity: 'BLOCKER',
        title: `Credential v${credential.version} expired`,
        detail: `The credential expired at ${credential.expires_at} and is treated as absent by the runtime.`,
        remedy: 'Rotate the credential; the runtime only accepts an active, unexpired entry.',
      });
      continue;
    }
    if (credential.status.toLowerCase() !== 'active') {
      findings.push({
        code: 'CREDENTIAL_NOT_ACTIVE',
        area: 'credential',
        severity: 'BLOCKER',
        title: `Credential v${credential.version} is ${credential.status}`,
        detail: 'Only a credential with status "active" is resolved by the ingestion worker.',
        remedy: 'Re-store or rotate the credential so it becomes active.',
      });
    }
  }

  if (failures.length > 0) {
    findings.push({
      code: 'VAULT_EVENT_FAILURES',
      area: 'credential',
      severity: 'WARNING',
      title: `${failures.length} failed vault event(s) recorded`,
      detail: `Most recent: ${failures[0].action} (v${failures[0].version}) at ${failures[0].created_at}.`,
      remedy: 'Review the credential history and the connection-credential function logs before the next rotation.',
    });
  }

  return findings;
}

export function diagnoseConnection(input: {
  connection: DiagnosticsConnectionRow;
  contract: DiagnosticsContractRow | null;
  mappings: DiagnosticsMappingRow[];
  credentials: DiagnosticsCredentialRow[];
  credentialEvents: DiagnosticsCredentialEvent[];
  now?: Date;
}): ConnectionDiagnosis {
  const { connection, contract, mappings, credentials, credentialEvents } = input;
  const findings: DiagnosticFinding[] = [];

  if (!connection.enabled) {
    findings.push({
      code: 'CONNECTION_DISABLED',
      area: 'connection',
      severity: 'BLOCKER',
      title: 'Connection is disabled',
      detail: `"${connection.display_name}" is ${connection.status}${connection.status_reason ? `: ${connection.status_reason}` : ''}. A disabled connection never starts ingestion, so mappings and credentials are never exercised.`,
      remedy: 'Resolve the blocking reason and enable the connection in the setup wizard.',
    });
  }
  if (connection.last_error) {
    findings.push({
      code: 'CONNECTION_LAST_ERROR',
      area: 'connection',
      severity: 'WARNING',
      title: 'Last recorded error',
      detail: connection.last_error,
      remedy: 'Re-run the health check once the blockers below are cleared.',
    });
  }

  findings.push(...diagnoseContract(connection.connector_id, contract));
  findings.push(...diagnoseMappings(connection, mappings));
  findings.push(...diagnoseCredentials(connection, credentials, credentialEvents, input.now));

  return {
    connectionId: connection.id,
    displayName: connection.display_name,
    connectorId: connection.connector_id,
    tenantId: connection.tenant_id,
    mappingCount: mappings.length,
    activeMappingCount: mappings.filter((m) => m.active).length,
    credentialCount: credentials.length,
    activeCredentialCount: credentials.filter(
      (c) =>
        c.status.toLowerCase() === 'active' &&
        (!c.expires_at || Date.parse(c.expires_at) >= (input.now ?? new Date()).getTime()),
    ).length,
    findings,
  };
}

export function diagnoseTenant(input: {
  tenantId: string | null;
  connections: DiagnosticsConnectionRow[];
  contracts: DiagnosticsContractRow[];
  mappings: DiagnosticsMappingRow[];
  credentials: DiagnosticsCredentialRow[];
  credentialEvents: DiagnosticsCredentialEvent[];
  now?: Date;
}): TenantDiagnosis {
  const tenantFindings: DiagnosticFinding[] = [];

  if (input.connections.length === 0) {
    tenantFindings.push({
      code: 'NO_CONNECTIONS',
      area: 'connection',
      severity: 'BLOCKER',
      title: 'No connections are visible for this tenant',
      detail: 'Either no connection has been created, or tenant scoping hides every existing connection from the current session.',
      remedy: 'Create a connection with the setup wizard, or confirm your tenant assignment.',
    });
  }

  const bestContract = (connectorId: string): DiagnosticsContractRow | null => {
    const candidates = input.contracts
      .filter((c) => c.connector_id === connectorId && c.direction.toLowerCase() === 'inbound')
      .sort((a, b) => String(b.schema_version ?? '').localeCompare(String(a.schema_version ?? '')));
    return candidates[0] ?? null;
  };

  const connections = input.connections.map((connection) =>
    diagnoseConnection({
      connection,
      contract: bestContract(connection.connector_id),
      mappings: input.mappings.filter((m) => m.connection_id === connection.id),
      credentials: input.credentials.filter((c) => c.connection_id === connection.id),
      credentialEvents: input.credentialEvents
        .filter((e) => e.connection_id === connection.id)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
      now: input.now,
    }),
  );

  return {
    tenantId: input.tenantId,
    connectionCount: input.connections.length,
    activeMappingCount: connections.reduce((sum, c) => sum + c.activeMappingCount, 0),
    activeCredentialCount: connections.reduce((sum, c) => sum + c.activeCredentialCount, 0),
    connections,
    tenantFindings,
  };
}
