import { NormalizedApp, FieldDef } from '@/stores/builderSelectionStore';

/**
 * Normalizes M2M Template to unified schema
 */
export function normalizeTemplate(template: any): NormalizedApp {
  const inputs: FieldDef[] = [];
  
  // Extract inputs from default_config
  if (template.default_config) {
    if (template.default_config.model) {
      inputs.push({
        name: 'model',
        type: 'select',
        label: 'AI Model',
        required: true,
        default: template.default_config.model,
        options: [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          { label: 'Claude 3', value: 'claude-3' },
        ],
      });
    }
    
    if (template.default_config.grounding !== undefined) {
      inputs.push({
        name: 'grounding',
        type: 'boolean',
        label: 'Enable Grounding',
        required: false,
        default: template.default_config.grounding,
        description: 'Use grounding to improve accuracy with real-time data',
      });
    }

    if (template.default_config.temperature !== undefined) {
      inputs.push({
        name: 'temperature',
        type: 'number',
        label: 'Temperature',
        required: false,
        default: template.default_config.temperature,
        description: 'Controls randomness (0.0-1.0)',
      });
    }
  }

  return {
    id: template.id,
    name: template.name,
    category: template.industry,
    type: 'template',
    version: template.updated_at ? new Date(template.updated_at).toISOString().split('T')[0] : undefined,
    lastUpdated: template.updated_at,
    description: template.description,
    features: template.kpi_definitions?.map((kpi: any) => kpi.name || kpi) || [],
    integrationType: 'Native',
    inputs,
    defaults: template.default_config || {},
    requiredSecrets: [],
    docsUrl: undefined,
    publisher: {
      name: 'M2M',
      logoUrl: template.hero_icon,
    },
    compatibility: template.tags || [],
  };
}

/**
 * Normalizes Industry Agent to unified schema
 */
export function normalizeIndustryAgent(agent: any): NormalizedApp {
  const inputs: FieldDef[] = [];
  
  // Connection-specific inputs based on integration type
  if (agent.integration_type === 'API') {
    inputs.push({
      name: 'api_key',
      type: 'text',
      label: 'API Key',
      required: true,
      placeholder: 'Enter your API key',
      description: 'Your API key for authentication',
    });
    inputs.push({
      name: 'endpoint',
      type: 'text',
      label: 'API Endpoint',
      required: false,
      placeholder: 'https://api.example.com',
      description: 'Custom API endpoint (optional)',
    });
  } else if (agent.integration_type === 'Zapier') {
    inputs.push({
      name: 'zapier_webhook',
      type: 'text',
      label: 'Zapier Webhook URL',
      required: true,
      placeholder: 'https://hooks.zapier.com/...',
      description: 'Your Zapier webhook URL',
    });
  }

  const requiredSecrets: string[] = agent.required_secrets || [];
  if (agent.integration_type === 'API' && requiredSecrets.length === 0) {
    requiredSecrets.push('API_KEY');
  }

  return {
    id: agent.id,
    name: agent.name,
    category: agent.industry,
    type: 'agent',
    status: agent.status?.toLowerCase() === 'connected' ? 'connected' : 'not_connected',
    version: agent.version || (agent.updated_at ? new Date(agent.updated_at).toISOString().split('T')[0] : undefined),
    lastUpdated: agent.updated_at,
    description: agent.short_description || `${agent.industry} industry agent with ${agent.integration_type} integration`,
    features: agent.features || [],
    integrationType: agent.integration_type as any,
    inputs,
    defaults: {},
    requiredSecrets,
    docsUrl: undefined,
    publisher: {
      name: agent.category || agent.industry,
      logoUrl: agent.logo_url || agent.thumbnail_url,
    },
    compatibility: [agent.integration_type, agent.industry, ...(agent.dependencies || [])],
  };
}

/**
 * Normalizes MCP Server to unified schema
 */
export function normalizeMcpServer(server: any): NormalizedApp {
  const inputs: FieldDef[] = [];
  
  // Auth-specific inputs
  if (server.auth_type === 'API Key') {
    inputs.push({
      name: 'api_key',
      type: 'text',
      label: 'API Key',
      required: true,
      placeholder: 'Enter your API key',
      description: 'API key for authentication',
    });
  } else if (server.auth_type === 'OAuth') {
    inputs.push({
      name: 'client_id',
      type: 'text',
      label: 'Client ID',
      required: true,
      placeholder: 'Enter client ID',
    });
    inputs.push({
      name: 'client_secret',
      type: 'text',
      label: 'Client Secret',
      required: true,
      placeholder: 'Enter client secret',
    });
  }

  // Endpoint configuration
  if (server.endpoint) {
    inputs.push({
      name: 'endpoint',
      type: 'text',
      label: 'Server Endpoint',
      required: false,
      default: server.endpoint,
      placeholder: 'Server endpoint URL',
    });
  }

  const requiredSecrets: string[] = [];
  if (server.auth_type === 'API Key') {
    requiredSecrets.push('MCP_API_KEY');
  } else if (server.auth_type === 'OAuth') {
    requiredSecrets.push('MCP_CLIENT_ID', 'MCP_CLIENT_SECRET');
  }

  return {
    id: server.id,
    name: server.name,
    category: server.category,
    type: 'mcp',
    status: 'not_connected',
    version: server.updated_at ? new Date(server.updated_at).toISOString().split('T')[0] : undefined,
    lastUpdated: server.updated_at,
    description: server.description,
    features: [
      `${server.tools_count || 0} tools available`,
      `${server.resources_count || 0} resources`,
      `${server.prompts_count || 0} prompts`,
      server.verified ? 'Verified by M2M' : undefined,
      server.optimized ? 'Optimized for performance' : undefined,
    ].filter(Boolean) as string[],
    integrationType: 'Native',
    inputs,
    defaults: { endpoint: server.endpoint },
    requiredSecrets,
    docsUrl: server.endpoint,
    publisher: {
      name: server.provider,
      logoUrl: server.logo_url,
    },
    compatibility: [server.category, server.auth_type],
  };
}

/**
 * Normalizes any marketplace item to unified schema
 */
export function normalizeMarketplaceItem(
  item: any,
  type: 'template' | 'agent' | 'mcp'
): NormalizedApp {
  switch (type) {
    case 'template':
      return normalizeTemplate(item);
    case 'agent':
      return normalizeIndustryAgent(item);
    case 'mcp':
      return normalizeMcpServer(item);
    default:
      throw new Error(`Unknown marketplace item type: ${type}`);
  }
}
