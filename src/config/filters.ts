/**
 * Unified filter configuration for Marketplace and Builder
 * Ensures perfect parity between both surfaces
 */

export const FILTER_CONFIGS = {
  templates: [
    { key: 'industry', label: 'Industry', type: 'select' as const },
    { key: 'level', label: 'Difficulty', type: 'select' as const },
    { key: 'certified', label: 'Certified Only', type: 'boolean' as const },
  ],
  industry: [
    { key: 'category', label: 'Category', type: 'select' as const },
    { key: 'connection', label: 'Connection Status', type: 'select' as const },
  ],
  mcp: [
    { key: 'category', label: 'Category', type: 'select' as const },
    { key: 'type', label: 'Server Type', type: 'select' as const },
    { key: 'designation', label: 'Designation', type: 'select' as const },
  ],
} as const;

export const INDUSTRY_OPTIONS = [
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Energy',
  'Marketing',
  'Operations',
  'HR',
  'Legal',
  'Public Sector',
  'Agriculture',
] as const;

export const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;

export const CONNECTION_OPTIONS = ['all', 'connected', 'disconnected'] as const;

export const MCP_CATEGORY_OPTIONS = [
  'Productivity & Docs',
  'Social & Communication',
  'Entertainment',
  'Developer Tools',
  'Payments & Finance',
  'Search Tools',
  'Sales',
  'Databases',
  'Customer Support',
] as const;

export const MCP_TYPE_OPTIONS = ['tool', 'resource', 'prompt'] as const;

export const MCP_DESIGNATION_OPTIONS = [
  'arcade-optimized',
  'starter',
  'verified',
  'community',
] as const;

export type FilterKey = keyof typeof FILTER_CONFIGS;
export type TemplateFilter = typeof FILTER_CONFIGS.templates[number]['key'];
export type IndustryFilter = typeof FILTER_CONFIGS.industry[number]['key'];
export type McpFilter = typeof FILTER_CONFIGS.mcp[number]['key'];
