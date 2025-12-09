/**
 * Animated Deploy Button - Morphing Button with Success Animation
 * States: Idle → Spinner → Success → Redirect
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface AnimatedDeployButtonProps {
  onDeploy: () => void;
  isDeploying: boolean;
  agentName: string;
  className?: string;
}

type ButtonState = 'idle' | 'deploying' | 'success';

export function AnimatedDeployButton({
  onDeploy,
  isDeploying,
  agentName,
  className
}: AnimatedDeployButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const navigate = useNavigate();

  // Sync with external deploying state
  useEffect(() => {
    if (isDeploying && state === 'idle') {
      setState('deploying');
    }
  }, [isDeploying, state]);

  // Handle success state after deployment
  useEffect(() => {
    if (!isDeploying && state === 'deploying') {
      setState('success');
      
      // Auto-redirect after 2 seconds
      const timeout = setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isDeploying, state, navigate]);

  const handleClick = () => {
    if (state === 'idle') {
      setState('deploying');
      onDeploy();
    }
  };

  if (state === 'success') {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-center gap-3 p-6 bg-green-50 dark:bg-green-950/20 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="h-8 w-8 text-green-600 animate-scale-in" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-100">
              {agentName} is now deployed!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
        <Button
          size="lg"
          onClick={() => navigate('/dashboard')}
          className="w-full gap-2"
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="lg"
      onClick={handleClick}
      disabled={state === 'deploying'}
      className={cn(
        "w-full gap-2 transition-all duration-300",
        state === 'deploying' && "min-w-[140px]",
        className
      )}
    >
      {state === 'deploying' ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Deploying...
        </>
      ) : (
        <>
          <Rocket className="h-5 w-5" />
          Deploy to Production
        </>
      )}
    </Button>
  );
}
