import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Rocket, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { trackDeployment } from '@/lib/analytics/analyticsService';

interface DeploymentProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  onDeploy: () => Promise<{ success: boolean; agentUrl?: string; message?: string }>;
}

type DeploymentState = 'review' | 'deploying' | 'success' | 'error';

export function DeploymentProgressModal({
  open,
  onOpenChange,
  agentName,
  onDeploy,
}: DeploymentProgressModalProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<DeploymentState>('review');
  const [message, setMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setState('review');
    setMessage(null);
    setResultUrl(null);
  }, [open]);

  const startDeployment = async () => {
    if (state === 'deploying') return;
    setState('deploying');
    setMessage(null);
    setResultUrl(null);

    try {
      const result = await onDeploy();
      if (!result.success) throw new Error(result.message || 'Deployment failed');

      setResultUrl(result.agentUrl ?? null);
      setMessage(result.message ?? 'AURA recorded a successful deployment result.');
      setState('success');
      trackDeployment('deployed', true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      setMessage(errorMessage);
      setState('error');
      trackDeployment('unknown', false, errorMessage);
    }
  };

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (state === 'deploying' && !nextOpen) return;
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-w-lg" aria-describedby="deployment-dialog-description">
        <DialogHeader className="text-left">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Review & Deploy</Badge>
            {state === 'success' && <Badge variant="outline" className="v2-surface-verified v2-text-verified">Completed</Badge>}
            {state === 'error' && <Badge variant="destructive">Failed</Badge>}
          </div>
          <DialogTitle>
            {state === 'review' && 'Review deployment'}
            {state === 'deploying' && 'Deployment in progress'}
            {state === 'success' && 'Deployment result'}
            {state === 'error' && 'Deployment could not complete'}
          </DialogTitle>
          <DialogDescription id="deployment-dialog-description">
            {state === 'review' && 'Confirm the current build before AURA starts the real deployment operation.'}
            {state === 'deploying' && 'AURA is waiting for the deployment service to return a result. No simulated progress is shown.'}
            {state === 'success' && 'The deployment service returned success. This result remains visible until you choose what to do next.'}
            {state === 'error' && 'The deployment service returned an error. Nothing is represented as deployed until the operation succeeds.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Build</dt>
                <dd className="max-w-[65%] truncate font-medium">{agentName}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Action</dt>
                <dd>Deploy current approved configuration</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Truth policy</dt>
                <dd className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Result-driven
                </dd>
              </div>
            </dl>
          </div>

          {state === 'deploying' && (
            <div className="flex items-start gap-3 rounded-lg border border-border p-4" role="status" aria-live="polite">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">Waiting for deployment result</p>
                <p className="mt-1 text-sm text-muted-foreground">This indicator reflects only that the real request is in flight.</p>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="rounded-lg border border-border bg-muted/20 p-4" role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Deployment completed</p>
                  <p className="mt-1 text-sm text-muted-foreground">{message}</p>
                  {resultUrl && <p className="mt-2 truncate font-mono text-xs text-muted-foreground">Result route: {resultUrl}</p>}
                </div>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4" role="alert">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-destructive">Deployment failed</p>
                  <p className="mt-1 text-sm text-destructive/90">{message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            {state === 'review' && (
              <>
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button onClick={() => void startDeployment()}>
                  <Rocket className="mr-2 h-4 w-4" aria-hidden />
                  Deploy
                </Button>
              </>
            )}

            {state === 'deploying' && <Button disabled>Deployment in progress…</Button>}

            {state === 'success' && (
              <>
                <Button variant="outline" onClick={close}>Close</Button>
                {resultUrl && <Button onClick={() => { close(); navigate(resultUrl); }}>Open result</Button>}
                {!resultUrl && <Button onClick={() => { close(); navigate('/dashboard'); }}>Go to dashboard</Button>}
              </>
            )}

            {state === 'error' && (
              <>
                <Button variant="outline" onClick={close}>Close</Button>
                <Button onClick={() => void startDeployment()}>Retry deployment</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
