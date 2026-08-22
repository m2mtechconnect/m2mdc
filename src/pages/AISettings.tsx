import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Shield, Database, CheckCircle, XCircle, Loader, Settings, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DCCard, DCSectionHeader } from "@/components/dc-ui";
import { KnowledgeSourceReadiness } from "@/components/agent/KnowledgeSourceReadiness";

const DEFAULT_SYSTEM_PROMPT = `You are M2M Co-Pilot inside an enterprise control center.
Be concise and business-ready.
Always cite sources when grounding is enabled.
If you are unsure, say so and suggest a next step.
Respect user role (Executive | Manager | Engineer).
Never expose secrets or internal IDs.`;

interface HealthStatus {
  gemini: { status: 'ok' | 'error'; latency?: number; error?: string };
  vertexSearch: { status: 'ok' | 'error'; latency?: number; error?: string };
  region: string;
}

export default function AISettings() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState("");
  const [region, setRegion] = useState("northamerica-northeast1");
  const [model, setModel] = useState("gemini-1.5-pro");
  const [groundingEnabled, setGroundingEnabled] = useState(false);
  const [dataStoreId, setDataStoreId] = useState("");
  const [topK, setTopK] = useState(20);
  const [topN, setTopN] = useState(6);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [temperature, setTemperature] = useState(0.3);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [safetySettings, setSafetySettings] = useState({
    hate: true,
    harassment: true,
    sexual: true,
    dangerous: true
  });
  const [isChecking, setIsChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ projectId?: string; dataStoreId?: string }>({});

  // Load saved settings on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('copilot_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.projectId) setProjectId(settings.projectId);
        if (settings.region) setRegion(settings.region);
        if (settings.model) setModel(settings.model);
        if (typeof settings.groundingEnabled === 'boolean') setGroundingEnabled(settings.groundingEnabled);
        if (settings.dataStoreId) setDataStoreId(settings.dataStoreId);
        if (typeof settings.topK === 'number') setTopK(settings.topK);
        if (typeof settings.topN === 'number') setTopN(settings.topN);
        if (typeof settings.maxTokens === 'number') setMaxTokens(settings.maxTokens);
        if (typeof settings.temperature === 'number') setTemperature(settings.temperature);
        if (settings.systemPrompt) setSystemPrompt(settings.systemPrompt);
        if (settings.safetySettings) setSafetySettings(settings.safetySettings);
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      setLoadError('Stored configuration was unreadable and has been reset.');
      localStorage.removeItem('copilot_settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validate = (): boolean => {
    const errs: { projectId?: string; dataStoreId?: string } = {};
    if (!projectId.trim()) errs.projectId = 'Project ID is required';
    if (groundingEnabled && !dataStoreId.trim()) {
      errs.dataStoreId = 'Data Store ID is required when grounding is enabled';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);
    if (!validate()) {
      toast.error('Please fix validation errors before saving');
      return;
    }
    setIsSaving(true);
    try {
      const settings = {
        projectId,
        region,
        model,
        groundingEnabled,
        dataStoreId,
        topK,
        topN,
        maxTokens,
        temperature,
        systemPrompt,
        safetySettings
      };
      localStorage.setItem('copilot_settings', JSON.stringify(settings));
      toast.success('AI settings saved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save settings';
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main
          className="flex items-center justify-center min-h-[60vh]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Loading AI configuration…</p>
          </div>
      </main>
    );
  }

  const handleHealthCheck = async () => {
    setIsChecking(true);
    try {
      const data = await invokeEdgeFunction('copilot-health', {
        projectId, region, model, groundingEnabled, dataStoreId
      });

      setHealthStatus(data as HealthStatus);
      
      if (data?.gemini?.status === 'ok' && (!groundingEnabled || data?.vertexSearch?.status === 'ok')) {
        toast.success("Health check passed!");
      } else {
        toast.error("Health check failed. Check the results below.");
      }
    } catch (error) {
      toast.error("Health check failed");
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="w-full min-w-0 py-8 space-y-8" data-testid="ai-settings-workspace">
        <DCSectionHeader
          as="h1"
          title={t("aiSettings.title")}
          subtitle={t("aiSettings.subtitle")}
          icon={<Settings className="h-5 w-5 text-primary" />}
        />

        <div
          role="note"
          className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
        >
          These settings are stored in your current browser only. They are
          not synced to a server, are not shared with other users, and
          clearing browser storage removes them. No credentials or API
          keys are stored here.
        </div>

        {loadError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        <DCCard
          title={t("aiSettings.gcpConfig")}
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          status="operational"
        >
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label htmlFor="ai-project-id">Google Cloud Project ID</Label>
              <Input 
                id="ai-project-id"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (fieldErrors.projectId) setFieldErrors((p) => ({ ...p, projectId: undefined }));
                }}
                placeholder="your-project-id"
                aria-invalid={!!fieldErrors.projectId}
                aria-describedby={fieldErrors.projectId ? 'ai-project-id-error' : undefined}
              />
              {fieldErrors.projectId && (
                <p id="ai-project-id-error" role="alert" className="text-xs text-destructive">
                  {fieldErrors.projectId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger aria-label="Region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="northamerica-northeast1">🇨🇦 northamerica-northeast1 (Montreal)</SelectItem>
                  <SelectItem value="us-central1">🇺🇸 us-central1 (Iowa)</SelectItem>
                  <SelectItem value="europe-west1">🇪🇺 europe-west1 (Belgium)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger aria-label="Model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (Recommended)</SelectItem>
                  <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Faster)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DCCard>

        <DCCard
          title="Vertex AI search and grounding"
          icon={<Database className="h-5 w-5 text-primary" />}
          status="info"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-0.5">
              <Label>Enable Grounding</Label>
              <p className="text-xs text-muted-foreground">Connect to your Vertex AI Search data store</p>
            </div>
            <Switch
              checked={groundingEnabled}
              onCheckedChange={setGroundingEnabled}
              aria-label="Enable grounding against Vertex AI Search"
            />
          </div>

          {groundingEnabled && (
            <div className="space-y-6 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="ai-datastore-id">Data Store / Index ID</Label>
                <Input 
                  id="ai-datastore-id"
                  value={dataStoreId}
                  onChange={(e) => {
                    setDataStoreId(e.target.value);
                    if (fieldErrors.dataStoreId) setFieldErrors((p) => ({ ...p, dataStoreId: undefined }));
                  }}
                  placeholder="your-data-store-id"
                  aria-invalid={!!fieldErrors.dataStoreId}
                  aria-describedby={fieldErrors.dataStoreId ? 'ai-datastore-id-error' : undefined}
                />
                {fieldErrors.dataStoreId && (
                  <p id="ai-datastore-id-error" role="alert" className="text-xs text-destructive">
                    {fieldErrors.dataStoreId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Top-K Documents</Label>
                  <span className="text-sm font-mono text-primary">{topK}</span>
                </div>
                <Slider value={[topK]} onValueChange={([v]) => setTopK(v)} min={5} max={50} step={5} aria-label="Top-K documents" />
                <p className="text-xs text-muted-foreground">Initial documents to retrieve</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Rerank to Top-N</Label>
                  <span className="text-sm font-mono text-primary">{topN}</span>
                </div>
                <Slider value={[topN]} onValueChange={([v]) => setTopN(v)} min={1} max={10} step={1} aria-label="Rerank to top-N" />
                <p className="text-xs text-muted-foreground">Final snippets for generation</p>
              </div>
            </div>
          )}
        </DCCard>

        <KnowledgeSourceReadiness />

        <DCCard
          title="Generation Parameters"
          icon={<Shield className="h-5 w-5 text-primary" />}
          status="operational"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Tokens</Label>
                <span className="text-sm font-mono">{maxTokens}</span>
              </div>
              <Slider value={[maxTokens]} onValueChange={([v]) => setMaxTokens(v)} min={256} max={8192} step={256} aria-label="Maximum tokens" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Temperature</Label>
                <span className="text-sm font-mono">{temperature.toFixed(1)}</span>
              </div>
              <Slider value={[temperature * 10]} onValueChange={([v]) => setTemperature(v / 10)} min={0} max={10} step={1} aria-label="Temperature" />
              <p className="text-xs text-muted-foreground">Lower = more factual, Higher = more creative</p>
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea 
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </DCCard>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            onClick={handleSave}
            size="lg"
            className="flex-1"
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
          <Button onClick={handleHealthCheck} size="lg" variant="outline" disabled={isChecking}>
            {isChecking ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Health Check
          </Button>
        </div>

        {saveError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}

        {healthStatus && (
          <DCCard
            title="Health Check Results"
            status={healthStatus.gemini.status === 'ok' ? 'operational' : 'critical'}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {healthStatus.gemini.status === 'ok' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">Gemini API</p>
                    {healthStatus.gemini.error && (
                      <p className="text-xs text-red-500">{healthStatus.gemini.error}</p>
                    )}
                  </div>
                </div>
                {healthStatus.gemini.latency && (
                  <Badge variant="outline">{healthStatus.gemini.latency}ms</Badge>
                )}
              </div>

              {groundingEnabled && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {healthStatus.vertexSearch.status === 'ok' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">Vertex AI Search</p>
                      {healthStatus.vertexSearch.error && (
                        <p className="text-xs text-red-500">{healthStatus.vertexSearch.error}</p>
                      )}
                    </div>
                  </div>
                  {healthStatus.vertexSearch.latency && (
                    <Badge variant="outline">{healthStatus.vertexSearch.latency}ms</Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <p className="font-medium">Region</p>
                <Badge variant="secondary">{healthStatus.region}</Badge>
              </div>
            </div>
          </DCCard>
        )}
    </div>
  );
}
