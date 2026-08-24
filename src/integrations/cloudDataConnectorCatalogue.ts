export type AuraCloudDataConnectorId =
  | 'aws_s3'
  | 'aws_athena'
  | 'redshift'
  | 'snowflake'
  | 'databricks'
  | 'bigquery'
  | 'fabric'
  | 'clickhouse';

export type AuraCloudDataCategory = 'object_storage' | 'query_engine' | 'warehouse' | 'lakehouse' | 'analytics_platform';
export type AuraCloudDataRuntimeStatus = 'WORKSPACE_CONNECTOR_AVAILABLE' | 'AURA_RUNTIME_NOT_CONFIGURED';
export type AuraPrivateRuntimeStatus = 'ADAPTER_REQUIRED';

export interface AuraCloudDataConnectorCapability {
  id: AuraCloudDataConnectorId;
  label: string;
  category: AuraCloudDataCategory;
  workspaceConnectorAvailable: true;
  runtimeStatus: AuraCloudDataRuntimeStatus;
  privateRuntimeStatus: AuraPrivateRuntimeStatus;
  requiresCustomerCredentials: true;
  connected: false;
  truthNote: string;
}

export const AURA_CLOUD_DATA_CONNECTORS: readonly AuraCloudDataConnectorCapability[] = [
  {
    id: 'aws_s3',
    label: 'AWS S3',
    category: 'object_storage',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer S3 account or bucket is connected to AURA by this catalogue.',
  },
  {
    id: 'aws_athena',
    label: 'AWS Athena',
    category: 'query_engine',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer Athena workgroup or query runtime is configured in AURA.',
  },
  {
    id: 'redshift',
    label: 'Amazon Redshift',
    category: 'warehouse',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer Redshift cluster or serverless endpoint is connected.',
  },
  {
    id: 'snowflake',
    label: 'Snowflake',
    category: 'warehouse',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer Snowflake account is connected to AURA.',
  },
  {
    id: 'databricks',
    label: 'Databricks',
    category: 'lakehouse',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer Databricks workspace or SQL warehouse is connected.',
  },
  {
    id: 'bigquery',
    label: 'BigQuery',
    category: 'warehouse',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer Google Cloud project or BigQuery dataset is connected.',
  },
  {
    id: 'fabric',
    label: 'Microsoft Fabric',
    category: 'analytics_platform',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer Fabric workspace is connected to AURA.',
  },
  {
    id: 'clickhouse',
    label: 'ClickHouse',
    category: 'analytics_platform',
    workspaceConnectorAvailable: true,
    runtimeStatus: 'AURA_RUNTIME_NOT_CONFIGURED',
    privateRuntimeStatus: 'ADAPTER_REQUIRED',
    requiresCustomerCredentials: true,
    connected: false,
    truthNote: 'Lovable workspace connector is enabled; no customer ClickHouse endpoint is connected to AURA.',
  },
] as const;

export function cloudDataConnectorCapability(id: string | null | undefined) {
  return AURA_CLOUD_DATA_CONNECTORS.find((connector) => connector.id === id) ?? null;
}
