export type AuraIntelligenceProfileId =
  | 'fast'
  | 'balanced'
  | 'reasoning'
  | 'research'
  | 'vision'
  | 'voice';

export type AuraRuntimeKind =
  | 'aura_managed'
  | 'aura_native'
  | 'automation'
  | 'custom'
  | 'edge';

export type AuraCapabilityCategory =
  | 'business_app'
  | 'knowledge'
  | 'data_platform'
  | 'automation'
  | 'facility_ot'
  | 'physical_ai'
  | 'observability'
  | 'storage_twin'
  | 'custom';

export interface AuraIntelligenceProfile {
  id: AuraIntelligenceProfileId;
  name: string;
  description: string;
  bestFor: string;
  /** Internal runtime routing only. Never render this value in customer UI. */
  runtimeModel: string;
  /** Internal runtime routing only. Never render this value in customer UI. */
  runtimeProvider: string;
  supportsVision?: boolean;
  supportsVoice?: boolean;
  supportsResearch?: boolean;
}

/**
 * Customer-facing AI profiles. Product surfaces should render these names and
 * descriptions instead of model-vendor or infrastructure names.
 */
export const AURA_INTELLIGENCE_PROFILES: readonly AuraIntelligenceProfile[] = [
  {
    id: 'fast',
    name: 'Fast',
    description: 'Low-latency intelligence for operational interactions and routine tasks.',
    bestFor: 'Status checks, classifications, concise operator assistance',
    runtimeProvider: 'google',
    runtimeModel: 'google/gemini-2.5-flash-lite',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default AURA intelligence for everyday analysis, workflows and agent actions.',
    bestFor: 'General operations, workflows, structured analysis',
    runtimeProvider: 'google',
    runtimeModel: 'google/gemini-2.5-flash',
  },
  {
    id: 'reasoning',
    name: 'Advanced Reasoning',
    description: 'Deeper reasoning for engineering investigations and complex operational decisions.',
    bestFor: 'Root-cause analysis, simulation review, multi-step decisions',
    runtimeProvider: 'google',
    runtimeModel: 'google/gemini-3-pro-preview',
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Multi-source investigation with evidence-oriented synthesis and citations.',
    bestFor: 'Standards research, vendor comparison, evidence synthesis',
    runtimeProvider: 'google',
    runtimeModel: 'google/gemini-3-pro-preview',
    supportsResearch: true,
  },
  {
    id: 'vision',
    name: 'Vision',
    description: 'Multimodal intelligence for drawings, equipment imagery, documents and visual evidence.',
    bestFor: 'Blueprints, diagrams, screenshots, equipment imagery',
    runtimeProvider: 'google',
    runtimeModel: 'google/gemini-2.5-pro',
    supportsVision: true,
  },
  {
    id: 'voice',
    name: 'Voice',
    description: 'Speech-enabled operator experiences while preserving AURA policy and audit controls.',
    bestFor: 'Hands-free operations, spoken summaries, voice-assisted workflows',
    runtimeProvider: 'google',
    runtimeModel: 'google/gemini-2.5-flash',
    supportsVoice: true,
  },
] as const;

export function intelligenceProfileForModel(model?: string | null): AuraIntelligenceProfile {
  return (
    AURA_INTELLIGENCE_PROFILES.find((profile) => profile.runtimeModel === model) ??
    AURA_INTELLIGENCE_PROFILES.find((profile) => profile.id === 'balanced')!
  );
}

export function intelligenceProfileById(id?: string | null): AuraIntelligenceProfile {
  return (
    AURA_INTELLIGENCE_PROFILES.find((profile) => profile.id === id) ??
    AURA_INTELLIGENCE_PROFILES.find((profile) => profile.id === 'balanced')!
  );
}

export interface AuraManagedCapability {
  id: string;
  name: string;
  category: AuraCapabilityCategory;
  runtime: AuraRuntimeKind;
  description: string;
  /** Provider metadata is administrative only and must never be customer copy. */
  internalProvider?: string;
  requiresUserAuthorization?: boolean;
  availability: 'available' | 'requires_configuration' | 'planned';
}

/**
 * Commodity capabilities AURA can delegate to managed connector/runtime
 * infrastructure. These descriptors are white-label product metadata only;
 * connected/healthy status must continue to come from runtime evidence.
 */
export const AURA_MANAGED_CAPABILITIES: readonly AuraManagedCapability[] = [
  { id: 'gmail', name: 'Gmail', category: 'business_app', runtime: 'aura_managed', description: 'Email context and approved messaging actions.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'google-drive', name: 'Google Drive', category: 'knowledge', runtime: 'aura_managed', description: 'Governed files and document knowledge sources.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'google-sheets', name: 'Google Sheets', category: 'data_platform', runtime: 'aura_managed', description: 'Read and update approved spreadsheet data.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'microsoft-teams', name: 'Microsoft Teams', category: 'business_app', runtime: 'aura_managed', description: 'Approved channel messaging and collaboration actions.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'microsoft-sharepoint', name: 'Microsoft SharePoint', category: 'knowledge', runtime: 'aura_managed', description: 'Governed sites, lists and document libraries.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'slack', name: 'Slack', category: 'business_app', runtime: 'aura_managed', description: 'Approved workspace messaging and collaboration actions.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'salesforce', name: 'Salesforce', category: 'business_app', runtime: 'aura_managed', description: 'Customer and operational CRM context.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'hubspot', name: 'HubSpot', category: 'business_app', runtime: 'aura_managed', description: 'CRM records and approved workflow actions.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'notion', name: 'Notion', category: 'knowledge', runtime: 'aura_managed', description: 'Approved pages and workspace knowledge.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'github', name: 'GitHub', category: 'business_app', runtime: 'aura_managed', description: 'Repository, issue and pull-request context.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'snowflake', name: 'Snowflake', category: 'data_platform', runtime: 'aura_managed', description: 'Governed analytics and warehouse data.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'databricks', name: 'Databricks', category: 'data_platform', runtime: 'aura_managed', description: 'Lakehouse analytics and AI data access.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'bigquery', name: 'BigQuery', category: 'data_platform', runtime: 'aura_managed', description: 'Governed warehouse queries and analytics data.', internalProvider: 'managed_connector', requiresUserAuthorization: true, availability: 'available' },
  { id: 'aws-s3', name: 'Amazon S3', category: 'data_platform', runtime: 'aura_managed', description: 'Governed object and file access.', internalProvider: 'managed_connector', availability: 'available' },
  { id: 'firecrawl', name: 'Web Knowledge', category: 'knowledge', runtime: 'aura_managed', description: 'Approved web retrieval and ingestion.', internalProvider: 'managed_connector', availability: 'available' },
  { id: 'perplexity', name: 'Research Search', category: 'knowledge', runtime: 'aura_managed', description: 'Evidence-oriented external research capability.', internalProvider: 'managed_connector', availability: 'available' },
  { id: 'n8n', name: 'Workflow Automation', category: 'automation', runtime: 'automation', description: 'Optional business-process automation runtime.', internalProvider: 'n8n', availability: 'requires_configuration' },
  { id: 'inngest', name: 'Durable Execution', category: 'automation', runtime: 'automation', description: 'Durable background execution and retryable internal jobs.', internalProvider: 'inngest', availability: 'requires_configuration' },
] as const;

export const AURA_NATIVE_CAPABILITY_IDS = new Set([
  'bacnet_ip',
  'modbus_tcp',
  'opcua',
  'snmp',
  'dcim_rest',
  'redfish',
  'nvidia_dcgm',
  'dsx_ingest_gateway',
  'dsx_exchange',
  'mqtt_transport',
  'prometheus',
  'prometheus_otel',
  'grafana',
  'openusd_storage',
  'ddn_infinia',
]);

export function customerFacingRuntimeLabel(runtime: AuraRuntimeKind): string {
  switch (runtime) {
    case 'aura_managed': return 'AURA Managed';
    case 'aura_native': return 'AURA Native';
    case 'automation': return 'AURA Automation';
    case 'edge': return 'AURA Edge';
    case 'custom': return 'Custom';
  }
}
