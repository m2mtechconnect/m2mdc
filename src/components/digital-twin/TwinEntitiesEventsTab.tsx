import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Box, Zap } from "lucide-react";
import type { DigitalTwin } from "@/types/digitalTwin";

interface TwinEntitiesEventsTabProps {
  twin: DigitalTwin;
}

export function TwinEntitiesEventsTab({ twin }: TwinEntitiesEventsTabProps) {
  const entities = twin.config.entities || [];
  const events = twin.config.events || [];

  return (
    <div className="space-y-8">
      {/* Entities Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Box className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Entities</h3>
        </div>

        {entities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Entities Defined</h3>
              <p className="text-muted-foreground">
                This digital twin does not have any entities configured
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {entities.map((entity) => (
              <Card key={entity.id}>
                <CardHeader>
                  <CardTitle className="text-base">{entity.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{entity.type}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(entity.properties).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Properties</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(entity.properties).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell className="font-mono text-sm">{key}</TableCell>
                              <TableCell className="text-sm">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {entity.relationships && entity.relationships.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Relationships</h4>
                      <div className="space-y-2">
                        {entity.relationships.map((rel, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground">
                            → {rel.relationshipType} to {rel.targetEntityId}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Events Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Events</h3>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Events Defined</h3>
              <p className="text-muted-foreground">
                This digital twin does not have any events configured
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{event.name}</span>
                    <Badge variant="outline">{event.type}</Badge>
                  </CardTitle>
                  <CardDescription>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {event.id}
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}

                  {event.entityId && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Entity:</span>{" "}
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {event.entityId}
                      </code>
                    </div>
                  )}

                  {event.triggers && event.triggers.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Triggers:</span>
                      <div className="mt-1 space-y-1">
                        {event.triggers.map((trigger, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            → {trigger}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {event.payload && Object.keys(event.payload).length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Payload Schema:</span>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
