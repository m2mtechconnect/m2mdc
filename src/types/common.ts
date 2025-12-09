/**
 * Common types used across the application
 * Replaces many 'any' types with proper definitions
 */

export type Status = 'active' | 'inactive' | 'pending' | 'error' | 'connected' | 'disconnected' | 'draft' | 'deployed' | 'running';

export type DeploymentStatus = 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolling_back';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'expired' | 'pending';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  title: string;
  url?: string;
  snippet?: string;
  source?: string;
}

export interface TestResult {
  success: boolean;
  latency?: number;
  citations?: Citation[];
  error?: string;
  response?: string;
  metadata?: Record<string, unknown>;
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  unit?: string;
}

export interface ROIEstimate {
  roi_pct?: number;
  time_saved_week?: number;
  cost_reduction?: number;
  payback_months?: number;
}

export interface ModelConfig {
  model_id: string;
  model_name?: string;
  provider?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface Integration {
  id: string;
  name: string;
  provider: string;
  category?: string;
  status: ConnectionStatus;
  credentials_encrypted?: string | null;
  vault_credentials_id?: string | null;
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MCPServer {
  id: string;
  name: string;
  description?: string;
  url?: string;
  status?: string;
  auth_type?: 'none' | 'api_key' | 'oauth2';
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface MCPResource {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface MCPPrompt {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  default_config: Record<string, unknown>;
  sample_prompts?: string[];
  kpi_definitions?: KPI[];
  recommended_models?: string[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Standardized REST API response envelope
 * Used by all edge functions following the new REST pattern
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  correlationId: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface FilterParams {
  status?: Status | Status[];
  category?: string | string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Type guards
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

export function hasOwnProperty<T extends object, K extends PropertyKey>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
