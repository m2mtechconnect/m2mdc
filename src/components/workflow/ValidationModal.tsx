import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Info, Zap } from "lucide-react";

interface ValidationResult {
  isValid: boolean;
  nodesCount: number;
  edgesCount: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface ValidationModalProps {
  open: boolean;
  onClose: () => void;
  result: ValidationResult;
  onAutoFix?: () => void;
}

export function ValidationModal({ open, onClose, result, onAutoFix }: ValidationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.isValid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Validation Passed
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Validation Failed
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Workflow structure analysis results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-[#3AB6FF]">{result.nodesCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Nodes</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-[#FFD700]">{result.edgesCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Connections</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-500">{result.isValid ? '✓' : '✗'}</div>
              <div className="text-xs text-muted-foreground mt-1">Status</div>
            </Card>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold text-sm">Errors</h3>
                <Badge variant="destructive" className="ml-auto">{result.errors.length}</Badge>
              </div>
              <div className="space-y-2">
                {result.errors.map((error, idx) => (
                  <Card key={idx} className="p-3 border-destructive/50 bg-destructive/5">
                    <p className="text-sm text-destructive">{error}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Warnings</h3>
                <Badge variant="outline" className="ml-auto border-yellow-500/50 text-yellow-500">{result.warnings.length}</Badge>
              </div>
              <div className="space-y-2">
                {result.warnings.map((warning, idx) => (
                  <Card key={idx} className="p-3 border-yellow-500/30 bg-yellow-500/5">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{warning}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-[#3AB6FF]" />
                <h3 className="font-semibold text-sm">Suggestions</h3>
                <Badge variant="outline" className="ml-auto border-[#3AB6FF]/50 text-[#3AB6FF]">{result.suggestions.length}</Badge>
              </div>
              <div className="space-y-2">
                {result.suggestions.map((suggestion, idx) => (
                  <Card key={idx} className="p-3 border-[#3AB6FF]/30 bg-[#3AB6FF]/5">
                    <p className="text-sm">{suggestion}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {result.isValid && result.errors.length === 0 && result.warnings.length === 0 && (
            <Card className="p-6 bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold">All checks passed!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your workflow is properly configured and ready to deploy.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          {onAutoFix && result.warnings.length > 0 && (
            <Button onClick={onAutoFix} variant="outline" className="gap-2">
              <Zap className="h-4 w-4" />
              Auto-Fix Minor Issues
            </Button>
          )}
          <Button onClick={onClose} variant={result.isValid ? "default" : "outline"}>
            {result.isValid ? 'Continue' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
