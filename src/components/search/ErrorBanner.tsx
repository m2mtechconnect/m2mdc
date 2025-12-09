import { AlertCircle, ExternalLink, FileUp, Globe } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface ErrorBannerProps {
  error: string;
  stage?: string;
  requestId?: string;
  actions?: string[];
  suggestion?: string;
  details?: string;
  status?: string;
}

export function ErrorBanner({ error, stage, requestId, actions, suggestion, details, status }: ErrorBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStageMessage = (stage?: string) => {
    switch (stage) {
      case "preflight": return "URL validation failed";
      case "fetch": return "We couldn't read this page. Many bank/government sites block bots.";
      case "parse": return "Fetched the page but couldn't extract readable text.";
      case "summarize": return "AI service failed—check Gemini settings.";
      case "config": return "AI service not configured.";
      default: return error;
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case "preflight": return "text-yellow-600 dark:text-yellow-400";
      case "fetch": return "text-orange-600 dark:text-orange-400";
      case "parse": return "text-purple-600 dark:text-purple-400";
      case "summarize": return "text-blue-600 dark:text-blue-400";
      case "config": return "text-red-600 dark:text-red-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStageIcon = () => {
    switch (stage) {
      case "fetch": return <Globe className="h-5 w-5" />;
      case "config": return <AlertCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <Alert variant="destructive" className="my-4">
      <div className="flex items-start gap-3">
        {getStageIcon()}
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2 flex-wrap">
            {getStageMessage(stage)}
            {stage && (
              <span className={`text-xs font-mono ${getStageColor(stage)}`}>
                [{stage}]
              </span>
            )}
            {status && (
              <span className="text-xs font-mono bg-destructive/20 px-2 py-0.5 rounded">
                {status}
              </span>
            )}
          </AlertTitle>
          
          <AlertDescription className="mt-2 space-y-3">
            {suggestion && (
              <p className="text-sm">{suggestion}</p>
            )}
            
            {actions && actions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Try these actions:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {actions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open("https://en.wikipedia.org/wiki/Web_scraping", "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Try Wikipedia
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open("https://techcrunch.com", "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Try TechCrunch
              </Button>
            </div>

            {(requestId || details) && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs">
                    {showDetails ? "Hide" : "Show"} details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-muted rounded-md">
                  {requestId && (
                    <div className="text-xs font-mono mb-2">
                      Request ID: {requestId}
                    </div>
                  )}
                  {details && (
                    <div className="text-xs text-muted-foreground">
                      {details}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
