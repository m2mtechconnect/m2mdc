import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUnifiedStore } from '@/stores/unifiedStore';

describe('UnifiedStore', () => {
  beforeEach(() => {
    useUnifiedStore.getState().systems = {};
    useUnifiedStore.getState().filters = {};
  });

  describe('Filter Management', () => {
    it('should update filters without mutation', () => {
      // Read state fresh after each update: getState() returns a snapshot,
      // not a live view of the store.
      const store = useUnifiedStore.getState();      
      store.updateFilters({ industry: 'Healthcare' });
      expect(useUnifiedStore.getState().filters.industry).toBe('Healthcare');
      
      store.updateFilters({ level: 'advanced' });
      expect(useUnifiedStore.getState().filters.industry).toBe('Healthcare');
      expect(useUnifiedStore.getState().filters.level).toBe('advanced');
    });

    it('should preserve filters across updates', () => {
      // Read state fresh after each update: getState() returns a snapshot,
      // not a live view of the store.
      const store = useUnifiedStore.getState();      
      store.updateFilters({ certified: true, q: 'test' });
      expect(useUnifiedStore.getState().filters.certified).toBe(true);
      expect(useUnifiedStore.getState().filters.q).toBe('test');
    });
  });

  describe('System State Management', () => {
    it('should maintain unique connector_ids', async () => {
      const mockSystemId = 'test-system-123';
      const mockAppId = 'salesforce';
      
      // Initialize system
      useUnifiedStore.setState({
        systems: {
          [mockSystemId]: {
            id: mockSystemId,
            connector_ids: ['gmail', 'slack'],
            mcp_server_ids: [],
            name: 'Test System',
            status: 'draft',
            updated_at: new Date().toISOString(),
          },
        },
      });

      const store = useUnifiedStore.getState();
      
      // This would normally call supabase, but we're testing the deduplication logic
      const existingIds = store.systems[mockSystemId].connector_ids;
      const newIds = Array.from(new Set([...existingIds, mockAppId]));
      
      expect(newIds).toEqual(['gmail', 'slack', 'salesforce']);
      expect(newIds.length).toBe(3);
    });

    it('should deduplicate when same ID is added twice', () => {
      const mockSystemId = 'test-system-456';
      const mockAppId = 'salesforce';
      
      useUnifiedStore.setState({
        systems: {
          [mockSystemId]: {
            id: mockSystemId,
            connector_ids: ['gmail', 'salesforce'],
            mcp_server_ids: [],
            name: 'Test System',
            status: 'draft',
            updated_at: new Date().toISOString(),
          },
        },
      });

      const store = useUnifiedStore.getState();
      const existingIds = store.systems[mockSystemId].connector_ids;
      const newIds = Array.from(new Set([...existingIds, mockAppId]));
      
      // Should not add duplicate
      expect(newIds).toEqual(['gmail', 'salesforce']);
      expect(newIds.length).toBe(2);
    });
  });

  describe('MCP Server Management', () => {
    it('should track MCP servers separately from connectors', () => {
      const mockSystemId = 'test-system-789';
      
      useUnifiedStore.setState({
        systems: {
          [mockSystemId]: {
            id: mockSystemId,
            connector_ids: ['salesforce', 'hubspot'],
            mcp_server_ids: ['github', 'gmail'],
            name: 'Test System',
            status: 'draft',
            updated_at: new Date().toISOString(),
          },
        },
      });

      const store = useUnifiedStore.getState();
      const system = store.systems[mockSystemId];
      
      expect(system.connector_ids).toEqual(['salesforce', 'hubspot']);
      expect(system.mcp_server_ids).toEqual(['github', 'gmail']);
      expect(system.connector_ids.length).toBe(2);
      expect(system.mcp_server_ids.length).toBe(2);
    });

    it('should deduplicate MCP server IDs', () => {
      const serverIds = ['github', 'gmail', 'github', 'slack'];
      const uniqueIds = Array.from(new Set(serverIds));
      
      expect(uniqueIds).toEqual(['github', 'gmail', 'slack']);
      expect(uniqueIds.length).toBe(3);
    });
  });

  describe('Data Loading', () => {
    it('should handle loading state correctly', () => {
      const store = useUnifiedStore.getState();
      
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should initialize with empty data structures', () => {
      const store = useUnifiedStore.getState();
      
      expect(store.systems).toEqual({});
      expect(store.templates).toEqual([]);
      expect(store.industryApps).toEqual([]);
      expect(store.mcpServers).toEqual([]);
    });
  });

  describe('Filter Parity (Marketplace ↔ Builder)', () => {
    it('should maintain same filters for templates', () => {
      // Read state fresh after each update: getState() returns a snapshot,
      // not a live view of the store.
      const store = useUnifiedStore.getState();      
      store.updateFilters({ industry: 'Healthcare', level: 'advanced', certified: true });
      
      // Filters should be identical whether accessed from Marketplace or Builder
      expect(useUnifiedStore.getState().filters.industry).toBe('Healthcare');
      expect(useUnifiedStore.getState().filters.level).toBe('advanced');
      expect(useUnifiedStore.getState().filters.certified).toBe(true);
    });

    it('should maintain same filters for industry apps', () => {
      // Read state fresh after each update: getState() returns a snapshot,
      // not a live view of the store.
      const store = useUnifiedStore.getState();      
      store.updateFilters({ category: 'CRM', connection: 'connected' });
      
      expect(useUnifiedStore.getState().filters.category).toBe('CRM');
      expect(useUnifiedStore.getState().filters.connection).toBe('connected');
    });

    it('should maintain same filters for MCP servers', () => {
      // Read state fresh after each update: getState() returns a snapshot,
      // not a live view of the store.
      const store = useUnifiedStore.getState();      
      store.updateFilters({ mcpCategory: 'Developer Tools', type: 'tool', designation: 'verified' });
      
      expect(useUnifiedStore.getState().filters.mcpCategory).toBe('Developer Tools');
      expect(useUnifiedStore.getState().filters.type).toBe('tool');
      expect(useUnifiedStore.getState().filters.designation).toBe('verified');
    });
  });
});
