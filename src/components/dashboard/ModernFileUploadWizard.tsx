import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  File,
  Sparkles,
  Brain,
  ArrowRight,
  TrendingUp,
  Bot,
  Network,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDocumentAnalysis } from "@/hooks/useDocumentAnalysis";
import type { DocumentAnalysisResult } from "@/hooks/useDocumentAnalysis";
import { startBuilderFromFile } from "@/lib/intake";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/telemetry";

// ============================================================
// UNIFIED DOCUMENT UPLOAD & ANALYSIS COMPONENT
// ============================================================
// Entry points:
// 1) Dashboard hero: "Upload a file" -> source="dashboard"
// 2) Builder Step 2: "Upload Documents" -> source="builder" + agentId
//
// All uploads use the same pipeline:
// - document-analysis-start (instant job creation)
// - document-analysis-status (polling for progress)
// ============================================================

interface ModernFileUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: "dashboard" | "builder";
  agentId?: string;
  onAnalysisComplete?: (result: DocumentAnalysisResult) => void;
}

type Stage = 'upload' | 'analyzing' | 'results';

export function ModernFileUploadWizard({ 
  open, 
  onOpenChange, 
  source = "dashboard", 
  agentId,
  onAnalysisComplete 
}: ModernFileUploadWizardProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedType, setSelectedType] = useState<'twin' | 'agent' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Use unified document analysis hook (handles all backend logic)
  const {
    jobId,
    status,
    progress,
    phase,
    error: analysisError,
    result,
    isAnalyzing,
    startAnalysis,
    cancelAnalysis,
    reset: resetAnalysis,
  } = useDocumentAnalysis();

  const supportedTypes = [".pdf", ".docx", ".xlsx", ".txt", ".csv", ".json", ".md"];
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  // Sync hook state to UI stage
  if (result && stage !== 'results') {
    setStage('results');
  } else if (isAnalyzing && stage !== 'analyzing') {
    setStage('analyzing');
  } else if (analysisError && stage !== 'upload') {
    setStage('upload');
  }

  // Handle analysis completion callback
  if (result && onAnalysisComplete && stage === 'results') {
    onAnalysisComplete(result);
  }

  const handleFileSelect = (selectedFile: File) => {
    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(`File too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum 25MB allowed.`);
      return;
    }

    // Validate file type
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!supportedTypes.includes(fileExt)) {
      toast.error(`Unsupported file format: ${fileExt}. Supported formats: ${supportedTypes.join(', ')}`);
      return;
    }

    setFile(selectedFile);
    setStage('upload');
    resetAnalysis();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setStage('analyzing');
    await startAnalysis(file, { source, agentId });
  };

  const handleCancel = () => {
    cancelAnalysis();
    setStage('upload');
  };

  const handleRetry = () => {
    resetAnalysis();
    setSelectedType(null);
    setStage('upload');
  };

  const handleDownloadReport = () => {
    if (!result) return;
    
    const report = {
      file_name: file?.name,
      analysis_date: new Date().toISOString(),
      ...result,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${file?.name || 'document'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const handleBuildInStudio = async () => {
    if (!result || !jobId) return;

    // CONTEXT-AWARE ROUTING
    if (source === "builder" && agentId) {
      // Builder context: update current agent, don't navigate away
      toast.success("Document added to agent knowledge base!");
      onOpenChange(false);
      return;
    }

    // Dashboard context: create new agent/twin using unified intake service
    if (!selectedType) {
      toast.error("Please select a type (Digital Twin or AI Agent)");
      return;
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error("Please sign in to continue");
      return;
    }

    // Track analytics
    trackEvent('agent_intake.file_upload.completed', {
      fileName: file?.name,
      fileType: file?.type,
      selectedType,
      jobId,
    });

    // Use unified intake service
    const intakeResult = await startBuilderFromFile(
      jobId,
      user.id
    );

    if (intakeResult.success) {
      navigate(intakeResult.builderUrl);
      onOpenChange(false);
    } else {
      toast.error(intakeResult.error || 'Failed to start builder');
    }
  };

  const handleClose = () => {
    cancelAnalysis();
    onOpenChange(false);
    setTimeout(() => {
      setStage('upload');
      setFile(null);
      resetAnalysis();
      setSelectedType(null);
    }, 300);
  };

  // Estimate time based on progress (for UI display)
  const getEstimatedTime = () => {
    if (!isAnalyzing) return null;
    if (progress < 40) return 6;
    if (progress < 60) return 4;
    if (progress < 80) return 2;
    return 1;
  };

  const estimatedTime = getEstimatedTime();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative pb-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-h3 flex items-center gap-2">
                <Upload className="h-6 w-6 text-primary" />
                {source === "dashboard" ? "Upload & Analyze Document" : `Add Document to Agent`}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <DialogDescription className="text-body mt-2">
                  {source === "dashboard" 
                    ? "Upload a file to generate an AI Twin/Agent automatically"
                    : "Upload documents to enrich this agent with the same AI analysis used on the main dashboard."}
                </DialogDescription>
                {source === "builder" && (
                  <Badge variant="secondary" className="ml-2">
                    Enriching Current Agent
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Progress stepper */}
          <div className="flex items-center justify-between mt-6 px-8">
            {[
              { id: 1, label: 'Upload Document' },
              { id: 2, label: 'Gemini Analysis' },
              { id: 3, label: 'Convert to Twin / Agent' },
            ].map((stepDef, index) => {
              const isActive = 
                (stage === 'upload' && stepDef.id === 1) ||
                (stage === 'analyzing' && stepDef.id === 2) ||
                (stage === 'results' && stepDef.id === 3);
              const isCompleted = 
                (stage === 'analyzing' && stepDef.id === 1) ||
                (stage === 'results' && stepDef.id <= 2);

              return (
                <div key={stepDef.id} className="flex items-center gap-3">
                  {index > 0 && (
                    <div className={cn(
                      "h-[2px] w-24 transition-all duration-500",
                      isCompleted ? "bg-green-500" : "bg-border"
                    )} />
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-caption font-semibold transition-all duration-300 border-2",
                        isActive ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110" :
                        isCompleted ? "bg-green-500 text-white border-green-500" :
                        "bg-background text-muted-foreground border-border"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : stepDef.id}
                    </div>
                    <div className="text-xs font-medium text-left">
                      {stepDef.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Debug banner (dev only) */}
          {import.meta.env.DEV && (
            <div className="px-3 py-2 bg-muted/60 rounded-lg border border-border mt-4">
              <div className="text-[10px] font-mono space-y-1">
                <div><span className="text-muted-foreground">Stage:</span> <span className="text-primary font-semibold">{stage}</span></div>
                <div><span className="text-muted-foreground">JobId:</span> <span className="text-primary font-semibold">{jobId || 'null'}</span></div>
                <div><span className="text-muted-foreground">Progress:</span> <span className="text-primary font-semibold">{progress}%</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="text-primary font-semibold">{status || 'idle'}</span></div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* STAGE 1: Upload */}
        {stage === 'upload' && (
          <div className="space-y-6 p-2">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-16 text-center transition-all duration-300 cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                  : "border-muted hover:border-primary hover:bg-muted/50 hover:shadow-md"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={supportedTypes.join(",")}
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <FileText className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div className="max-w-md">
                  <p className="text-h4 font-semibold mb-3">
                    {isDragging ? "Drop your file here" : "Drag & drop your file"}
                  </p>
                  <p className="text-body text-muted-foreground mb-2">or click to browse</p>
                   <p className="text-caption text-muted-foreground">
                     Files up to 25MB • Multiple formats supported
                   </p>
                   <p className="text-caption text-primary mt-2 font-medium">
                     ⚡ Instant feedback • AI understanding in ≤8 seconds
                   </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center max-w-lg">
                  {supportedTypes.map((ext) => (
                    <Badge key={ext} variant="outline" className="text-xs px-3 py-1">
                      {ext}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {file && (
              <Card className="p-6 border-2 bg-gradient-to-br from-background to-muted/20">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <File className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-h5 font-medium truncate mb-1">{file.name}</p>
                    <p className="text-body text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                    </p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} size="lg">
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
                className="glow-yellow gap-2 px-8"
                size="lg"
              >
                <Sparkles className="h-5 w-5" />
                Analyze Document
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 2: AI Analysis Animation */}
        {stage === 'analyzing' && (
          <div className="py-16 px-8 space-y-8">
            <div className="flex flex-col items-center gap-6">
              {/* Animated Gemini-style loader */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-purple-500/30 to-blue-500/30 rounded-full blur-3xl animate-pulse" />
                <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-primary via-purple-500 to-blue-500 flex items-center justify-center animate-spin-slow">
                  <div className="h-28 w-28 rounded-full bg-background flex items-center justify-center">
                    <Brain className="h-14 w-14 text-primary animate-pulse" />
                  </div>
                </div>
                {/* Floating particles */}
                <div className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-primary/40 animate-bounce" />
                <div className="absolute -bottom-4 -left-4 h-6 w-6 rounded-full bg-purple-500/40 animate-bounce delay-300" />
                <div className="absolute top-1/2 -right-6 h-4 w-4 rounded-full bg-blue-500/40 animate-bounce delay-500" />
              </div>

              <div className="text-center space-y-3 max-w-md">
                <h3 className="text-h4 font-semibold">Analyzing with Gemini AI</h3>
                <p className="text-body text-muted-foreground animate-pulse">
                  {phase || 'Processing your document...'}
                </p>
                {estimatedTime && (
                  <div className="flex items-center justify-center gap-2 text-caption text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>~{estimatedTime} seconds remaining</span>
                  </div>
                )}
                {analysisError && (
                  <p className="text-xs text-red-500 mt-2">
                    {analysisError}
                  </p>
                )}
              </div>

              <div className="w-full max-w-md space-y-3">
                <Progress value={progress} className="h-3" />
                <p className="text-center text-caption text-muted-foreground">
                  {progress}% complete
                </p>
              </div>

              {/* Progress stages */}
              <div className="w-full max-w-lg space-y-2 pt-4">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  progress >= 10 && progress < 50 && "bg-primary/10",
                  progress >= 50 && "bg-muted"
                )}>
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                    progress >= 50 ? "bg-green-500" : progress >= 10 ? "bg-primary" : "bg-muted"
                  )}>
                    {progress >= 50 ? <CheckCircle2 className="h-5 w-5 text-white" /> : <FileText className="h-5 w-5 text-white" />}
                  </div>
                  <span className="text-body">Extracting text from file</span>
                </div>

                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  progress >= 50 && progress < 80 && "bg-primary/10",
                  progress >= 80 && "bg-muted"
                )}>
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                    progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-primary" : "bg-muted"
                  )}>
                    {progress >= 80 ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Brain className="h-5 w-5 text-white" />}
                  </div>
                  <span className="text-body">Gemini analyzing content</span>
                </div>

                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  progress >= 80 && "bg-primary/10"
                )}>
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                    progress >= 100 ? "bg-green-500" : progress >= 80 ? "bg-primary" : "bg-muted"
                  )}>
                    {progress >= 100 ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Sparkles className="h-5 w-5 text-white" />}
                  </div>
                  <span className="text-body">Generating blueprint</span>
                </div>
              </div>
            </div>

            {/* Cancel button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleCancel} size="lg">
                Cancel Analysis
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 3: Results */}
        {stage === 'results' && result && (
          <div className="space-y-6 p-2">
            <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-h5 font-semibold mb-2">AI Analysis Complete</h4>
                  <p className="text-body leading-relaxed">{result.summary}</p>
                  
                  {/* Truncation notice */}
                  {result.extraction_info?.truncated && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-caption text-muted-foreground">
                        <strong className="text-blue-600 dark:text-blue-400">Quick Analysis:</strong> We analyzed key sections 
                        of this {result.extraction_info?.pages || 'large'}-page document for faster results.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {/* Left panel */}
              <div className="space-y-4">
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Network className="h-5 w-5 text-primary" />
                    <h5 className="text-body font-semibold">Classification</h5>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-caption text-muted-foreground">Industry</span>
                      <Badge variant="secondary">{result.detected_industry}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-caption text-muted-foreground">Department</span>
                      <Badge variant="secondary">{result.detected_department}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-caption text-muted-foreground">Complexity</span>
                      <Badge variant={result.estimated_complexity === 'High' ? 'destructive' : 'outline'}>
                        {result.estimated_complexity}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {result.detected_kpis.length > 0 && (
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h5 className="text-body font-semibold">Target KPIs</h5>
                    </div>
                    <div className="space-y-3">
                      {result.detected_kpis.slice(0, 3).map((kpi, i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-body font-medium mb-1">{kpi.name}</p>
                          <p className="text-caption text-primary">{kpi.target_improvement}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right panel */}
              <div className="space-y-4">
                {result.suggested_workflows.length > 0 && (
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="h-5 w-5 text-primary" />
                      <h5 className="text-body font-semibold">Workflows</h5>
                    </div>
                    <div className="space-y-3">
                      {result.suggested_workflows.slice(0, 2).map((wf, i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-body font-medium mb-1">{wf.name}</p>
                          <p className="text-caption text-muted-foreground">{wf.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {result.suggested_integrations.length > 0 && (
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Network className="h-5 w-5 text-primary" />
                      <h5 className="text-body font-semibold">Integrations</h5>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {result.suggested_integrations.slice(0, 6).map((int, i) => (
                        <Badge key={i} variant="outline">{int}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {result.compliance_requirements.length > 0 && (
                  <Card className="p-5 border-2 border-orange-500/20 bg-orange-500/5">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="h-5 w-5 text-orange-500" />
                      <h5 className="text-body font-semibold">Compliance</h5>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {result.compliance_requirements.map((req, i) => (
                        <Badge key={i} variant="outline" className="border-orange-500/50">{req}</Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Choose twin or agent - ONLY for dashboard uploads */}
            {source === "dashboard" && (
              <div className="pt-4">
                <p className="text-body font-medium mb-4">Choose how to build:</p>
                <div className="grid grid-cols-2 gap-4">
                <Card
                  className={cn(
                    "p-6 cursor-pointer transition-all border-2",
                    selectedType === 'twin' 
                      ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" 
                      : "border-muted hover:border-primary hover:shadow-md"
                  )}
                  onClick={() => setSelectedType('twin')}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Network className="h-7 w-7 text-blue-500" />
                    </div>
                    <div>
                      <h5 className="text-body font-semibold mb-1">Digital Twin</h5>
                      <p className="text-caption text-muted-foreground">
                        Process Twin
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className={cn(
                    "p-6 cursor-pointer transition-all border-2",
                    selectedType === 'agent' 
                      ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" 
                      : "border-muted hover:border-primary hover:shadow-md"
                  )}
                  onClick={() => setSelectedType('agent')}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="h-14 w-14 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Bot className="h-7 w-7 text-purple-500" />
                    </div>
                    <div>
                      <h5 className="text-body font-semibold mb-1">AI Agent</h5>
                      <p className="text-caption text-muted-foreground">
                        {result.use_case}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            )}

            {/* Builder context: simpler confirmation */}
            {source === "builder" && (
              <Card className="p-6 border-2 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h5 className="text-h5 font-semibold mb-1">Document Ready to Add</h5>
                    <p className="text-body text-muted-foreground">
                      This document will be added to your agent's knowledge base.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex justify-between gap-3 pt-4">
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRetry} size="lg">
                  {source === "builder" ? "Upload Different File" : "Retry Analysis"}
                </Button>
                {source === "dashboard" && (
                  <Button variant="outline" onClick={handleDownloadReport} size="lg">
                    Download Report
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} size="lg">
                  Close
                </Button>
                <Button
                  onClick={handleBuildInStudio}
                  disabled={source === "dashboard" && !selectedType}
                  className="glow-yellow gap-2 px-8"
                  size="lg"
                >
                  <Sparkles className="h-5 w-5" />
                  {source === "builder" ? "Add to Agent" : "Build in Studio"}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer badge */}
        <div className="px-6 pb-4 pt-2 border-t border-border">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center">
              Powered by {result?.powered_by || "Gemini Flash"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
