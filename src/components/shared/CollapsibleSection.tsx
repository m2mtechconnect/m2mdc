/**
 * Collapsible Section - Reusable collapsible card section
 */

import { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: ReactNode;
  headerExtra?: ReactNode;
  icon?: ReactNode;
}

export function CollapsibleSection({ 
  title, 
  badge, 
  defaultOpen = true, 
  children,
  headerExtra,
  icon
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CardHeader className="pb-3 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between text-left">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                {badge !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                )}
              </div>
              <span className="ml-2 flex items-center" aria-hidden="true">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            </CollapsibleTrigger>
            {headerExtra && <div className="shrink-0">{headerExtra}</div>}
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
