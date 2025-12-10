/**
 * DC Scanner Panel
 * Main component for URL scanning and recommendation display
 * Integrates with DC Twin Builder Store for end-to-end flow
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Loader2, 
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTwin } from "@/context/ActiveTwinContext";
import { getRegionByCode } from "@/data/regions";
import { 
  useLastScanSession, 
  useBlueprintTemplate,
  useCreateScanSession 
} from "@/hooks/useDCScanSessions";
import { buildScanSignals, selectBlueprintProfile } from "@/lib/dc-scan/selectBlueprintProfile";
import { generateRecommendation } from "@/lib/dc-scan/generateRecommendation";
import { DCScanRecommendationCard } from "./DCScanRecommendationCard";
import { LastScanBanner } from "./LastScanBanner";
import { useDCTwinBuilderStore } from "@/stores/dcTwinBuilderStore";
import type { DCRecommendation, DCBlueprintProfile } from "@/types/dcScan";

export function DCScannerPanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createTwin, setActiveTwin, refreshTwins } = useActiveTwin();
  const { initializeFromRecommendation, setCurrentStep } = useDCTwinBuilderStore();
  
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [recommendation, setRecommendation] = useState<DCRecommendation | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<DCBlueprintProfile | null>(null);
  const [isCreatingTwin, setIsCreatingTwin] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { data: lastScan, refetch: refetchLastScan } = useLastScanSession();
  const { data: template } = useBlueprintTemplate(selectedProfile);
  const createSession = useCreateScanSession();

  // Pre-fill URL from last scan
  useEffect(() => {
    if (lastScan?.exists && lastScan.url && !url) {
      setUrl(lastScan.url);
    }
  }, [lastScan]);

  const handleScan = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to scan.",
        variant: "destructive"
      });
      return;
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setIsScanning(true);
    setRecommendation(null);

    try {
      // Call the scanner edge function
      const { data, error } = await supabase.functions.invoke("dc-scan-url", {
        body: { url: normalizedUrl }
      });

      if (error) throw error;

      if (data?.recommendation) {
        setRecommendation(data.recommendation);
        setSelectedProfile(data.recommendation.blueprintProfile);
        setCurrentSessionId(data.sessionId);
        refetchLastScan();
        
        toast({
          title: "Scan Complete",
          description: `Detected ${data.recommendation.detectedIndustry} industry. Recommended: ${data.recommendation.blueprintName}`
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan URL",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleViewLastRecommendation = () => {
    if (lastScan?.recommendation) {
      setRecommendation(lastScan.recommendation);
      setSelectedProfile(lastScan.blueprintProfile || null);
      setCurrentSessionId(lastScan.sessionId || null);
    } else if (lastScan?.url) {
      // Re-run the scan to get the recommendation
      setUrl(lastScan.url);
      handleScan();
    }
  };

  const handleRescan = () => {
    if (lastScan?.url) {
      setUrl(lastScan.url);
      handleScan();
    }
  };

  const handleOpenTwin = () => {
    if (lastScan?.blueprintId) {
      navigate(`/data-centre-twin/${lastScan.blueprintId}`);
    }
  };

  const handleCreateTwin = async () => {
    if (!recommendation) return;

    setIsCreatingTwin(true);
    try {
      // Initialize the DC Twin Builder Store from the recommendation
      initializeFromRecommendation(recommendation, currentSessionId || '');
      
      // Get region profile - use ca-central-1 as default (Montreal)
      const regionCode = 'ca-central-1';
      const region = getRegionByCode(regionCode);
      
      // Create twin using ActiveTwinContext (null locationId for legacy behavior)
      const newTwin = await createTwin(null, {
        name: recommendation.blueprintName,
        city: region?.city || 'Montreal',
        region_code: regionCode,
        tier: recommendation.suggestedTier || 'Tier III',
        capacity_kw: recommendation.suggestedCapacityKw || 5000,
        industry: recommendation.detectedIndustry || 'technology',
        pue_target: region?.default_pue || 1.3,
        renewable_target_pct: region?.energy_mix.renewable || 80,
        carbon_intensity: region?.carbon_intensity || 30,
        sovereignty_level: region?.sovereignty_profile.level || 'standard',
        metadata: {
          created_from: 'scanner',
          scan_session_id: currentSessionId,
          recommendation,
          source_url: url,
        },
      });

      if (newTwin) {
        // Update the scan session with the new twin ID
        if (currentSessionId) {
          await supabase
            .from('dc_scan_sessions')
            .update({ twin_id: newTwin.id })
            .eq('id', currentSessionId);
        }

        await refreshTwins();
        refetchLastScan();
        
        toast({
          title: "Twin Created",
          description: `Your ${recommendation.blueprintName} has been created.`
        });
        
        // Navigate to the builder with the new twin
        navigate(`/builder?twinId=${newTwin.id}&fromScanner=true`);
      }
    } catch (error) {
      console.error("Create twin error:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create twin",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTwin(false);
    }
  };

  const handleAdjustBlueprint = () => {
    if (!recommendation) return;
    
    // Initialize the DC Twin Builder Store from the recommendation
    initializeFromRecommendation(recommendation, currentSessionId || '');
    setCurrentStep(1);
    
    // Navigate to builder with pre-filled data
    navigate("/builder?fromScanner=true", {
      state: {
        fromRecommendation: true,
        recommendation,
        sessionId: currentSessionId
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Last Scan Banner */}
      {lastScan?.exists && !recommendation && (
        <LastScanBanner
          lastScan={lastScan}
          onViewRecommendation={handleViewLastRecommendation}
          onRescan={handleRescan}
          onOpenTwin={handleOpenTwin}
        />
      )}

      {/* Scanner Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Green Data Centre Twin Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter company website URL (e.g., example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="pl-10"
                disabled={isScanning}
              />
            </div>
            <Button onClick={handleScan} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scan & Recommend
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            We'll analyze the website to detect industry, scale, and compliance requirements, 
            then recommend an optimized Green Data Centre Twin blueprint.
          </p>
        </CardContent>
      </Card>

      {/* Recommendation Card */}
      {recommendation && (
        <DCScanRecommendationCard
          recommendation={recommendation}
          onCreateTwin={handleCreateTwin}
          onAdjustBlueprint={handleAdjustBlueprint}
          isCreating={isCreatingTwin}
        />
      )}
    </div>
  );
}
