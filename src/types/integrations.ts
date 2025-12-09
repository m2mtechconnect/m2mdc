/**
 * Unified Integration Schema
 * Single source of truth for all integration types across the platform
 */

export type IntegrationType = "zapier" | "api" | "mcp" | "native";

export type IntegrationStatus = "connected" | "available" | "error" | "expired" | "pending";

export type IntegrationCategory = 
  | "Communication" 
  | "Email" 
  | "CRM" 
  | "Project Management" 
  | "Support" 
  | "Productivity" 
  | "Database" 
  | "Development"
  | "Payments"
  | "Business Tools"
  | "Social & Communication"
  | "Entertainment"
  | "Developer Tools"
  | "Payments & Finance"
  | "Search Tools"
  | "Sales"
  | "Databases"
  | "Customer Support"
  | "Productivity & Docs";

export interface IntegrationConfig {
  // ZAPIER-specific
  zapierTrigger?: string;
  zapierAction?: string;
  zapierTemplate?: string;
  schedule?: "on-event" | "5min" | "hourly" | "daily";
  
  // API-specific
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url?: string;
  headers?: Record<string, string>;
  authType?: "none" | "bearer" | "basic" | "apiKey" | "oauth";
  bodySchema?: Record<string, any>;
  responseSchema?: Record<string, any>;
  
  // MCP-specific
  serverUrl?: string;
  endpoint?: string;
  capabilities?: {
    tools?: number;
    resources?: number;
    prompts?: number;
  };
  credentials?: Record<string, any>;
  transport?: "http-stream" | "sse" | "stdio";
  
  // SHARED
  mapping?: Record<string, any>;
  enabled?: boolean;
  webhookUrl?: string;
  scopes?: string[];
}

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  description?: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  connected: boolean;
  connectionId?: string;
  config: IntegrationConfig;
  
  // Metadata
  logo_url?: string;
  icon?: string;
  tags?: string[];
  
  // Capabilities & stats
  triggers?: number;
  actions?: number;
  rating?: number;
  downloads?: number;
  
  // MCP specific
  designation?: string;
  auth_method?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  last_sync?: string;
  last_run?: string;
  
  // Error tracking
  error_message?: string;
  last_error?: string;
}

export interface IntegrationFilters {
  searchQuery: string;
  selectedCategories: string[];
  selectedTypes: IntegrationType[];
  selectedStatus: IntegrationStatus | null;
  recommended?: boolean;
}

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "Communication",
  "Email",
  "CRM",
  "Project Management",
  "Support",
  "Productivity",
  "Database",
  "Development",
  "Payments",
  "Business Tools",
  "Productivity & Docs",
  "Social & Communication",
  "Developer Tools",
];

export const INTEGRATION_TYPES: Array<{ value: IntegrationType; label: string }> = [
  { value: "native", label: "Native" },
  { value: "zapier", label: "Zapier" },
  { value: "mcp", label: "MCP Server" },
  { value: "api", label: "Custom API" },
];
