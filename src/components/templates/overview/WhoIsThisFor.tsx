import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User } from 'lucide-react';

interface WhoIsThisForProps {
  targetUsers?: string[];
}

export function WhoIsThisFor({ targetUsers }: WhoIsThisForProps) {
  if (!targetUsers || targetUsers.length === 0) {
    return null;
  }
  
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Who Is This For?</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {targetUsers.map((role: string, idx: number) => (
          <Badge 
            key={idx} 
            variant="outline" 
            className="py-2 px-4 text-sm bg-card hover:bg-accent/50 transition-colors"
          >
            <User className="h-4 w-4 mr-2" />
            {role}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
