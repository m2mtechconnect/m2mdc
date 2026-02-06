import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Box, Zap, Network } from "lucide-react";
import type { DigitalTwin } from "@/types/digitalTwin";

interface TwinOverviewTabProps {
  twin: DigitalTwin;
}

export function TwinOverviewTab({ twin }: TwinOverviewTabProps) {
  const config = twin.config;
  const entityCount = config.entities?.length || 0;
  const eventCount = config.events?.length || 0;
  const nodeCount = config.workflow?.nodes?.length || 0;

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {config.goal || "No goal defined"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Process Twin</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {twin.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{twin.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Box className="h-4 w-4 text-blue-500" />
              Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{entityCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{eventCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4 text-info" />
              Workflow Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nodeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created:</span>
            <span>{new Date(twin.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated:</span>
            <span>{new Date(twin.updatedAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version:</span>
            <span>{config.version || "1.0.0"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
