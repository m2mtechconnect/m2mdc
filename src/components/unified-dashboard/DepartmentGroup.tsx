import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { UnifiedItem, UnifiedItemCard } from './UnifiedItemCard';
import { useState } from 'react';

interface DepartmentGroupProps {
  department: string;
  items: UnifiedItem[];
  onRun: (item: UnifiedItem) => void;
  onManage: (item: UnifiedItem) => void;
  onDelete: (item: UnifiedItem) => void;
}

export function DepartmentGroup({ department, items, onRun, onManage, onDelete }: DepartmentGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const avgRoi = items.length > 0
    ? Math.round(items.reduce((sum, item) => sum + item.roi, 0) / items.length)
    : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg bg-muted/50 hover:bg-muted transition-smooth">
        <div className="flex items-center gap-3">
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
          <h3 className="text-lg font-semibold">{department}</h3>
          <Badge variant="secondary">{items.length} twins</Badge>
          <span className="text-sm text-muted-foreground">Avg ROI: {avgRoi}%</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <UnifiedItemCard
              key={item.id}
              item={item}
              onRun={onRun}
              onManage={onManage}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
