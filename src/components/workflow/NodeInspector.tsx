import { useState } from "react";
import { WorkflowNode } from "./WorkflowEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Workflow, TestTube2, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface NodeInspectorProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onUpdate: (config: Record<string, any>) => void;
  connections?: { upstream: WorkflowNode[]; downstream: WorkflowNode[] };
}

export function NodeInspector({ node, onClose, onUpdate, connections }: NodeInspectorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState(node?.config || {});

  if (!node) return null;

  const handleSave = () => {
    onUpdate(config);
    toast({
      title: "Node updated",
      description: "Configuration saved successfully",
    });
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'analyze':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="model" className="text-sm font-medium">Model</Label>
              <Select
                value={config.model || 'google/gemini-3-pro-preview'}
                onValueChange={(value) => setConfig({ ...config, model: value })}
              >
                <SelectTrigger id="model" className="mt-2">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-3-pro-preview">Gemini 3.0 Pro Preview</SelectItem>
                  <SelectItem value="google/gemini-3.0-pro">Gemini 3.0 Pro</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prompt" className="text-sm font-medium">Prompt Template</Label>
              <Textarea
                id="prompt"
                value={config.promptTemplate || ''}
                onChange={(e) => setConfig({ ...config, promptTemplate: e.target.value })}
                placeholder="Analyze this document and extract key insights..."
                rows={4}
                className="mt-2 font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="grounding" className="text-sm font-medium">Enable RAG Grounding</Label>
                <Switch
                  id="grounding"
                  checked={config.groundingEnabled || false}
                  onCheckedChange={(checked) => setConfig({ ...config, groundingEnabled: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Use knowledge base for contextual responses</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="topK" className="text-sm font-medium">Top-K</Label>
                <Input
                  id="topK"
                  type="number"
                  value={config.topK || 20}
                  onChange={(e) => setConfig({ ...config, topK: parseInt(e.target.value) })}
                  min={1}
                  max={50}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="topN" className="text-sm font-medium">Top-N</Label>
                <Input
                  id="topN"
                  type="number"
                  value={config.topN || 5}
                  onChange={(e) => setConfig({ ...config, topN: parseInt(e.target.value) })}
                  min={1}
                  max={20}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="temperature" className="text-sm font-medium">
                Temperature: <span className="text-[#FFD700]">{config.temperature || 0.7}</span>
              </Label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || 0.7}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
          </div>
        );

      case 'classify':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="labels" className="text-sm font-medium">Classification Labels</Label>
              <Input
                id="labels"
                value={config.labels || ''}
                onChange={(e) => setConfig({ ...config, labels: e.target.value })}
                placeholder="urgent, normal, low"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
            </div>

            <div>
              <Label htmlFor="threshold" className="text-sm font-medium">Confidence Threshold</Label>
              <Input
                id="threshold"
                type="number"
                value={config.confidenceThreshold || 0.7}
                onChange={(e) => setConfig({ ...config, confidenceThreshold: parseFloat(e.target.value) })}
                min={0}
                max={1}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="multiLabel" className="text-sm font-medium">Allow Multiple Labels</Label>
              <Switch
                id="multiLabel"
                checked={config.multiLabel || false}
                onCheckedChange={(checked) => setConfig({ ...config, multiLabel: checked })}
              />
            </div>
          </div>
        );

      case 'mcp_tool':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="toolName" className="text-sm font-medium">MCP Tool Name</Label>
              <Select
                value={config.toolName || ''}
                onValueChange={(value) => setConfig({ ...config, toolName: value })}
              >
                <SelectTrigger id="toolName" className="mt-2">
                  <SelectValue placeholder="Select tool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail-send">Gmail: Send Email</SelectItem>
                  <SelectItem value="slack-post">Slack: Post Message</SelectItem>
                  <SelectItem value="github-create-issue">GitHub: Create Issue</SelectItem>
                  <SelectItem value="notion-create-page">Notion: Create Page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="toolParams" className="text-sm font-medium">Tool Parameters (JSON)</Label>
              <Textarea
                id="toolParams"
                value={config.parameters || '{}'}
                onChange={(e) => setConfig({ ...config, parameters: e.target.value })}
                placeholder='{"recipient": "{email}", "subject": "Alert"}'
                rows={4}
                className="mt-2 font-mono text-sm"
              />
            </div>
          </div>
        );

      case 'notify_teams':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel" className="text-sm font-medium">Team/Channel</Label>
              <Input
                id="channel"
                value={config.channel || ''}
                onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                placeholder="engineering-alerts"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-sm font-medium">Message Template</Label>
              <Textarea
                id="message"
                value={config.messageTemplate || ''}
                onChange={(e) => setConfig({ ...config, messageTemplate: e.target.value })}
                placeholder="🚨 Alert: {summary}\n\nClassification: {classification}\nPriority: {priority}"
                rows={4}
                className="mt-2 font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="mention" className="text-sm font-medium">@mention Users</Label>
              <Switch
                id="mention"
                checked={config.mentionUsers || false}
                onCheckedChange={(checked) => setConfig({ ...config, mentionUsers: checked })}
              />
            </div>
          </div>
        );

      case 'create_ticket_jira':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="project" className="text-sm font-medium">Project Key</Label>
              <Input
                id="project"
                value={config.projectKey || ''}
                onChange={(e) => setConfig({ ...config, projectKey: e.target.value })}
                placeholder="ENG"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="issueType" className="text-sm font-medium">Issue Type</Label>
              <Select
                value={config.issueType || 'Task'}
                onValueChange={(value) => setConfig({ ...config, issueType: value })}
              >
                <SelectTrigger id="issueType" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Story">Story</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="summary" className="text-sm font-medium">Summary Template</Label>
              <Input
                id="summary"
                value={config.summaryTemplate || ''}
                onChange={(e) => setConfig({ ...config, summaryTemplate: e.target.value })}
                placeholder="{classification}: {title}"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="priority" className="text-sm font-medium">Default Priority</Label>
              <Select
                value={config.priority || 'Medium'}
                onValueChange={(value) => setConfig({ ...config, priority: value })}
              >
                <SelectTrigger id="priority" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Highest">Highest</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Lowest">Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'write_salesforce':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="object" className="text-sm font-medium">Salesforce Object</Label>
              <Select
                value={config.objectType || 'Lead'}
                onValueChange={(value) => setConfig({ ...config, objectType: value })}
              >
                <SelectTrigger id="object" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Case">Case</SelectItem>
                  <SelectItem value="Contact">Contact</SelectItem>
                  <SelectItem value="Opportunity">Opportunity</SelectItem>
                  <SelectItem value="Account">Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="upsertKey" className="text-sm font-medium">Upsert Key Field</Label>
              <Input
                id="upsertKey"
                value={config.upsertKey || 'Email'}
                onChange={(e) => setConfig({ ...config, upsertKey: e.target.value })}
                placeholder="Email"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="fieldMapping" className="text-sm font-medium">Field Mapping (JSON)</Label>
              <Textarea
                id="fieldMapping"
                value={config.fieldMapping || '{}'}
                onChange={(e) => setConfig({ ...config, fieldMapping: e.target.value })}
                placeholder='{"FirstName": "{name}", "Email": "{email}"}'
                rows={4}
                className="mt-2 font-mono text-sm"
              />
            </div>
          </div>
        );

      case 'generate_report':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="format" className="text-sm font-medium">Report Format</Label>
              <Select
                value={config.format || 'PDF'}
                onValueChange={(value) => setConfig({ ...config, format: value })}
              >
                <SelectTrigger id="format" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="Markdown">Markdown</SelectItem>
                  <SelectItem value="DOCX">Word Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="template" className="text-sm font-medium">Report Template</Label>
              <Textarea
                id="template"
                value={config.template || ''}
                onChange={(e) => setConfig({ ...config, template: e.target.value })}
                placeholder="# Analysis Report\n\n## Summary\n{summary}\n\n## Details\n{details}"
                rows={6}
                className="mt-2 font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="citations" className="text-sm font-medium">Include Citations</Label>
              <Switch
                id="citations"
                checked={config.includeCitations || false}
                onCheckedChange={(checked) => setConfig({ ...config, includeCitations: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="metadata" className="text-sm font-medium">Include Metadata</Label>
              <Switch
                id="metadata"
                checked={config.includeMetadata || false}
                onCheckedChange={(checked) => setConfig({ ...config, includeMetadata: checked })}
              />
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground text-sm">No configuration available for this node type.</p>;
    }
  };

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      analyze: "Analyze",
      classify: "Classify",
      mcp_tool: "MCP Tool Call",
      notify_teams: "Notify Teams",
      create_ticket_jira: "Create Jira Ticket",
      write_salesforce: "Write Salesforce",
      generate_report: "Generate Report",
    };
    return labels[type] || type;
  };

  return (
    <div className="w-[400px] h-full bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#3AB6FF] flex items-center justify-center">
            <Settings className="h-5 w-5 text-black" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Node Inspector</h3>
            <p className="text-xs text-muted-foreground">{getNodeTypeLabel(node.type)}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Config
            </TabsTrigger>
            <TabsTrigger value="connections" className="text-xs">
              <Workflow className="h-3 w-3 mr-1" />
              Links
            </TabsTrigger>
            <TabsTrigger value="test" className="text-xs">
              <TestTube2 className="h-3 w-3 mr-1" />
              Test
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="config" className="p-4 mt-0">
            {renderConfigFields()}
          </TabsContent>

          <TabsContent value="connections" className="p-4 mt-0 space-y-4">
            <div>
              <Label className="text-sm font-medium">Upstream Nodes</Label>
              <div className="mt-2 space-y-2">
                {connections?.upstream && connections.upstream.length > 0 ? (
                  connections.upstream.map((upNode) => (
                    <Card key={upNode.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#3AB6FF]" />
                        <span className="text-sm">{getNodeTypeLabel(upNode.type)}</span>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No upstream connections</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Downstream Nodes</Label>
              <div className="mt-2 space-y-2">
                {connections?.downstream && connections.downstream.length > 0 ? (
                  connections.downstream.map((downNode) => (
                    <Card key={downNode.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#FFD700]" />
                        <span className="text-sm">{getNodeTypeLabel(downNode.type)}</span>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No downstream connections</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="test" className="p-4 mt-0 space-y-4">
            <div>
              <Label className="text-sm font-medium">Test Input (JSON)</Label>
              <Textarea
                placeholder='{"message": "Test input data"}'
                rows={4}
                className="mt-2 font-mono text-sm"
              />
            </div>
            <Button className="w-full" variant="outline">
              <TestTube2 className="h-4 w-4 mr-2" />
              Run Test
            </Button>
            <Card className="p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground">Test results will appear here</p>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button onClick={handleSave} className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
          Save Configuration
        </Button>
        <Button variant="outline" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}
