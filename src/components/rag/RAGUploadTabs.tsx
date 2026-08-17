import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Link, Cloud, Database, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RAGUploadTabsProps {
  systemId: string;
}

export function RAGUploadTabs({ systemId }: RAGUploadTabsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [urls, setUrls] = useState("");
  const [uploading, setUploading] = useState(false);
  const [missingSecrets, setMissingSecrets] = useState<string[]>([]);
  const { toast } = useToast();

  const checkSecrets = async (provider: 'google' | 'microsoft' | 'aws') => {
    const secretMap = {
      google: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
      microsoft: ['MSFT_CLIENT_ID', 'MSFT_CLIENT_SECRET'],
      aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    };

    const missing: string[] = [];
    for (const secret of secretMap[provider]) {
      // Check if secret exists (this would be done server-side in production)
      const exists = false; // Placeholder
      if (!exists) missing.push(secret);
    }
    
    setMissingSecrets(missing);
    return missing.length === 0;
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to RAG
      const formData = new FormData();
      formData.append('file', file);
      formData.append('system_id', systemId);

      const { data, error } = await supabase.functions.invoke('rag-upload', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Upload successful",
        description: `${file.name} is being indexed`,
      });

      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urls.trim()) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const urlList = urls.split('\n').filter(u => u.trim());

      const { data, error } = await supabase.functions.invoke('rag-urls', {
        body: { urls: urlList, system_id: systemId },
      });

      if (error) throw error;

      toast({
        title: "URLs submitted",
        description: `Indexing ${urlList.length} URLs`,
      });

      setUrls("");
    } catch (error) {
      console.error('URL submit error:', error);
      toast({
        title: "Failed to submit URLs",
        description: error instanceof Error ? error.message : "Failed to process URLs",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCloudConnect = async (provider: 'google' | 'microsoft') => {
    if (provider === 'google') {
      // Quarantined: the legacy parallel authorization path is disabled.
      toast({
        title: "Authorization unavailable",
        description:
          "Drive authorization must use the managed connector path, which is not enabled for this workspace yet.",
        variant: "destructive",
      });
      return;
    }

    const hasSecrets = await checkSecrets(provider);
    
    if (!hasSecrets) {
      toast({
        title: "Missing credentials",
        description: 'Please configure Microsoft OAuth credentials',
        variant: "destructive",
      });
      return;
    }

    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-oauth-microsoft`;
  };

  const handleDbConnect = async () => {
    const hasSecrets = await checkSecrets('aws');
    
    if (!hasSecrets) {
      toast({
        title: "Missing credentials",
        description: "Please configure AWS credentials for database connections",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Database connection",
      description: "Opening database connection wizard",
    });
  };

  return (
    <Tabs defaultValue="upload" className="w-full">
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
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Upload Document</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported: PDF, DOCX, TXT, MD
              </p>
            </div>

            <Button 
              onClick={handleFileUpload} 
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Upload & Index"}
            </Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="urls" className="space-y-4">
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="urls">URLs to Index</Label>
              <Textarea
                id="urls"
                placeholder="https://example.com/docs&#10;https://another.com/page"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={6}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                One URL per line
              </p>
            </div>

            <Button 
              onClick={handleUrlSubmit} 
              disabled={!urls.trim() || uploading}
              className="w-full"
            >
              {uploading ? "Processing..." : "Index URLs"}
            </Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="cloud" className="space-y-4">
        <Card className="p-6">
          {missingSecrets.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Missing OAuth credentials: {missingSecrets.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button 
              onClick={() => handleCloudConnect('google')}
              variant="outline"
              className="w-full justify-start"
            >
              <img 
                src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googledrive.svg" 
                className="h-5 w-5 mr-2"
                alt="Google Drive"
              />
              Connect Google Drive
            </Button>

            <Button 
              onClick={() => handleCloudConnect('microsoft')}
              variant="outline"
              className="w-full justify-start"
            >
              <img 
                src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftonedrive.svg" 
                className="h-5 w-5 mr-2"
                alt="OneDrive"
              />
              Connect OneDrive
            </Button>

            <Button 
              onClick={() => handleCloudConnect('microsoft')}
              variant="outline"
              className="w-full justify-start"
            >
              <img 
                src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftsharepoint.svg" 
                className="h-5 w-5 mr-2"
                alt="SharePoint"
              />
              Connect SharePoint
            </Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="databases" className="space-y-4">
        <Card className="p-6">
          {missingSecrets.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Missing AWS credentials: {missingSecrets.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleDbConnect}
              variant="outline"
              className="w-full justify-start"
            >
              <Database className="h-5 w-5 mr-2" />
              Connect PostgreSQL
            </Button>

            <Button 
              onClick={handleDbConnect}
              variant="outline"
              className="w-full justify-start"
            >
              <Database className="h-5 w-5 mr-2" />
              Connect MySQL
            </Button>

            <Button 
              onClick={handleDbConnect}
              variant="outline"
              className="w-full justify-start"
            >
              <Database className="h-5 w-5 mr-2" />
              Connect MongoDB
            </Button>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
