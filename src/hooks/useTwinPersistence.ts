/**
 * Twin Persistence Hook
 * Handles saving and loading DC twins to/from the database
 * Critical P0 fix: persist twins on deploy
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DCTwinBuilderState } from '@/types/dcTwinBuilder';
import type { Json } from '@/integrations/supabase/types';

export interface SavedTwin {
  id: string;
  name: string;
  city: string;
  region_code: string;
  tier: string;
  capacity_kw: number;
  industry: string | null;
  metadata: Record<string, unknown>;
  created_by_user: string;
  created_at: string;
  updated_at: string;
  deployed_at: string | null;
}

export function useTwinPersistence() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Save or update a twin in the database
   * Creates new record on first deploy, updates existing on re-deploy
   */
  const saveTwinToDatabase = useCallback(async (
    builderState: DCTwinBuilderState,
    existingTwinId?: string
  ): Promise<string | null> => {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        toast.error('Please log in to save your twin');
        return null;
      }

      const { overview, agents, kpis, scenarios, workflows, deployment, intelligence, financial } = builderState;

      // Prepare metadata with full configuration
      const metadata: Record<string, unknown> = {
        twinSlug: overview.twinSlug,
        twinSummary: overview.twinSummary,
        description: overview.description,
        siteUrl: overview.siteUrl,
        customerName: overview.customerName,
        industries: overview.industries,
        primaryUseCases: overview.primaryUseCases,
        targetAudience: overview.targetAudience,
        gpuFleet: overview.gpuFleet,
        coolingType: overview.coolingType,
        powerTopology: overview.powerTopology,
        renewablePercent: overview.renewablePercent,
        sovereignCompliance: overview.sovereignCompliance,
        // Full configuration
        agents: agents.filter(a => a.enabled).map(a => ({
          id: a.id,
          name: a.name,
          domain: a.domain,
        })),
        kpis: kpis.filter(k => k.enabled).map(k => ({
          id: k.id,
          name: k.name,
          target: k.target,
        })),
        scenarios: scenarios.filter(s => s.enabled).map(s => ({
          id: s.id,
          name: s.name,
        })),
        workflows: workflows.filter(w => w.enabled).map(w => ({
          id: w.id,
          name: w.name,
        })),
        intelligence: {
          llmModel: intelligence.llmModel,
          ragEnabled: intelligence.ragEnabled,
        },
        financial,
        deployment: {
          targetRegion: deployment.targetDeploymentRegion,
        },
        builderId: builderState.builderId,
        version: '1.0.0',
      };

      if (existingTwinId) {
        // Update existing twin
        const { error: updateError } = await supabase
          .from('data_centre_twins')
          .update({
            name: overview.twinName,
            city: overview.facilityLocation.split(',')[0]?.trim() || 'Montreal',
            region_code: overview.regionCode || 'ca-central-1',
            tier: overview.tier || 'III',
            capacity_kw: overview.capacityKw || 5000,
            industry: overview.industry || overview.industries[0] || null,
            metadata: metadata as Json,
            updated_at: new Date().toISOString(),
            deployed_at: new Date().toISOString(),
          })
          .eq('id', existingTwinId);

        if (updateError) {
          console.error('[TwinPersistence] Update error:', updateError);
          setError(updateError.message);
          toast.error('Failed to update twin');
          return null;
        }

        console.log('[TwinPersistence] Updated twin:', existingTwinId);
        toast.success('Twin updated successfully');
        return existingTwinId;
      } else {
        // Create new twin
        const { data, error: insertError } = await supabase
          .from('data_centre_twins')
          .insert({
            name: overview.twinName,
            city: overview.facilityLocation.split(',')[0]?.trim() || 'Montreal',
            region_code: overview.regionCode || 'ca-central-1',
            tier: overview.tier || 'III',
            capacity_kw: overview.capacityKw || 5000,
            industry: overview.industry || overview.industries[0] || null,
            metadata: metadata as Json,
            created_by_user: user.id,
            deployed_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[TwinPersistence] Insert error:', insertError);
          setError(insertError.message);
          toast.error('Failed to create twin');
          return null;
        }

        console.log('[TwinPersistence] Created twin:', data.id);
        toast.success('Twin created successfully');
        return data.id;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TwinPersistence] Error:', err);
      setError(message);
      toast.error('Failed to save twin');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Load a twin by ID
   */
  const loadTwinById = useCallback(async (twinId: string): Promise<SavedTwin | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('data_centre_twins')
        .select('*')
        .eq('id', twinId)
        .single();

      if (fetchError) {
        console.error('[TwinPersistence] Load error:', fetchError);
        setError(fetchError.message);
        return null;
      }

      return data as SavedTwin;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TwinPersistence] Error:', err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load all twins for the current user
   */
  const loadUserTwins = useCallback(async (): Promise<SavedTwin[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from('data_centre_twins')
        .select('*')
        .eq('created_by_user', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('[TwinPersistence] Load error:', fetchError);
        setError(fetchError.message);
        return [];
      }

      return (data || []) as SavedTwin[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TwinPersistence] Error:', err);
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a twin
   */
  const deleteTwin = useCallback(async (twinId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('data_centre_twins')
        .delete()
        .eq('id', twinId);

      if (deleteError) {
        console.error('[TwinPersistence] Delete error:', deleteError);
        toast.error('Failed to delete twin');
        return false;
      }

      toast.success('Twin deleted');
      return true;
    } catch (err) {
      console.error('[TwinPersistence] Error:', err);
      toast.error('Failed to delete twin');
      return false;
    }
  }, []);

  return {
    isSaving,
    isLoading,
    error,
    saveTwinToDatabase,
    loadTwinById,
    loadUserTwins,
    deleteTwin,
  };
}
