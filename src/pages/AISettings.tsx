import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Shield, Database, CheckCircle, XCircle, Loader, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DCCard, DCSectionHeader } from "@/components/dc-ui";

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
      localStorage.removeItem('copilot_settings');
    }
  }, []);

  const handleSave = async () => {
    if (!projectId || !model) {
      toast.error("Please configure Project ID and select an AI model");
      return;
    }
    try {
      // Store settings in localStorage for now (in production, you'd store these server-side)
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
      toast.success("AI settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

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
    <Layout>
      <div className="container mx-auto py-8 px-4 space-y-8">
        <DCSectionHeader
          title="AI Engine Settings"
          subtitle="Configure Google Gemini (Vertex AI) for M2M Co-Pilot"
          icon={<Settings className="h-5 w-5 text-primary" />}
        />

        <DCCard
          title="Google Cloud Configuration"
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          status="operational"
        >
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label>Google Cloud Project ID</Label>
              <Input 
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="your-project-id"
              />
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
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
                <SelectTrigger>
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
          title="Vertex AI Search & Grounding"
          icon={<Database className="h-5 w-5 text-primary" />}
          status="info"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-0.5">
              <Label>Enable Grounding</Label>
              <p className="text-xs text-muted-foreground">Connect to your Vertex AI Search data store</p>
            </div>
            <Switch checked={groundingEnabled} onCheckedChange={setGroundingEnabled} />
          </div>

          {groundingEnabled && (
            <div className="space-y-6 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label>Data Store / Index ID</Label>
                <Input 
                  value={dataStoreId}
                  onChange={(e) => setDataStoreId(e.target.value)}
                  placeholder="your-data-store-id"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Top-K Documents</Label>
                  <span className="text-sm font-mono text-primary">{topK}</span>
                </div>
                <Slider value={[topK]} onValueChange={([v]) => setTopK(v)} min={5} max={50} step={5} />
                <p className="text-xs text-muted-foreground">Initial documents to retrieve</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Rerank to Top-N</Label>
                  <span className="text-sm font-mono text-primary">{topN}</span>
                </div>
                <Slider value={[topN]} onValueChange={([v]) => setTopN(v)} min={1} max={10} step={1} />
                <p className="text-xs text-muted-foreground">Final snippets for generation</p>
              </div>
            </div>
          )}
        </DCCard>

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
              <Slider value={[maxTokens]} onValueChange={([v]) => setMaxTokens(v)} min={256} max={8192} step={256} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Temperature</Label>
                <span className="text-sm font-mono">{temperature.toFixed(1)}</span>
              </div>
              <Slider value={[temperature * 10]} onValueChange={([v]) => setTemperature(v / 10)} min={0} max={10} step={1} />
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

        <div className="flex gap-4">
          <Button onClick={handleSave} size="lg" className="flex-1">
            Save Configuration
          </Button>
          <Button onClick={handleHealthCheck} size="lg" variant="outline" disabled={isChecking}>
            {isChecking ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Health Check
          </Button>
        </div>

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
    </Layout>
  );
}
