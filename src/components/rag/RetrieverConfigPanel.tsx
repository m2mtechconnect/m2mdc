import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Database, Search, Sparkles, Shield } from "lucide-react";
import { useBuilderStore } from "@/stores/builderStore";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

interface RetrieverConfigPanelProps {
  className?: string;
}

export function RetrieverConfigPanel({ className }: RetrieverConfigPanelProps) {
  const { state, setState } = useBuilderStore();
  const { toast } = useToast();

  // Local state for immediate UI updates
  const [localTopK, setLocalTopK] = useState(state.topK);
  const [localTopN, setLocalTopN] = useState(state.topN);
  const [localTemperature, setLocalTemperature] = useState(state.temperature);
  const [localHybrid, setLocalHybrid] = useState(state.hybridSearch);
  const [localVertex, setLocalVertex] = useState(state.vertexEnabled);

  // Sync with store when external changes occur
  useEffect(() => {
    setLocalTopK(state.topK);
    setLocalTopN(state.topN);
    setLocalTemperature(state.temperature);
    setLocalHybrid(state.hybridSearch);
    setLocalVertex(state.vertexEnabled);
  }, [state.topK, state.topN, state.temperature, state.hybridSearch, state.vertexEnabled]);

  // Validation and clamping
  const clampTopK = (value: number) => Math.max(1, Math.min(50, value));
  const clampTopN = (value: number, maxTopK: number) => Math.max(1, Math.min(20, Math.min(value, maxTopK)));
  const clampTemperature = (value: number) => Math.max(0, Math.min(1, value));

  // Debounced persistence
  const debouncedTopK = useDebounce(localTopK, 300);
  const debouncedTopN = useDebounce(localTopN, 300);
  const debouncedTemperature = useDebounce(localTemperature, 300);

  useEffect(() => {
    const clampedTopK = clampTopK(debouncedTopK);
    const clampedTopN = clampTopN(debouncedTopN, clampedTopK);
    const clampedTemp = clampTemperature(debouncedTemperature);

    // Auto-clamp topN if it exceeds topK
    if (clampedTopN !== localTopN) {
      setLocalTopN(clampedTopN);
    }

    setState({
      topK: clampedTopK,
      topN: clampedTopN,
      temperature: clampedTemp,
    });
  }, [debouncedTopK, debouncedTopN, debouncedTemperature]);

  const handleTopKChange = useCallback((values: number[]) => {
    const newTopK = clampTopK(values[0]);
    setLocalTopK(newTopK);
    
    // Auto-adjust topN if it exceeds new topK
    if (localTopN > newTopK) {
      setLocalTopN(newTopK);
    }
  }, [localTopN]);

  const handleTopNChange = useCallback((values: number[]) => {
    const newTopN = clampTopN(values[0], localTopK);
    setLocalTopN(newTopN);
  }, [localTopK]);

  const handleTemperatureChange = useCallback((values: number[]) => {
    const newTemp = clampTemperature(values[0] / 100);
    setLocalTemperature(newTemp);
  }, []);

  const handleHybridChange = useCallback((checked: boolean) => {
    setLocalHybrid(checked);
    setState({ hybridSearch: checked });
  }, [setState]);

  const handleVertexChange = useCallback((checked: boolean) => {
    setLocalVertex(checked);
    setState({ vertexEnabled: checked });
  }, [setState]);

  return (
    <Card className={`glass-panel p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold text-lg">
          RAG Retrieval Configuration
        </h3>
        <Badge variant="outline" className="border-secondary text-secondary ml-auto">
          Gemini RAG
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Hybrid Search Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Hybrid Search</Label>
            <p className="text-xs text-muted-foreground">
              Combine vector + keyword (BM25) search
            </p>
          </div>
          <Switch checked={localHybrid} onCheckedChange={handleHybridChange} />
        </div>

        {/* Grounding Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Vertex AI Grounding</Label>
            <p className="text-xs text-muted-foreground">
              Verify context with external sources
            </p>
          </div>
          <Switch checked={localVertex} onCheckedChange={handleVertexChange} />
        </div>

        {/* Top-K Retrieval */}
        <div>
          <div className="flex justify-between mb-2">
            <Label className="text-sm font-medium">Top-K Documents</Label>
            <span className="text-sm font-mono text-secondary">{localTopK}</span>
          </div>
          <Slider value={[localTopK]} min={1} max={50} step={1} onValueChange={handleTopKChange} />
          <p className="text-xs text-muted-foreground mt-1">
            Initial documents to retrieve (1-50)
          </p>
        </div>

        {/* Rerank Top-N */}
        <div>
          <div className="flex justify-between mb-2">
            <Label className="text-sm font-medium">Rerank to Top-N</Label>
            <span className="text-sm font-mono text-primary">{localTopN}</span>
          </div>
          <Slider value={[localTopN]} min={1} max={Math.min(20, localTopK)} step={1} onValueChange={handleTopNChange} />
          <p className="text-xs text-muted-foreground mt-1">
            Final snippets for generation (≤ Top-K)
          </p>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex justify-between mb-2">
            <Label className="text-sm font-medium">Generation Temperature</Label>
            <span className="text-sm font-mono">{localTemperature.toFixed(2)}</span>
          </div>
          <Slider value={[localTemperature * 100]} min={0} max={100} step={1} onValueChange={handleTemperatureChange} />
          <p className="text-xs text-muted-foreground mt-1">
            Lower = more factual, Higher = more creative
          </p>
        </div>

        {/* Vector Search Settings */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-secondary" />
            <Label className="text-sm font-medium">Vector Search</Label>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Embedding Model:</span>
              <span className="font-mono text-foreground">text-embedding-004</span>
            </div>
            <div className="flex justify-between">
              <span>Vector Dimensions:</span>
              <span className="font-mono text-foreground">768</span>
            </div>
            <div className="flex justify-between">
              <span>Index:</span>
              <span className="font-mono text-foreground">m2m_docs_vec</span>
            </div>
          </div>
        </div>

        {/* Gemini Model */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Generation Model</Label>
          </div>
          <select className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth">
            <option>gemini-1.5-pro (Recommended)</option>
            <option>gemini-1.5-flash (Faster)</option>
          </select>
        </div>

        {/* Data Residency */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-secondary" />
            <Label className="text-sm font-medium">Data Residency</Label>
          </div>
          <select className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth">
            <option>🇨🇦 northamerica-northeast1 (Montreal)</option>
            <option>🇺🇸 us-central1 (Iowa)</option>
            <option>🇪🇺 europe-west1 (Belgium)</option>
          </select>
        </div>
      </div>
    </Card>
  );
}
