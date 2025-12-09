import { useState, useCallback, useEffect } from "react";
import { Upload, ClipboardList, FileText, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ModernFileUploadWizard } from "./dashboard/ModernFileUploadWizard";
import { TemplateLibraryModal } from "./dashboard/TemplateLibraryModal";
import { QuestionnaireWizard } from "./dashboard/QuestionnaireWizard";
import { SearchResultsPanel } from "./search/SearchResultsPanel";
import { InsightActionPanel } from "./search/InsightActionPanel";
import { CaptureErrorDisplay } from "./search/CaptureErrorDisplay";
import { RecommendationsPanel } from "./search/RecommendationsPanel";
import { CacheStatusBanner } from "./search/CacheStatusBanner";
import { useRecommendations } from "@/hooks/useRecommendations";
import { LoadingState, EmptyState, ErrorState } from "./search/RecommendationsStates";
import { SiteCaptureProgressCard } from "./search/SiteCaptureProgressCard";
import { DiagnosticsModal } from "./search/DiagnosticsModal";
import { ManualContentDialog } from "./search/ManualContentDialog";
import { SmartAgentInput } from "./SmartAgentInput";
import { logger } from "@/lib/logger";
import { useRecommendationsStore } from "@/stores/recommendationsStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { startBuilderFromUrl } from "@/lib/intake";

export default function HeroSearchBar({ onCoPilotQuery }: { onCoPilotQuery?: (query: string) => void }) {
  const [searchResult, setSearchResult] = useState<any>(null);
  const [insightResult, setInsightResult] = useState<any>(null);
  const [captureError, setCaptureError] = useState<any>(null);
  const [showCachedRecommendations, setShowCachedRecommendations] = useState(false);
  
  // Get resetState from store hook properly
  const resetState = useRecommendationsStore((state) => state.resetState);
  
  // Modal states
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  
  const navigate = useNavigate();
  const { uiState, fetchRecommendations, fetchRecommendationsFromContent, reset: resetRecommendations, isLoading } = useRecommendations();
  const [currentUrl, setCurrentUrl] = useState("");
  
  // Access cached recommendations from Zustand store
  const { generatedItems, lastGenerated } = useRecommendationsStore();
  
  // On mount, check if we have cached recommendations to display
  useEffect(() => {
    // Validate lastGenerated is a valid domain, not a timestamp
    const isValidDomain =
      lastGenerated &&
      lastGenerated.length > 0 &&
      !/^\d{4}-\d{2}-\d{2}T/.test(lastGenerated);
    
    if (generatedItems.length > 0 && isValidDomain && uiState.kind === "idle") {
      setShowCachedRecommendations(true);
      // Use the stored domain
      setCurrentUrl(lastGenerated!);
    } else if (!isValidDomain && generatedItems.length > 0) {
      // Clear invalid cached data
      resetState();
    }
  }, [generatedItems.length, lastGenerated, uiState.kind, resetState]);


  const handleUrlAnalysis = useCallback(
    async (url: string, force = false, deepIngest = false) => {
      // Validate URL first
      if (!url || url.trim().length === 0) {
        toast.error("Please enter a valid URL");
        return;
      }

      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
      console.log("[HeroSearchBar] Starting URL analysis:", {
        url,
        normalizedUrl,
        force,
        deepIngest,
      });
      setCurrentUrl(normalizedUrl);
      
      // Clear all previous states
      setSearchResult(null);
      setInsightResult(null);
      setCaptureError(null);
      setShowCachedRecommendations(false);
      
      // Reset recommendations store to clear old data
      resetState();
      
      logger.debug("Starting unified intake from URL", {
        component: "HeroSearchBar",
        action: "handleUrlAnalysis",
        metadata: { normalizedUrl },
      });

      try {
        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          toast.error("Please sign in to continue");
          return;
        }

        // Fetch recommendations instead of going directly to builder
        toast.info("Scanning website for agent opportunities...");
        await fetchRecommendations(normalizedUrl, force, deepIngest);
      } catch (error) {
        console.error("[HeroSearchBar] Error during URL analysis:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to start analysis. Please try again.";
        
        // Check if it's an SSL certificate error
        if (
          errorMessage.includes("certificate") ||
          errorMessage.includes("SSL") ||
          errorMessage.includes("TLS")
        ) {
          toast.error(
            "SSL certificate error detected. The site may have security issues. Try a different URL.",
            {
              duration: 5000,
            }
          );
        } else {
          toast.error(errorMessage);
        }
      }
    },
    [navigate, resetState]
  );

  const handleManualContentSubmit = useCallback(
    async (data: { url: string; companyName: string; content: string }) => {
      console.log("[HeroSearchBar] Manual content submitted:", {
        url: data.url,
        companyName: data.companyName,
        contentLength: data.content.length,
      });
      
      // Reset all previous states
      setSearchResult(null);
      setInsightResult(null);
      setCaptureError(null);
      setShowCachedRecommendations(false);
      resetState();
      
      toast.info("Generating recommendations from pasted content...");
      
      try {
        await fetchRecommendationsFromContent({
          url: data.url === "manual-input" ? undefined : data.url,
          companyName: data.companyName,
          content: data.content,
          topN: 3,
        });
      } catch (error) {
        console.error("[HeroSearchBar] Error processing manual content:", error);
        toast.error("Failed to process manual content");
      }
    },
    [fetchRecommendationsFromContent, resetState]
  );

  const handleAction = (action: string, data?: any) => {
    switch (action) {
      case "save-report":
        toast.info("Save as report feature coming soon");
        break;
      case "create-assistant":
        const websiteTitle = searchResult?.snapshot?.title || "Website";
        const summary = searchResult?.summary?.summary || "";
        navigate(
          `/builder?source=homepage&goal=${encodeURIComponent(`Assistant for ${websiteTitle}`)}&department=Operations&template=assistant`
        );
        setSearchResult(null);
        break;
      case "index-site":
        toast.success(`Queuing deeper crawl for ${data}`);
        break;
      default:
        console.log("Unknown action:", action);
    }
  };

  const handleApplyCTA = (cta: any) => {
    console.log("[HeroSearchBar] Applying CTA:", cta);
    
    // Extract data from CTA for URL params
    const goal = cta.payload?.goal || cta.title || '';
    const department = cta.payload?.department || 'Operations';
    const template = cta.payload?.template || cta.blueprintId || '';
    const type = cta.payload?.type || 'agent';
    
    // Route to Builder with URL params
    const params = new URLSearchParams({
      source: 'homepage',
      goal,
      department,
      template,
      type,
    });
    
    navigate(`/builder?${params.toString()}`);
    
    toast.success(`${cta.title} - Redirecting to Builder...`);
  };

  return (
    <>
      {/* Smart Agent Input */}
      <SmartAgentInput
        onUrlAnalysis={(url, force, deepIngest) => handleUrlAnalysis(url, force || false, deepIngest || false)}
        onCoPilotQuery={onCoPilotQuery}
        isAnalyzing={isLoading}
      />

      {/* Quick actions */}
      <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowFileUpload(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-smooth flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50"
              >
                <Upload className="h-4 w-4" />
                Upload a file
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Upload docs, spreadsheets, or slides to auto-generate a twin/agent plan
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <span className="text-muted-foreground/50">•</span>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowQuestionnaire(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-smooth flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50"
              >
                <ClipboardList className="h-4 w-4" />
                Answer a questionnaire
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Describe your use case in plain language. We'll design the twin/agent for you
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <span className="text-muted-foreground/50">•</span>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowTemplates(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-smooth flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50"
              >
                <FileText className="h-4 w-4" />
                Start with a template
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Pick a pre-built Digital Twin or Agent from the Template Marketplace
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <span className="text-muted-foreground/50">•</span>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => window.open("https://docs.m2magentic.com", "_blank")}
                className="text-sm text-muted-foreground hover:text-primary transition-smooth flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50"
              >
                <HelpCircle className="h-4 w-4" />
                Learn how this works
              </button>
            </TooltipTrigger>
            <TooltipContent>
              View documentation and guides
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Recommendations UI States */}
      {uiState.kind === "loading" && (
        <LoadingState domain={uiState.domain || currentUrl} />
      )}

      {(uiState.kind === "discovering" ||
        uiState.kind === "capturing" ||
        uiState.kind === "analyzing") && (
        <SiteCaptureProgressCard
          domain={uiState.domain}
          pages={uiState.kind === "discovering" ? [] : uiState.captureResults}
          currentPage={
            uiState.kind === "discovering"
              ? 0
              : uiState.kind === "capturing"
              ? uiState.captured
              : uiState.analyzed
          }
          totalPages={
            uiState.kind === "discovering"
              ? 0
              : uiState.kind === "capturing"
              ? uiState.total
              : uiState.total
          }
          phase={uiState.kind}
          stats={
            uiState.kind === "discovering"
              ? undefined
              : {
                  discovered: uiState.total,
                  captured:
                    uiState.kind === "capturing"
                      ? uiState.captured
                      : uiState.total,
                  analyzed: uiState.kind === "analyzing" ? uiState.analyzed : 0,
                }
          }
          message={uiState.message}
        />
      )}

      {uiState.kind === "empty" && (
        <EmptyState
          message={uiState.message}
          onRetry={() => handleUrlAnalysis(currentUrl, false)}
          onForce={() => handleUrlAnalysis(currentUrl, true)}
          onForceIngest={() => handleUrlAnalysis(currentUrl, true, true)}
          onDifferentUrl={() => {
            setCurrentUrl("");
            resetRecommendations();
          }}
          onDiagnostics={() => setShowDiagnostics(true)}
          onManualInput={() => setShowManualInput(true)}
          captureResults={uiState.captureResults}
          telemetry={(uiState as any).telemetry}
        />
      )}

      {uiState.kind === "error" && (
        <ErrorState
          message={uiState.message}
          onRetry={() => handleUrlAnalysis(currentUrl, false)}
          onForce={() => handleUrlAnalysis(currentUrl, true)}
          onForceIngest={() => handleUrlAnalysis(currentUrl, true, true)}
          onDifferentUrl={() => {
            setCurrentUrl("");
            resetRecommendations();
          }}
          onDiagnostics={() => setShowDiagnostics(true)}
          onManualInput={() => setShowManualInput(true)}
        />
      )}

      {uiState.kind === "ok" && (
        <div className="mt-8 animate-fade-in space-y-6">
          <CacheStatusBanner
            domain={uiState.data.domain}
            onScanAgain={() => handleUrlAnalysis(currentUrl, true)}
          />
          <RecommendationsPanel recommendations={uiState.data} />
        </div>
      )}
      
      {/* Show cached recommendations when returning from navigation */}
      {showCachedRecommendations &&
        uiState.kind === "idle" &&
        generatedItems.length > 0 && (
          <div className="mt-8 animate-fade-in space-y-6">
            <CacheStatusBanner
              domain={
                lastGenerated && lastGenerated.length > 0
                  ? lastGenerated
                  : currentUrl
              }
              onScanAgain={() => {
                setShowCachedRecommendations(false);
                const urlToAnalyze =
                  lastGenerated && lastGenerated.length > 0
                    ? lastGenerated
                    : currentUrl;
                if (urlToAnalyze) {
                  handleUrlAnalysis(urlToAnalyze, true);
                }
              }}
            />
            <RecommendationsPanel
              recommendations={{
                company: null,
                domain:
                  lastGenerated && lastGenerated.length > 0
                    ? lastGenerated
                    : currentUrl,
                industryGuess: null,
                departmentsCovered: [],
                items: generatedItems,
                status: "ok" as const,
              }}
            />
          </div>
        )}

      {/* Legacy search results */}
      {uiState.kind === "idle" && captureError && (
        <CaptureErrorDisplay
          error={captureError}
          onRetry={() => {
            setCaptureError(null);
            handleUrlAnalysis(currentUrl, false);
          }}
          onUploadFile={() => setShowFileUpload(true)}
          onContactSupport={() => {
            toast.info("Opening support...");
            window.open(
              "mailto:support@m2mtechconnect.com?subject=URL Analysis Error&body=" +
                encodeURIComponent(
                  `Error: ${captureError.error || captureError}`
                )
            );
          }}
        />
      )}

      {uiState.kind === "idle" && insightResult && !captureError && (
        <div className="mt-8 animate-fade-in">
          <InsightActionPanel
            url={insightResult.url}
            title={insightResult.title}
            summary={insightResult.summary}
            classification={insightResult.classification}
            ctas={insightResult.ctas}
            onApply={handleApplyCTA}
            pageId={insightResult.pageId}
            insightResult={insightResult}
          />
        </div>
      )}

      {uiState.kind === "idle" && searchResult && !insightResult && !captureError && (
        <div className="mt-8 animate-fade-in">
          <SearchResultsPanel result={searchResult} onAction={handleAction} />
        </div>
      )}

      {/* Modals */}
      <ModernFileUploadWizard 
        open={showFileUpload} 
        onOpenChange={setShowFileUpload}
        source="dashboard"
      />
      <TemplateLibraryModal open={showTemplates} onOpenChange={setShowTemplates} />
      <QuestionnaireWizard open={showQuestionnaire} onOpenChange={setShowQuestionnaire} />
      <DiagnosticsModal open={showDiagnostics} onOpenChange={setShowDiagnostics} />
      <ManualContentDialog
        open={showManualInput}
        onOpenChange={setShowManualInput}
        onSubmit={handleManualContentSubmit}
        defaultUrl={currentUrl}
      />
    </>
  );
}
