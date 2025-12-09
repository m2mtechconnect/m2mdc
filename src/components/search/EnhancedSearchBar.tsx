import { useState, FormEvent, useEffect, useRef } from "react";
import { Search, Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBanner } from "./ErrorBanner";
import { HealthCheckBadge } from "./HealthCheckBadge";

interface EnhancedSearchBarProps {
  onSearch: (query: string, intent: string, result: any) => void;
  placeholder?: string;
  className?: string;
  enableGlobalShortcut?: boolean;
}

export function EnhancedSearchBar({ 
  onSearch, 
  placeholder = "What process do you want to automate? Or paste a URL to analyze any website...",
  className,
  enableGlobalShortcut = false
}: EnhancedSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<{
    message: string;
    stage?: string;
    requestId?: string;
    actions?: string[];
    suggestion?: string;
    details?: string;
    status?: string;
  } | null>(null);

  // Global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    if (!enableGlobalShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableGlobalShortcut]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        
        const { data, error: ingestError } = await supabase.functions.invoke(
          'ingest-file',
          {
            body: {
              title: file.name,
              content,
              fileType: file.type
            }
          }
        );

        if (ingestError) throw ingestError;

        toast.success(`${file.name} processed and added to knowledge base`);
        
        // Trigger search with file content
        const result = {
          type: 'file',
          intent: 'knowledge',
          query: file.name,
          answer: data.summary || 'File processed successfully',
          sources: [{ title: file.name, source_type: 'document' }],
          latency_ms: 0,
          requestId: crypto.randomUUID()
        };
        
        onSearch(file.name, 'FILE', result);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to process file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Please enter a search query or URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      toast.info("Searching with Gemini...");

      // Use unified search endpoint
      const { data: result, error: searchError } = await supabase.functions.invoke(
        'search',
        { body: { input: query } }
      );

      if (searchError) {
        console.error('Search error:', searchError);
        try {
          const errorData = typeof searchError.message === 'string' ? 
            JSON.parse(searchError.message) : searchError;
          
          setError({
            message: errorData.error || "Failed to process search",
            stage: errorData.stage,
            requestId: errorData.requestId,
          });
        } catch {
          setError({
            message: searchError.message || "Failed to process search",
          });
        }
        return;
      }

      // Check if result contains an error
      if (result?.error) {
        setError({
          message: result.error,
          stage: result.stage,
          requestId: result.requestId,
        });
        return;
      }

      toast.success(`Completed in ${result.latency_ms}ms`);
      onSearch(query, result.intent, result);

    } catch (error) {
      console.error("Search error:", error);
      
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          setError({
            message: errorData.error || "Unexpected error",
            stage: errorData.stage,
            requestId: errorData.requestId,
            actions: errorData.actions,
            suggestion: errorData.suggestion,
            details: errorData.details,
            status: errorData.status,
          });
        } catch {
          toast.error(error.message || "Failed to process request");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <HealthCheckBadge />
      </div>

      <form onSubmit={handleSubmit} className={className}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 500))}
              placeholder={placeholder}
              className="pl-12 pr-12 h-14 text-body"
              disabled={isLoading || uploadingFile}
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadingFile}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
              title="Upload file"
            >
              <Upload className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <Button 
            type="submit" 
            className="glow-yellow h-14 min-w-[140px]"
            disabled={isLoading || uploadingFile}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : uploadingFile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-caption text-muted-foreground">
            {enableGlobalShortcut && "Press Ctrl+K to focus • "}Try:
          </span>
          {[
            "Summarize 2025 HIPAA updates",
            "Automate monthly reporting",
            "Show ROI for last quarter",
            "https://example.com"
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="px-3 py-1 text-caption rounded-full bg-muted hover:bg-muted/80 transition-smooth"
              disabled={isLoading || uploadingFile}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <ErrorBanner
          error={error.message}
          stage={error.stage}
          requestId={error.requestId}
          actions={error.actions}
          suggestion={error.suggestion}
          details={error.details}
          status={error.status}
        />
      )}
    </div>
  );
}
