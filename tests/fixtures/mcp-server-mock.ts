/**
 * Mock MCP Server for testing
 * Provides a simulated Model Context Protocol server with capabilities and tools
 */

export interface MCPCapability {
  name: string;
  description: string;
  schema: Record<string, any>;
}

export interface MCPServerResponse {
  capabilities: {
    tools: MCPCapability[];
    resources: MCPCapability[];
    prompts: MCPCapability[];
  };
  server_version: string;
  protocol_version: string;
}

export class MockMCPServer {
  private tools: MCPCapability[] = [
    {
      name: 'get_status',
      description: 'Get the current status of a system',
      schema: {
        type: 'object',
        properties: {
          system_id: { type: 'string', description: 'The system ID to check' }
        },
        required: ['system_id']
      }
    },
    {
      name: 'list_resources',
      description: 'List available resources',
      schema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Resource category' }
        }
      }
    }
  ];

  private resources: MCPCapability[] = [
    {
      name: 'documentation',
      description: 'Access system documentation',
      schema: {
        type: 'object',
        properties: {
          doc_id: { type: 'string' }
        }
      }
    }
  ];

  private prompts: MCPCapability[] = [
    {
      name: 'system_health_check',
      description: 'Generate a system health check prompt',
      schema: {
        type: 'object',
        properties: {
          verbose: { type: 'boolean', default: false }
        }
      }
    }
  ];

  getCapabilities(): MCPServerResponse {
    return {
      capabilities: {
        tools: this.tools,
        resources: this.resources,
        prompts: this.prompts
      },
      server_version: '1.0.0',
      protocol_version: '2024-11-05'
    };
  }

  executeTool(toolName: string, args: Record<string, any>): any {
    switch (toolName) {
      case 'get_status':
        return {
          status: 'operational',
          system_id: args.system_id,
          uptime: 99.9,
          last_check: new Date().toISOString()
        };
      case 'list_resources':
        return {
          resources: [
            { id: 'res1', name: 'Resource 1', category: args.category || 'general' },
            { id: 'res2', name: 'Resource 2', category: args.category || 'general' }
          ]
        };
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  simulateTimeout(): never {
    throw new Error('Request timeout');
  }

  simulateAuthError(): never {
    throw new Error('Authentication failed: Invalid token');
  }

  simulateSchemaError(): never {
    throw new Error('Schema validation failed');
  }
}

export const mockMCPServer = new MockMCPServer();
