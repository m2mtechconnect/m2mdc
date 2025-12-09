import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ClipboardList, FileText, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModernFileUploadWizard } from "./ModernFileUploadWizard";
import { TemplateLibraryModal } from "./TemplateLibraryModal";
import { QuestionnaireWizard } from "./QuestionnaireWizard";
import { SmartAgentInput } from "../SmartAgentInput";
import { useRecommendations } from "@/hooks/useRecommendations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRecommendationsStore } from "@/stores/recommendationsStore";
import { LoadingState, EmptyState, ErrorState } from "../search/RecommendationsStates";
import { SiteCaptureProgressCard } from "../search/SiteCaptureProgressCard";
import { RecommendationsPanel } from "../search/RecommendationsPanel";
import { CacheStatusBanner } from "../search/CacheStatusBanner";
import { DiagnosticsModal } from "../search/DiagnosticsModal";
import { ManualContentDialog } from "../search/ManualContentDialog";

interface UnifiedIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifiedIntakeModal({ open, onOpenChange }: UnifiedIntakeModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'url' | 'file' | 'questionnaire' | 'template' | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  
  const { uiState, fetchRecommendations, fetchRecommendationsFromContent, reset: resetRecommendations, isLoading } = useRecommendations();
  const resetState = useRecommendationsStore((state) => state.resetState);

  const handleUrlAnalysis = async (url: string, force = false, deepIngest = false) => {
    if (!url || url.trim().length === 0) {
      toast.error("Please enter a valid URL");
      return;
    }

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    setCurrentUrl(normalizedUrl);
    resetState();

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error("Please sign in to continue");
        return;
      }

      toast.info("Scanning website for agent opportunities...");
      await fetchRecommendations(normalizedUrl, force, deepIngest);
    } catch (error) {
      console.error("[UnifiedIntakeModal] Error during URL analysis:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start analysis. Please try again.";
      
      if (
        errorMessage.includes("certificate") ||
        errorMessage.includes("SSL") ||
        errorMessage.includes("TLS")
      ) {
        toast.error(
          "SSL certificate error detected. The site may have security issues. Try a different URL.",
          { duration: 5000 }
        );
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleManualContentSubmit = async (data: { url: string; companyName: string; content: string }) => {
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
      console.error("[UnifiedIntakeModal] Error processing manual content:", error);
      toast.error("Failed to process manual content");
    }
  };

  const intakeMethods = [
    {
      id: 'url' as const,
      title: 'Analyze a URL',
      description: 'Scan a company website to generate AI agent recommendations',
      icon: Globe,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      hoverColor: 'hover:bg-blue-500/20',
    },
    {
      id: 'file' as const,
      title: 'Upload a File',
      description: 'Upload docs, spreadsheets, or slides to auto-generate a twin/agent plan',
      icon: Upload,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      hoverColor: 'hover:bg-green-500/20',
    },
    {
      id: 'questionnaire' as const,
      title: 'Answer a Questionnaire',
      description: 'Describe your use case in plain language. We\'ll design the twin/agent for you',
      icon: ClipboardList,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      hoverColor: 'hover:bg-purple-500/20',
    },
    {
      id: 'template' as const,
      title: 'Start With a Template',
      description: 'Pick a pre-built Digital Twin or Agent from the Template Marketplace',
      icon: FileText,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      hoverColor: 'hover:bg-amber-500/20',
    },
  ];

  const handleMethodSelect = (methodId: typeof intakeMethods[number]['id']) => {
    setSelectedMethod(methodId);
  };

  const handleBack = () => {
    setSelectedMethod(null);
    resetState();
    setCurrentUrl("");
  };

  const renderMethodContent = () => {
    switch (selectedMethod) {
      case 'url':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Back
              </Button>
              <h3 className="text-lg font-semibold">Analyze a URL</h3>
            </div>
            
            <SmartAgentInput
              onUrlAnalysis={(url, force, deepIngest) => handleUrlAnalysis(url, force || false, deepIngest || false)}
              isAnalyzing={isLoading}
            />

            {/* URL Analysis States */}
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
              <div className="space-y-6">
                <CacheStatusBanner
                  domain={uiState.data.domain}
                  onScanAgain={() => handleUrlAnalysis(currentUrl, true)}
                />
                <RecommendationsPanel recommendations={uiState.data} />
              </div>
            )}

            <DiagnosticsModal open={showDiagnostics} onOpenChange={setShowDiagnostics} />
            <ManualContentDialog
              open={showManualInput}
              onOpenChange={setShowManualInput}
              onSubmit={handleManualContentSubmit}
              defaultUrl={currentUrl}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open && !selectedMethod && selectedMethod !== 'file' && selectedMethod !== 'questionnaire' && selectedMethod !== 'template'} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              🧩 Start Your Twin/Agent Intake
            </DialogTitle>
            <DialogDescription>
              Choose how you'd like to create your AI system. Each method will guide you through a tailored process.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
            {intakeMethods.map((method) => (
              <Card
                key={method.id}
                className={`p-6 cursor-pointer group transition-smooth ${method.hoverColor} border-2 hover:border-primary/50`}
                onClick={() => handleMethodSelect(method.id)}
              >
                <div className="flex flex-col items-start gap-4">
                  <div className={`p-3 rounded-lg ${method.bgColor} flex-shrink-0`}>
                    <method.icon className={`h-6 w-6 ${method.color}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-smooth">
                      {method.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* URL Analysis in Modal */}
      <Dialog open={open && selectedMethod === 'url'} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleBack();
          onOpenChange(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Analyze URL</DialogTitle>
          </DialogHeader>
          {renderMethodContent()}
        </DialogContent>
      </Dialog>

      {/* Other Methods as Separate Modals */}
      <ModernFileUploadWizard 
        open={open && selectedMethod === 'file'} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleBack();
            onOpenChange(false);
          }
        }}
        source="dashboard"
      />
      
      <TemplateLibraryModal 
        open={open && selectedMethod === 'template'} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleBack();
            onOpenChange(false);
          }
        }}
      />
      
      <QuestionnaireWizard 
        open={open && selectedMethod === 'questionnaire'} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleBack();
            onOpenChange(false);
          }
        }}
      />
    </>
  );
}
