import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, TestTube, ScrollText, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface IntegrationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  appIcon: string;
  type: "gemini" | "vertex" | "openai" | "anthropic" | "deepseek" | "mistral" | "cohere" | "huggingface";
}

export function IntegrationDrawer({
  open,
  onOpenChange,
  appName,
  appIcon,
  type,
}: IntegrationDrawerProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Gemini settings
  const [model, setModel] = useState("gemini-3-pro-preview");
  const [temperature, setTemperature] = useState("1.0");
  const [grounding, setGrounding] = useState(true);
  const [safetyFilters, setSafetyFilters] = useState(true);

  // Vertex settings
  const [indexId, setIndexId] = useState("");
  const [topK, setTopK] = useState("20");
  const [rerankN, setRerankN] = useState("6");
  const [groundingMode, setGroundingMode] = useState("vertex-search");
  const [embeddingsModel, setEmbeddingsModel] = useState("text-embedding-004");

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (type === "gemini") {
      setTestResult({
        success: true,
        answer: "This is a sample grounded answer from Gemini 1.5 Flash with citations.",
        citations: [
          { source: "HIPAA Compliance Guide", confidence: 0.92 },
          { source: "Q4 Marketing Report", confidence: 0.87 },
        ],
        latency: 1243,
        tokens: { input: 156, output: 89 },
      });
    } else {
      setTestResult({
        success: true,
        results: 6,
        topResult: {
          title: "HIPAA Compliance Guide 2024",
          score: 0.94,
          snippet: "Complete guide to HIPAA compliance requirements...",
        },
        latency: 234,
      });
    }

    setIsTesting(false);
    toast.success("Test completed successfully");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-lg bg-card flex items-center justify-center p-2">
              <img 
                src={appIcon} 
                alt={`${appName} logo`}
                className="h-full w-full object-contain dark:brightness-0 dark:invert"
              />
            </div>
            <SheetTitle className="text-h3">{appName}</SheetTitle>
          </div>
          <SheetDescription>
            Configure {appName} settings, credentials, and test your integration.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="settings" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="credentials">
              <Key className="mr-2 h-4 w-4" />
              Credentials
            </TabsTrigger>
            <TabsTrigger value="test">
              <TestTube className="mr-2 h-4 w-4" />
              Test
            </TabsTrigger>
            <TabsTrigger value="logs">
              <ScrollText className="mr-2 h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {type === "gemini" ? (
              <>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="model" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</SelectItem>
                      <SelectItem value="gemini-3.0-pro">Gemini 3.0 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="temperature">Temperature: {temperature}</Label>
                  <Input
                    id="temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-caption text-muted-foreground mt-1">
                    Controls randomness: 0 is focused, 2 is creative
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Grounding with Vertex Search</Label>
                    <p className="text-caption text-muted-foreground">
                      Ground responses in your indexed data
                    </p>
                  </div>
                  <Switch checked={grounding} onCheckedChange={setGrounding} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Safety Filters</Label>
                    <p className="text-caption text-muted-foreground">
                      Filter harmful or inappropriate content
                    </p>
                  </div>
                  <Switch checked={safetyFilters} onCheckedChange={setSafetyFilters} />
                </div>

                <div>
                  <Label>Region</Label>
                  <div className="mt-2 p-3 rounded-md bg-muted text-caption">
                    northamerica-northeast1 (Canadian Data Residency)
                  </div>
                  <p className="text-caption text-muted-foreground mt-1">
                    All data processing happens in Canada
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="indexId">Vertex Search Index ID</Label>
                  <Input
                    id="indexId"
                    value={indexId}
                    onChange={(e) => setIndexId(e.target.value)}
                    placeholder="projects/.../locations/.../dataStores/..."
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="topK">Top-K Results</Label>
                  <Input
                    id="topK"
                    type="number"
                    value={topK}
                    onChange={(e) => setTopK(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-caption text-muted-foreground mt-1">
                    Initial retrieval count before reranking
                  </p>
                </div>

                <div>
                  <Label htmlFor="rerankN">Rerank Top-N</Label>
                  <Input
                    id="rerankN"
                    type="number"
                    value={rerankN}
                    onChange={(e) => setRerankN(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-caption text-muted-foreground mt-1">
                    Final result count after AI reranking
                  </p>
                </div>

                <div>
                  <Label htmlFor="groundingMode">Grounding Mode</Label>
                  <Select value={groundingMode} onValueChange={setGroundingMode}>
                    <SelectTrigger id="groundingMode" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="vertex-search">Vertex Search</SelectItem>
                      <SelectItem value="vertex-search-grounding">
                        Vertex Search + Grounding
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="embeddingsModel">Embeddings Model</Label>
                  <Select value={embeddingsModel} onValueChange={setEmbeddingsModel}>
                    <SelectTrigger id="embeddingsModel" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="text-embedding-004">text-embedding-004</SelectItem>
                      <SelectItem value="textembedding-gecko">textembedding-gecko</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button className="w-full glow-yellow">Save Settings</Button>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-6">
            <Card className="p-4 bg-muted/50">
              <p className="text-caption">
                Credentials are automatically managed through Lovable Cloud. Your API keys are
                securely stored and never exposed.
              </p>
            </Card>

            <div>
              <Label>API Key Status</Label>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-primary">
                  <Check className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
                <span className="text-caption text-muted-foreground">
                  Last verified: 2 minutes ago
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-6">
            <div>
              <Label>Test Query</Label>
              <Input
                placeholder={
                  type === "gemini"
                    ? "Enter a sample prompt..."
                    : "Enter a search query..."
                }
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleTest}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>

            {testResult && (
              <Card className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary">
                    <Check className="mr-1 h-3 w-3" />
                    Success
                  </Badge>
                  <span className="text-caption text-muted-foreground">
                    {testResult.latency}ms
                  </span>
                </div>

                {type === "gemini" ? (
                  <>
                    <div>
                      <Label className="mb-2 block">Answer</Label>
                      <p className="text-body">{testResult.answer}</p>
                    </div>

                    <div>
                      <Label className="mb-2 block">Citations</Label>
                      <div className="space-y-2">
                        {testResult.citations.map((cite: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-caption">{cite.source}</span>
                            <Badge variant="outline">{(cite.confidence * 100).toFixed(0)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-caption">
                      <div>
                        <span className="text-muted-foreground">Input tokens:</span>{" "}
                        <span className="font-medium">{testResult.tokens.input}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output tokens:</span>{" "}
                        <span className="font-medium">{testResult.tokens.output}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="mb-2 block">Top Result</Label>
                      <Card className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-body font-medium">{testResult.topResult.title}</h4>
                          <Badge variant="outline">
                            {(testResult.topResult.score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-caption text-muted-foreground">
                          {testResult.topResult.snippet}
                        </p>
                      </Card>
                    </div>

                    <div className="text-caption">
                      <span className="text-muted-foreground">Total results:</span>{" "}
                      <span className="font-medium">{testResult.results}</span>
                    </div>
                  </>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <p className="text-caption text-muted-foreground">
              Last 20 API calls to {appName}
            </p>

            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-primary">Success</Badge>
                    <span className="text-caption text-muted-foreground">
                      {Math.floor(Math.random() * 60)} minutes ago
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-caption">
                    <div>
                      <span className="text-muted-foreground">Latency:</span>{" "}
                      <span className="font-medium">{Math.floor(Math.random() * 2000)}ms</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tokens:</span>{" "}
                      <span className="font-medium">{Math.floor(Math.random() * 500)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span className="font-medium">200</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
