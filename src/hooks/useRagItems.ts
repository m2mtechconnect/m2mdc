import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RagItem {
  id: string;
  system_id: string;
  user_id: string;
  name: string;
  source: string;
  uri: string | null;
  size_bytes: number | null;
  pages: number | null;
  status: string;
  residency: string;
  options: any;
  last_indexed: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export function useRagItems(systemId: string | null) {
  const [items, setItems] = useState<RagItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!systemId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('rag_items')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setItems(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch RAG items';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    // Subscribe to realtime changes
    if (systemId) {
      const channel = supabase
        .channel(`rag_items:${systemId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rag_items',
            filter: `system_id=eq.${systemId}`
          },
          () => {
            fetchItems();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [systemId]);

  const deleteItem = async (itemId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('rag_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      toast.success('Document deleted successfully');
      fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete item';
      toast.error(message);
    }
  };

  const clearAll = async () => {
    if (!systemId) return;

    try {
      const { error: deleteError } = await supabase
        .from('rag_items')
        .delete()
        .eq('system_id', systemId);

      if (deleteError) throw deleteError;

      toast.success('All documents cleared');
      setItems([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear documents';
      toast.error(message);
    }
  };

  return {
    items,
    isLoading,
    error,
    refetch: fetchItems,
    deleteItem,
    clearAll
  };
}
