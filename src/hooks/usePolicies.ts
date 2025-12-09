import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePolicies(systemId: string) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          binding_count:policy_bindings(count)
        `)
        .eq('system_id', systemId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform the count data
      const transformed = data?.map(policy => ({
        ...policy,
        binding_count: policy.binding_count?.[0]?.count || 0
      })) || [];

      setPolicies(transformed);
      setError(null);
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch policies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (systemId) {
      fetchPolicies();
    }
  }, [systemId]);

  const deletePolicy = async (policyId: string) => {
    const { error } = await supabase
      .from('policies')
      .delete()
      .eq('id', policyId);

    if (error) throw error;
  };

  const duplicatePolicy = async (policyId: string) => {
    // Get the original policy
    const { data: original, error: fetchError } = await supabase
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!original) throw new Error('Policy not found');

    // Create duplicate
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { error: insertError } = await supabase
      .from('policies')
      .insert({
        system_id: original.system_id,
        name: `${original.name} (Copy)`,
        description: original.description,
        scope: original.scope,
        rules: original.rules,
        is_enabled: false, // Start disabled
        created_by: userData.user.id,
      });

    if (insertError) throw insertError;
  };

  return {
    policies,
    isLoading,
    error,
    deletePolicy,
    duplicatePolicy,
    refetch: fetchPolicies,
  };
}
