/**
 * Unified Scanner Controller
 * Consolidates all scanner logic into a single component
 */

import { useState, useCallback, useEffect } from "react";
import { useGreenDcRecommendation } from "@/hooks/useGreenDcRecommendation";
import { toast } from "sonner";

export interface ScanResult {
  companyName: string;
  industry: string;
  industryLabel: string;
  siteUrl: string;
  blueprintProfile: string;
  capacity: number;
  tier: string;
  renewablePercent: number;
  objectives: string[];
  agents: string[];
  scenarios: string[];
}

export interface ScannerState {
  isScanning: boolean;
  hasResult: boolean;
  error: string | null;
  result: ScanResult | null;
  lastScannedUrl: string | null;
}

export interface ScannerControllerProps {
  onScanComplete?: (result: ScanResult) => void;
  onScanStart?: () => void;
  onScanError?: (error: string) => void;
}

export function useScannerController(props?: ScannerControllerProps) {
  const { onScanComplete, onScanStart, onScanError } = props || {};
  
  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    hasResult: false,
    error: null,
    result: null,
    lastScannedUrl: null,
  });

  const { 
    recommendation, 
    isLoading: apiLoading, 
    error: apiError, 
    fetchRecommendation, 
    reset: resetHook,
    isPreviewMode
  } = useGreenDcRecommendation();

  // Watch for recommendation changes from the hook
  // Note: isPreviewMode indicates recommendation is ready for preview (sandbox only)
  useEffect(() => {
    if (recommendation && isPreviewMode && state.lastScannedUrl) {
      // Map capacity tier to kW
      const capacityMap: Record<string, number> = {
        small: 500,
        medium: 2000,
        large: 10000,
        hyperscale: 50000,
      };
      
      // Map capacity tier to tier label
      const tierMap: Record<string, string> = {
        small: 'Tier II',
        medium: 'Tier III',
        large: 'Tier III+',
        hyperscale: 'Tier IV',
      };
      
      const result: ScanResult = {
        companyName: recommendation.companyName || 'Organization',
        industry: recommendation.industry || 'generic',
        industryLabel: recommendation.industryId || recommendation.industry || 'Enterprise',
        siteUrl: state.lastScannedUrl,
        blueprintProfile: recommendation.archetypeId || 'generic_green_dc',
        capacity: capacityMap[recommendation.capacityTier] || 5000,
        tier: tierMap[recommendation.capacityTier] || 'Tier III',
        renewablePercent: recommendation.kpiTargets?.renewableShareTargetPct || 80,
        objectives: recommendation.objectives || [],
        agents: recommendation.agents || [],
        scenarios: recommendation.scenarios || [],
      };

      setState(prev => ({
        ...prev,
        isScanning: false,
        hasResult: true,
        error: null,
        result,
      }));

      onScanComplete?.(result);
    }
  }, [recommendation, isPreviewMode, state.lastScannedUrl, onScanComplete]);

  // Watch for errors from the hook
  useEffect(() => {
    if (apiError && state.isScanning) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        hasResult: false,
        error: apiError,
        result: null,
      }));
      onScanError?.(apiError);
      toast.error(apiError);
    }
  }, [apiError, state.isScanning, onScanError]);

  const normalizeUrl = useCallback((input: string): string => {
    let url = input.trim().toLowerCase();
    
    // Remove existing protocols
    url = url.replace(/^(https?:\/\/|ftp:\/\/)/, '');
    
    // Remove www prefix
    url = url.replace(/^www\./, '');
    
    // Strip paths, query params, and fragments
    url = url.split('/')[0].split('?')[0].split('#')[0];
    
    // Add TLD if missing
    if (!url.includes('.')) {
      url = `${url}.com`;
    }
    
    return `https://${url}`;
  }, []);

  const scan = useCallback(async (urlInput: string) => {
    if (!urlInput.trim()) {
      const errorMsg = "Please enter a website URL";
      setState(prev => ({ ...prev, error: errorMsg }));
      onScanError?.(errorMsg);
      return;
    }

    const normalizedUrl = normalizeUrl(urlInput);
    
    onScanStart?.();
    setState({
      isScanning: true,
      hasResult: false,
      error: null,
      result: null,
      lastScannedUrl: normalizedUrl,
    });

    // Trigger the fetch - results will come via the useEffect watchers
    await fetchRecommendation(normalizedUrl);
  }, [normalizeUrl, fetchRecommendation, onScanStart, onScanError]);

  const reset = useCallback(() => {
    resetHook();
    setState({
      isScanning: false,
      hasResult: false,
      error: null,
      result: null,
      lastScannedUrl: null,
    });
  }, [resetHook]);

  return {
    ...state,
    isScanning: state.isScanning || apiLoading,
    scan,
    reset,
    recommendation, // Expose raw recommendation for advanced use
  };
}
