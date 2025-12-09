import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  AlertTriangle, 
  RefreshCw, 
  Upload, 
  Globe, 
  MessageSquare,
  Shield,
  Clock,
  FileText
} from "lucide-react";

interface CaptureError {
  error: string;
  errorType?: "bot_protection" | "network_error" | "timeout" | "protocol_error" | "parse_error" | "empty_content" | "unknown";
  userMessage?: string;
  stage?: string;
  requestId?: string;
  statusCode?: number;
  cta?: {
    primary?: { label: string; action: string };
    secondary?: { label: string; action: string };
  };
}

interface CaptureErrorDisplayProps {
  error: CaptureError;
  onRetry?: () => void;
  onUploadFile?: () => void;
  onContactSupport?: () => void;
}

export function CaptureErrorDisplay({ 
  error, 
  onRetry, 
  onUploadFile,
  onContactSupport 
}: CaptureErrorDisplayProps) {
  
  const getErrorIcon = () => {
    switch (error.errorType) {
      case "bot_protection":
        return <Shield className="h-5 w-5" />;
      case "network_error":
        return <Globe className="h-5 w-5" />;
      case "timeout":
        return <Clock className="h-5 w-5" />;
      case "protocol_error":
      case "parse_error":
        return <FileText className="h-5 w-5" />;
      case "empty_content":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.errorType) {
      case "bot_protection":
        return "Access Blocked";
      case "network_error":
        return "Network Error";
      case "timeout":
        return "Request Timeout";
      case "protocol_error":
        return "JavaScript Required";
      case "parse_error":
        return "Parse Error";
      case "empty_content":
        return "No Content Found";
      default:
        return "Error";
    }
  };

  const getErrorVariant = (): "default" | "destructive" => {
    if (error.errorType === "timeout" || error.errorType === "network_error") {
      return "default";
    }
    return "destructive";
  };

  const handleAction = (action: string) => {
    switch (action) {
      case "retry":
      case "retry_stealth":
        onRetry?.();
        break;
      case "upload_file":
        onUploadFile?.();
        break;
      case "support":
        onContactSupport?.();
        break;
      case "new_url":
        // User can just enter a new URL in the search bar
        break;
    }
  };

  return (
    <Card className="section-padding mt-8 border-destructive/20">
      <Alert variant={getErrorVariant()}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getErrorIcon()}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <AlertTitle className="text-h5 mb-2">{getErrorTitle()}</AlertTitle>
              <AlertDescription className="text-body">
                {error.userMessage || error.error}
              </AlertDescription>
            </div>

            {/* Action Buttons */}
            {error.cta && (
              <div className="flex flex-wrap gap-3 pt-2">
                {error.cta.primary && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAction(error.cta.primary!.action)}
                    className="gap-2"
                  >
                    {error.cta.primary.action === "retry" || error.cta.primary.action === "retry_stealth" ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : error.cta.primary.action === "upload_file" ? (
                      <Upload className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    {error.cta.primary.label}
                  </Button>
                )}

                {error.cta.secondary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(error.cta.secondary!.action)}
                    className="gap-2"
                  >
                    {error.cta.secondary.action === "support" ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : error.cta.secondary.action === "upload_file" ? (
                      <Upload className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    {error.cta.secondary.label}
                  </Button>
                )}
              </div>
            )}

            {/* Technical Details */}
            {error.requestId && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-caption text-muted-foreground">
                  Request ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{error.requestId}</code>
                  {error.statusCode && ` • Status: ${error.statusCode}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </Alert>
    </Card>
  );
}
