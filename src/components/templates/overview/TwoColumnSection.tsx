import { Card } from '@/components/ui/card';
import { FileText, Target } from 'lucide-react';

interface TwoColumnSectionProps {
  description?: string;
  problemStatement?: string;
}

export function TwoColumnSection({ description, problemStatement }: TwoColumnSectionProps) {
  if (!description && !problemStatement) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {description && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Description</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </Card>
      )}
      
      {problemStatement && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Problem Statement</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">{problemStatement}</p>
        </Card>
      )}
    </div>
  );
}
