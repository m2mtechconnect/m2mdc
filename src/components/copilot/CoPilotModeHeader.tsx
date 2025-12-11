/**
 * Co-Pilot Mode Header
 * 
 * Displays context-aware badge and "Ask Co-Pilot" button in Blueprint/Simulation headers.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles } from 'lucide-react';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import type { CoPilotContextMode } from '@/types/copilotContext';
import { cn } from '@/lib/utils';

interface CoPilotModeHeaderProps {
  mode: CoPilotContextMode;
  className?: string;
}

export function CoPilotModeHeader({ mode, className }: CoPilotModeHeaderProps) {
  const { setIsOpen } = useCoPilotContext();

  const isDesigner = mode === 'blueprint-designer';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge 
        variant="outline" 
        className={cn(
          'text-xs',
          isDesigner ? 'border-primary/50 text-primary' : 'border-warning/50 text-warning'
        )}
      >
        <Brain className="h-3 w-3 mr-1" />
        {isDesigner ? 'Design Assistant' : 'Run Analyst'}
      </Badge>
      
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-3 w-3" />
        Ask Co-Pilot
      </Button>
    </div>
  );
}

/**
 * Simplified button for embedding in tab headers
 */
interface AskCoPilotButtonProps {
  question?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function AskCoPilotButton({ 
  question, 
  label = 'Ask Co-Pilot',
  className,
  variant = 'outline',
  size = 'sm',
}: AskCoPilotButtonProps) {
  const { setIsOpen, openWithQuestion } = useCoPilotContext();

  const handleClick = () => {
    if (question) {
      openWithQuestion(question);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('gap-1', className)}
      onClick={handleClick}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </Button>
  );
}
