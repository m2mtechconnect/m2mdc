import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ValidationResult } from "@/lib/builderValidation";

interface ValidationBannerProps {
  validation: ValidationResult;
  onFixClick?: (step: number) => void;
}

export function ValidationBanner({ validation, onFixClick }: ValidationBannerProps) {
  if (validation.valid) {
    return (
      <Alert className="border-success bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          All validation checks passed. You can proceed to the next step.
        </AlertDescription>
      </Alert>
    );
  }

  if (validation.errors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-destructive bg-destructive/10">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-semibold">Please fix the following issues:</p>
          <ul className="list-disc list-inside space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-sm">
                {error.message}
                {error.fixStep && onFixClick && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-2 text-destructive underline"
                    onClick={() => onFixClick(error.fixStep!)}
                  >
                    Fix
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}
