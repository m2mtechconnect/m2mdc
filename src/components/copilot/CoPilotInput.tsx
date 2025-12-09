import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useCoPilot } from '@/contexts/CoPilotContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CoPilotInputProps {
  placeholder?: string;
  className?: string;
}

export function CoPilotInput({ 
  placeholder = "Ask Co-Pilot for help...",
  className 
}: CoPilotInputProps) {
  const [input, setInput] = useState('');
  const { askCoPilot } = useCoPilot();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    askCoPilot(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative flex items-center gap-2">
        <Sparkles className="absolute left-3 h-4 w-4 text-primary animate-pulse" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-12 h-11"
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={!input.trim()}
          className="absolute right-1 h-9 w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
