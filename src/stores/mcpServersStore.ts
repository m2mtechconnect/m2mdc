import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface McpServer {
  id: string;
  name: string;
  designation: string;
  category: string;
  tags: string[];
  description: string;
  logo?: string;
  capabilities: {
    tools: number;
    resources: number;
    prompts: number;
  };
  auth_method: string;
  endpoint: string;
  featured: boolean;
  marketplace_type: 'server';
}

interface McpServersStore {
  servers: McpServer[];
  isLoading: boolean;
  error: string | null;
  
  loadServers: () => Promise<void>;
  getServerById: (id: string) => McpServer | null;
}

export const useMcpServersStore = create<McpServersStore>((set, get) => ({
  servers: [],
  isLoading: false,
  error: null,

  loadServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch from arcade-servers edge function
      const { data, error } = await supabase.functions.invoke('arcade-servers', {
        method: 'GET',
      });

      if (error) throw error;

      const servers = (data?.items || []).map((s: any) => ({
        ...s,
        marketplace_type: 'server' as const,
      }));

      set({ servers, isLoading: false });
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load servers',
        isLoading: false 
      });
    }
  },

  getServerById: (id: string) => {
    const { servers } = get();
    return servers.find(s => s.id === id) || null;
  },
}));
