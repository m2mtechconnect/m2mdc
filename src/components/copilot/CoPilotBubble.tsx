import { Sparkles } from 'lucide-react';
import { useCoPilot } from '@/contexts/CoPilotContext';
import { cn } from '@/lib/utils';

interface CoPilotBubbleProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function CoPilotBubble({ className, position = 'bottom-right' }: CoPilotBubbleProps) {
  const { isOpen, setIsOpen } = useCoPilot();

  if (isOpen) return null;

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <button
      onClick={() => setIsOpen(true)}
      data-testid="assistant-entry"
      className={cn(
        'fixed h-14 w-14 rounded-full bg-gradient-to-r from-[#FFD700] to-[#3AB6FF] flex items-center justify-center shadow-2xl hover:scale-110 transition-smooth z-40 group',
        positionClasses[position],
        className
      )}
      aria-label="Open Co-Pilot Assistant"
    >
      <Sparkles className="h-6 w-6 text-background animate-pulse" />
      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-ping" />
    </button>
  );
}
