import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ScanResult {
  url: string;
  title: string;
  description: string;
  textContent: string;
  links: Array<{ url: string; text: string }>;
  scannedAt: string;
  contentLength: number;
}

export function WebsiteScanner() {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("website-scan", {
        body: { url },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Success",
        description: "Website scanned successfully",
      });
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to scan website",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Website Scanner</h2>
        <p className="text-muted-foreground mb-6">
          Scan any website to extract content without AI analysis
        </p>

        <div className="flex gap-2 mb-6">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isScanning}
          />
          <Button onClick={handleScan} disabled={isScanning}>
            {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Scan
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Title</h3>
              <p className="text-sm">{result.title || "No title found"}</p>
            </div>

            {result.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm">{result.description}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Content Preview</h3>
              <div className="text-sm bg-muted p-4 rounded-lg max-h-[300px] overflow-auto">
                {result.textContent}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Content Length:</span>{" "}
                  <span className="font-medium">{result.contentLength.toLocaleString()} bytes</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Links Found:</span>{" "}
                  <span className="font-medium">{result.links.length}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Scanned At:</span>{" "}
                  <span className="font-medium">
                    {new Date(result.scannedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {result.links.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Links ({result.links.length})</h3>
                <div className="text-sm bg-muted p-4 rounded-lg max-h-[200px] overflow-auto">
                  <ul className="space-y-1">
                    {result.links.map((link, idx) => (
                      <li key={idx}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {link.text || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
