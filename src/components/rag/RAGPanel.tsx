import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Link, Cloud, Database, Trash2, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useRagItems } from '@/hooks/useRagItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBuilderStore } from '@/stores/builderStore';

interface RAGPanelProps {
  systemId: string;
}

export function RAGPanel({ systemId }: RAGPanelProps) {
  const { items, isLoading, deleteItem, clearAll, refetch } = useRagItems(systemId);
  const { state } = useBuilderStore();
  const [activeTab, setActiveTab] = useState('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingUrls, setIsProcessingUrls] = useState(false);
  
  // Cloud Drives state
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveConnections, setDriveConnections] = useState<string[]>([]);
  
  // S3 state
  const [s3Config, setS3Config] = useState({ bucket: '', prefix: '', region: 'us-east-1' });
  const [isConnectingS3, setIsConnectingS3] = useState(false);
  
  // Database state
  const [dbConfig, setDbConfig] = useState({ connectionString: '', tables: [] as string[] });
  const [isConnectingDb, setIsConnectingDb] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // Test query state
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Get retrieval config from store
  const { topK, topN, temperature, hybridSearch } = state;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    const formData = new FormData();
    formData.append('system_id', systemId);
    formData.append('residency', 'ca-northamerica-northeast1');
    formData.append('options', JSON.stringify({ 
      chunkSize: 800, 
      overlap: 150,
      enableOCR: true,
      enablePII: false
    }));

    files.forEach(file => {
      formData.append('files', file);
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      
      files.forEach(file => {
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      });

      toast.success(`${files.length} file(s) uploaded successfully`);
      refetch();

      setTimeout(() => setUploadProgress({}), 2000);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
      setUploadProgress({});
    }
  };

  const handleUrlIngest = async () => {
    if (!urlInput.trim()) return;

    setIsProcessingUrls(true);
    try {
      const urls = urlInput.split('\n').filter(u => u.trim());
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-urls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            system_id: systemId,
            urls,
            schedule: 'once',
            options: {
              residency: 'ca-northamerica-northeast1',
              chunking: { size: 800, overlap: 150 }
            }
          })
        }
      );

      if (!response.ok) throw new Error('URL ingestion failed');

      const result = await response.json();
      toast.success(`${result.items?.length || 0} URL(s) queued for ingestion`);
      setUrlInput('');
      refetch();
    } catch (error) {
      console.error('URL ingest error:', error);
      toast.error('Failed to process URLs');
    } finally {
      setIsProcessingUrls(false);
    }
  };

  const handleMicrosoftConnect = async () => {
    setIsConnectingDrive(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to connect Microsoft');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-oauth-microsoft?action=start&system_id=${systemId}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.auth_url) {
        const authWindow = window.open(result.auth_url, 'MicrosoftAuth', 'width=600,height=700');
        if (!authWindow) {
          toast.error('Please allow popups to connect Microsoft');
          return;
        }
        toast.success('Complete authorization in the popup window');
        setDriveConnections([...driveConnections, 'microsoft']);
      }
    } catch (error) {
      console.error('Microsoft connect error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Microsoft';
      toast.error(errorMessage);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleS3Connect = async () => {
    if (!s3Config.bucket) {
      toast.error('Bucket name is required');
      return;
    }

    setIsConnectingS3(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-s3-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            system_id: systemId,
            ...s3Config
          })
        }
      );

      if (!response.ok) throw new Error('S3 connection failed');

      const result = await response.json();
      toast.success(result.message);
      setS3Config({ bucket: '', prefix: '', region: 'us-east-1' });
      refetch();
    } catch (error) {
      console.error('S3 connect error:', error);
      toast.error('Failed to connect S3');
    } finally {
      setIsConnectingS3(false);
    }
  };

  const handleDbConnect = async () => {
    if (!dbConfig.connectionString || dbConfig.tables.length === 0) {
      toast.error('Connection string and at least one table required');
      return;
    }

    setIsConnectingDb(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-db-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            system_id: systemId,
            ...dbConfig
          })
        }
      );

      if (!response.ok) throw new Error('Database connection failed');

      const result = await response.json();
      toast.success(result.message);
      setDbConfig({ connectionString: '', tables: [] });
      refetch();
    } catch (error) {
      console.error('Database connect error:', error);
      toast.error('Failed to connect database');
    } finally {
      setIsConnectingDb(false);
    }
  };

  const runTestQuery = async () => {
    if (!testQuery.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setIsTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to run tests');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            system_id: systemId,
            query: testQuery,
            topK,
            topN,
            temperature,
            hybrid: hybridSearch
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResult(result);
      toast.success(`Retrieved ${result.retrieval?.candidates || 0} candidates, reranked to ${result.retrieval?.reranked || 0} (${result.latency_ms}ms)`);
    } catch (error) {
      console.error('Test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Test failed';
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'indexed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Knowledge (RAG)</h3>
          <p className="text-sm text-muted-foreground">Upload documents, connect sources, and configure retrieval</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearAll} disabled={items.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="urls">
            <Link className="h-4 w-4 mr-2" />
            URLs
          </TabsTrigger>
          <TabsTrigger value="cloud">
            <Cloud className="h-4 w-4 mr-2" />
            Cloud Drives
          </TabsTrigger>
          <TabsTrigger value="databases">
            <Database className="h-4 w-4 mr-2" />
            Databases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card
            className={`border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground mb-4">
              PDF, DOCX, PPTX, XLSX, CSV, TXT, HTML, MD, JSON, ZIP • Max 50MB per file
            </p>
            <Input
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.html,.md,.json,.zip"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
          </Card>

          {Object.keys(uploadProgress).length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-3">Uploading...</h4>
              {Object.entries(uploadProgress).map(([name, progress]) => (
                <div key={name} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate flex-1">{name}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="urls">
          <Card className="p-4 space-y-4">
            <div>
              <Label htmlFor="urls">Enter URLs (one per line)</Label>
              <Textarea
                id="urls"
                placeholder="https://example.com/doc1.pdf&#10;https://example.com/page&#10;https://blog.example.com/article"
                className="mt-2 min-h-[120px] font-mono text-sm"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports web pages, PDFs, and documents
              </p>
            </div>
            <Button 
              onClick={handleUrlIngest}
              disabled={!urlInput.trim() || isProcessingUrls}
              className="w-full"
            >
              {isProcessingUrls ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Validate & Ingest'
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="cloud">
          <Card className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-4">OAuth Providers</h4>
              <div className="grid gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleMicrosoftConnect}
                  disabled={isConnectingDrive}
                  className="justify-start"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  {driveConnections.includes('microsoft') ? '✓ ' : ''}Connect SharePoint / OneDrive
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-semibold mb-4">AWS S3</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="s3-bucket">Bucket Name *</Label>
                  <Input
                    id="s3-bucket"
                    placeholder="my-bucket-name"
                    value={s3Config.bucket}
                    onChange={(e) => setS3Config({ ...s3Config, bucket: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="s3-prefix">Prefix (optional)</Label>
                  <Input
                    id="s3-prefix"
                    placeholder="documents/"
                    value={s3Config.prefix}
                    onChange={(e) => setS3Config({ ...s3Config, prefix: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="s3-region">Region</Label>
                  <Input
                    id="s3-region"
                    placeholder="us-east-1"
                    value={s3Config.region}
                    onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleS3Connect}
                  disabled={isConnectingS3 || !s3Config.bucket}
                  className="w-full"
                >
                  {isConnectingS3 ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect S3 Bucket'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="databases">
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Read-Only Connections</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Only read-only database connections are supported for security
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="db-connection">Connection String *</Label>
                <Input
                  id="db-connection"
                  type="password"
                  placeholder="postgresql://readonly:****@host:5432/db"
                  value={dbConfig.connectionString}
                  onChange={(e) => setDbConfig({ ...dbConfig, connectionString: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must include 'readonly' in the connection string
                </p>
              </div>

              <div>
                <Label>Tables to Index *</Label>
                <Textarea
                  placeholder="Enter table names (one per line)&#10;customers&#10;orders&#10;products"
                  value={dbConfig.tables.join('\n')}
                  onChange={(e) => setDbConfig({ ...dbConfig, tables: e.target.value.split('\n').filter(t => t.trim()) })}
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleDbConnect}
                disabled={isConnectingDb || !dbConfig.connectionString || dbConfig.tables.length === 0}
                className="w-full"
              >
                {isConnectingDb ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Connect Database
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Knowledge Table */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-4">Indexed Knowledge</h4>
        
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.source} • {item.size_bytes ? `${(item.size_bytes / 1024).toFixed(1)} KB` : 'Unknown size'}
                      {item.pages && ` • ${item.pages} pages`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Test Retrieval */}
      <Card className="p-4 space-y-4">
        <h4 className="text-sm font-semibold">Test Retrieval</h4>
        
        <div className="space-y-3">
          <Label>Test Query</Label>
          <Input
            placeholder="Ask a sample question..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
          />
          <Button 
            onClick={runTestQuery} 
            disabled={isTesting || !testQuery.trim()}
            className="w-full"
          >
            {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Run Test Query
          </Button>

          {testResult && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Answer:</p>
              <p className="text-sm">{testResult.answer}</p>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Latency: {testResult.latency_ms}ms • Citations: {testResult.citations?.length || 0}
                  {testResult.retrieval && ` • Retrieved: ${testResult.retrieval.candidates} → ${testResult.retrieval.reranked}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
