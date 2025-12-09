/**
 * Day in the Life Narrative - Contextual Role Hints
 * Shows narrative context for different user roles
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface DayInLifeNarrativeProps {
  roles: any[];
  currentScenario?: any;
}

export function DayInLifeNarrative({ roles, currentScenario }: DayInLifeNarrativeProps) {
  if (roles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Day in the Life
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue={roles[0]?.role}>
          {roles.map((roleData, index) => (
            <AccordionItem key={index} value={roleData.role} className="border-b-0">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{roleData.role}</Badge>
                  {currentScenario && (
                    <span className="text-xs text-muted-foreground">
                      • {currentScenario.title}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="pl-4 border-l-2 border-primary/20">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {roleData.narrative}
                  </p>
                  {roleData.key_actions && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-2">Key Actions:</p>
                      <ul className="space-y-1">
                        {roleData.key_actions.map((action: string, idx: number) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
