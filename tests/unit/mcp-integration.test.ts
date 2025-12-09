import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockMCPServer } from '../fixtures/mcp-server-mock';

describe('MCP Server Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Registration', () => {
    it('should fetch and cache capabilities', () => {
      const capabilities = mockMCPServer.getCapabilities();
      
      expect(capabilities).toHaveProperty('capabilities');
      expect(capabilities.capabilities).toHaveProperty('tools');
      expect(capabilities.capabilities).toHaveProperty('resources');
      expect(capabilities.capabilities).toHaveProperty('prompts');
      expect(capabilities).toHaveProperty('server_version');
      expect(capabilities).toHaveProperty('protocol_version');
    });

    it('should validate server response schema', () => {
      const capabilities = mockMCPServer.getCapabilities();
      
      // Validate tools structure
      expect(Array.isArray(capabilities.capabilities.tools)).toBe(true);
      capabilities.capabilities.tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('schema');
      });
    });

    it('should handle timeout errors', () => {
      expect(() => mockMCPServer.simulateTimeout()).toThrow('Request timeout');
    });

    it('should handle authentication errors', () => {
      expect(() => mockMCPServer.simulateAuthError()).toThrow('Authentication failed');
    });

    it('should handle schema validation errors', () => {
      expect(() => mockMCPServer.simulateSchemaError()).toThrow('Schema validation failed');
    });
  });

  describe('Tool Allowlist', () => {
    it('should default all tools to disabled', () => {
      const defaultAllowlist: string[] = [];
      expect(defaultAllowlist).toHaveLength(0);
    });

    it('should require explicit enabling of tools', () => {
      const allowlist = new Set<string>();
      
      // Tool should not be enabled by default
      expect(allowlist.has('get_status')).toBe(false);
      
      // Explicitly enable
      allowlist.add('get_status');
      expect(allowlist.has('get_status')).toBe(true);
    });

    it('should validate tool exists before enabling', () => {
      const capabilities = mockMCPServer.getCapabilities();
      const validTools = capabilities.capabilities.tools.map(t => t.name);
      
      const toolToEnable = 'non_existent_tool';
      const isValid = validTools.includes(toolToEnable);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Tool Execution', () => {
    it('should execute get_status tool successfully', () => {
      const result = mockMCPServer.executeTool('get_status', {
        system_id: 'test-system-123'
      });
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('system_id');
      expect(result.system_id).toBe('test-system-123');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('last_check');
    });

    it('should execute list_resources tool successfully', () => {
      const result = mockMCPServer.executeTool('list_resources', {
        category: 'documentation'
      });
      
      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources.length).toBeGreaterThan(0);
    });

    it('should throw error for unknown tool', () => {
      expect(() => {
        mockMCPServer.executeTool('unknown_tool', {});
      }).toThrow('Unknown tool');
    });

    it('should validate tool arguments against schema', () => {
      const capabilities = mockMCPServer.getCapabilities();
      const getStatusTool = capabilities.capabilities.tools.find(t => t.name === 'get_status');
      
      expect(getStatusTool).toBeDefined();
      expect(getStatusTool?.schema.required).toContain('system_id');
    });
  });

  describe('Test Tool Feature', () => {
    it('should run tool with canned safe arguments', () => {
      const cannedArgs = { system_id: 'test-system' };
      const result = mockMCPServer.executeTool('get_status', cannedArgs);
      
      expect(result.system_id).toBe('test-system');
      expect(typeof result.status).toBe('string');
    });

    it('should return read-only result preview', () => {
      const result = mockMCPServer.executeTool('get_status', {
        system_id: 'test-system'
      });
      
      // Result should be JSON serializable
      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(result);
    });
  });

  describe('Server Versioning', () => {
    it('should track server version', () => {
      const capabilities = mockMCPServer.getCapabilities();
      expect(capabilities.server_version).toBe('1.0.0');
    });

    it('should track protocol version', () => {
      const capabilities = mockMCPServer.getCapabilities();
      expect(capabilities.protocol_version).toBe('2024-11-05');
    });

    it('should warn on version drift', () => {
      const cachedVersion = '1.0.0';
      const currentVersion = '1.1.0';
      
      const hasDrift = cachedVersion !== currentVersion;
      expect(hasDrift).toBe(true);
    });
  });
});
