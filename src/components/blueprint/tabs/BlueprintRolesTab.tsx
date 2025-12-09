/**
 * Blueprint Roles Tab - Human roles and responsibilities
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Monitor,
  Activity,
  GitBranch
} from 'lucide-react';
import type { HumanRoleBlueprint } from '@/types/dataCentreBlueprint';

interface BlueprintRolesTabProps {
  roles: HumanRoleBlueprint[];
}

export function BlueprintRolesTab({ roles }: BlueprintRolesTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Human Roles ({roles.length} roles defined)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            These roles define the human operators, engineers, and stakeholders who interact with the Data Centre Digital Twin system.
          </p>
        </CardContent>
      </Card>

      {/* Role Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                {role.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Responsibilities */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Responsibilities
                </p>
                <ul className="space-y-1">
                  {role.responsibilities.map((resp, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Primary Dashboards */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Primary Dashboards
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.primaryDashboards.map((dashboard, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {dashboard}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Workflows Owned */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  Workflows Owned
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.workflowsOwned.map((wf, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {wf}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* KPIs Owned */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  KPIs Owned ({role.kpisOwned.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.kpisOwned.slice(0, 4).map((kpi, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-primary/10">
                      {kpi}
                    </Badge>
                  ))}
                  {role.kpisOwned.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{role.kpisOwned.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
