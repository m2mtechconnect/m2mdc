import { Sparkles } from "lucide-react";

interface EmptyCanvasPlaceholderProps {
  onLoadExample: () => void;
}

export function EmptyCanvasPlaceholder({ onLoadExample }: EmptyCanvasPlaceholderProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center pointer-events-auto max-w-md px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2 text-foreground">Build Your Workflow</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Drag nodes from the left palette to get started
        </p>
        
        <button
          onClick={onLoadExample}
          className="text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
        >
          Or load an example workflow
        </button>
      </div>
    </div>
  );
}
