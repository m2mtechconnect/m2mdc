import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface MCPTool {
  name: string;
  description: string;
  schema: any;
}

interface MCPToolsPlaygroundProps {
  systemId: string;
  serverName: string;
  tool: MCPTool;
}

export function MCPToolsPlayground({ systemId, serverName, tool }: MCPToolsPlaygroundProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [args, setArgs] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Parse schema to get input fields
  const inputSchema = tool.schema?.inputSchema || tool.schema;
  const properties = inputSchema?.properties || {};
  const required = inputSchema?.required || [];

  const handleInputChange = (fieldName: string, value: any) => {
    setArgs(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleRunTool = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setExecutionTime(null);

    try {
      const data = await invokeEdgeFunction('mcp-test-tool', {
        system_id: systemId,
        server_name: serverName,
        tool_name: tool.name,
        args: args,
      });

      if (data.success) {
        setResponse(data.result);
        setExecutionTime(data.latency);
        toast({
          title: "Tool Executed Successfully",
          description: `Completed in ${data.latency}ms`,
        });
      } else {
        setError(data.error || "Tool execution failed");
        toast({
          title: "Execution Failed",
          description: data.error || "Tool execution failed",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      logger.error('Tool execution error', err, { component: 'MCPToolsPlayground', action: 'handleRunTool' });
      const errorMsg = err.message || "Failed to execute tool";
      setError(errorMsg);
      toast({
        title: "Execution Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (fieldName: string, fieldSchema: any) => {
    const isRequired = required.includes(fieldName);
    const fieldType = fieldSchema.type || "string";
    const description = fieldSchema.description;

    switch (fieldType) {
      case "boolean":
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName}>
              {fieldName} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <select
              id={fieldName}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={args[fieldName]?.toString() || "false"}
              onChange={(e) => handleInputChange(fieldName, e.target.value === "true")}
            >
              <option value="false">False</option>
              <option value="true">True</option>
            </select>
          </div>
        );

      case "number":
      case "integer":
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName}>
              {fieldName} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Input
              id={fieldName}
              type="number"
              placeholder={`Enter ${fieldName}`}
              value={args[fieldName] || ""}
              onChange={(e) => handleInputChange(fieldName, parseFloat(e.target.value) || 0)}
            />
          </div>
        );

      case "array":
      case "object":
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName}>
              {fieldName} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Textarea
              id={fieldName}
              placeholder={`Enter ${fieldName} as JSON`}
              value={typeof args[fieldName] === 'object' ? JSON.stringify(args[fieldName], null, 2) : args[fieldName] || ""}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleInputChange(fieldName, parsed);
                } catch {
                  handleInputChange(fieldName, e.target.value);
                }
              }}
              rows={4}
            />
          </div>
        );

      default:
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName}>
              {fieldName} {isRequired && <span className="text-destructive">*</span>}
            </Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Input
              id={fieldName}
              type="text"
              placeholder={`Enter ${fieldName}`}
              value={args[fieldName] || ""}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Tools</span>
          <span>›</span>
          <span>Playground</span>
        </div>
        <h2 className="text-2xl font-semibold mb-1">{tool.name}</h2>
        <p className="text-muted-foreground">{tool.description}</p>
        
        {Object.keys(properties).length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Args:</h3>
            <div className="space-y-1">
              {Object.entries(properties).map(([key, schema]) => {
                const schemaObj = schema as { type?: string };
                return (
                  <p key={key} className="text-sm text-muted-foreground">
                    {key}: {schemaObj.type || "string"}.
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Input Section */}
        <div className="border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Input</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {Object.keys(properties).length === 0 ? (
                <p className="text-sm text-muted-foreground">No input parameters required</p>
              ) : (
                Object.entries(properties).map(([fieldName, fieldSchema]) => {
                  const schema = fieldSchema as { 
                    type?: string; 
                    description?: string; 
                    enum?: string[] 
                  };
                  return renderInputField(fieldName, schema);
                })
              )}

              <Button
                onClick={handleRunTool}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Tool
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* Response Section */}
        <div className="flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Response</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {!response && !error ? (
                <div className="flex items-center justify-center h-full min-h-[200px] text-center">
                  <div>
                    <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No response yet. Run the tool to see results.</p>
                  </div>
                </div>
              ) : error ? (
                <Card className="p-4 border-destructive bg-destructive/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-destructive mb-1">Error</h4>
                      <p className="text-sm text-destructive/90">{error}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Success</span>
                    </div>
                    {executionTime && (
                      <Badge variant="outline">{executionTime}ms</Badge>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Result</h4>
                    <Card className="p-4 bg-muted">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {typeof response === 'string' 
                          ? response 
                          : JSON.stringify(response, null, 2)}
                      </pre>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
