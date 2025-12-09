import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Link as LinkIcon } from "lucide-react";

export type ValidationResult = {
  valid: boolean;
  message: string;
  suggestion?: string;
  action?: () => void;
};

interface EnhancedValidationFeedbackProps {
  result: ValidationResult;
}

export function EnhancedValidationFeedback({ result }: EnhancedValidationFeedbackProps) {
  return (
    <Alert variant={result.valid ? "default" : "destructive"} className="animate-fade-in">
      <div className="flex items-start gap-3">
        {result.valid ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        )}
        
        <div className="flex-1">
          <AlertDescription className="font-medium mb-1">
            {result.message}
          </AlertDescription>
          
          {result.suggestion && (
            <p className="text-sm text-muted-foreground mb-2">{result.suggestion}</p>
          )}
          
          {result.action && (
            <Button
              variant="outline"
              size="sm"
              onClick={result.action}
              className="gap-2 mt-2"
            >
              <LinkIcon className="h-3 w-3" />
              Fix This
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

export function getValidationResult(
  nodeCount: number,
  hasActionNode: boolean,
  isConnected: boolean,
  onHighlightMissing?: () => void
): ValidationResult {
  if (nodeCount === 0) {
    return {
      valid: false,
      message: "Your workflow is empty",
      suggestion: "Start by dragging an Analyze node onto the canvas.",
    };
  }

  if (!hasActionNode) {
    return {
      valid: false,
      message: "⚠️ You need at least one action node",
      suggestion: "Add a Notify Teams or MCP Tool Call node to automate actions.",
      action: onHighlightMissing,
    };
  }

  if (!isConnected) {
    return {
      valid: false,
      message: "🧩 Connect nodes together to define execution flow",
      suggestion: "Drag from one node's output to another node's input to create connections.",
      action: onHighlightMissing,
    };
  }

  return {
    valid: true,
    message: "✅ Your workflow looks great! Ready to test.",
    suggestion: "Click 'Test Run' to simulate your workflow with sample data.",
  };
}