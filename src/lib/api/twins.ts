import { supabase } from "@/integrations/supabase/client";

/**
 * Delete a Data Centre Twin and all associated data
 * Calls the systems-delete edge function for cascading cleanup
 */
export async function deleteTwin(twinId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('systems-delete', {
    body: { systemId: twinId }
  });

  if (error) {
    console.error('Failed to delete twin:', error);
    throw new Error(error.message || 'Failed to delete twin');
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Failed to delete twin');
  }
}

/**
 * Delete a Data Centre Twin directly from the database
 * Used when the twin is stored in data_centre_twins table
 */
export async function deleteDataCentreTwin(twinId: string): Promise<void> {
  // First delete related records
  const deletePromises = [
    supabase.from('agent_definition_runs').delete().eq('twin_id', twinId),
    supabase.from('agent_runs').delete().eq('twin_id', twinId),
    supabase.from('agent_workflows').delete().eq('twin_id', twinId),
    supabase.from('digital_twin_runs').delete().eq('twin_id', twinId),
  ];

  await Promise.allSettled(deletePromises);

  // Then delete the twin itself
  const { error } = await supabase
    .from('data_centre_twins')
    .delete()
    .eq('id', twinId);

  if (error) {
    console.error('Failed to delete data centre twin:', error);
    throw new Error(error.message || 'Failed to delete twin');
  }
}
