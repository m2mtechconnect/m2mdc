import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WorkflowNode } from "./WorkflowEditor";

interface NodeConfigDrawerProps {
  node: WorkflowNode;
  onClose: () => void;
  onUpdate: (config: Record<string, any>) => void;
}

export function NodeConfigDrawer({ node, onClose, onUpdate }: NodeConfigDrawerProps) {
  const [config, setConfig] = useState(node.config);

  const handleSave = () => {
    onUpdate(config);
    onClose();
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'analyze':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="model">Model</Label>
              <Select
                value={config.model || 'google/gemini-2.5-pro'}
                onValueChange={(value) => setConfig({ ...config, model: value })}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prompt">Prompt Template</Label>
              <Textarea
                id="prompt"
                value={config.promptTemplate || ''}
                onChange={(e) => setConfig({ ...config, promptTemplate: e.target.value })}
                placeholder="Analyze this document..."
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="grounding">Enable Grounding</Label>
              <Switch
                id="grounding"
                checked={config.groundingEnabled || false}
                onCheckedChange={(checked) => setConfig({ ...config, groundingEnabled: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="topK">Top-K</Label>
                <Input
                  id="topK"
                  type="number"
                  value={config.topK || 20}
                  onChange={(e) => setConfig({ ...config, topK: parseInt(e.target.value) })}
                  min={1}
                  max={50}
                />
              </div>
              <div>
                <Label htmlFor="topN">Top-N</Label>
                <Input
                  id="topN"
                  type="number"
                  value={config.topN || 5}
                  onChange={(e) => setConfig({ ...config, topN: parseInt(e.target.value) })}
                  min={1}
                  max={20}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="temperature">Temperature: {config.temperature || 0.7}</Label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || 0.7}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        );

      case 'classify':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="labels">Classification Labels (comma-separated)</Label>
              <Input
                id="labels"
                value={config.labels || ''}
                onChange={(e) => setConfig({ ...config, labels: e.target.value })}
                placeholder="urgent, normal, low"
              />
            </div>

            <div>
              <Label htmlFor="threshold">Confidence Threshold</Label>
              <Input
                id="threshold"
                type="number"
                value={config.confidenceThreshold || 0.7}
                onChange={(e) => setConfig({ ...config, confidenceThreshold: parseFloat(e.target.value) })}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </div>
        );

      case 'notify_teams':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel">Team/Channel</Label>
              <Input
                id="channel"
                value={config.channel || ''}
                onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                placeholder="engineering-alerts"
              />
            </div>

            <div>
              <Label htmlFor="message">Message Template</Label>
              <Textarea
                id="message"
                value={config.messageTemplate || ''}
                onChange={(e) => setConfig({ ...config, messageTemplate: e.target.value })}
                placeholder="Alert: {summary}"
                rows={3}
              />
            </div>
          </div>
        );

      case 'create_ticket_jira':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="project">Project Key</Label>
              <Input
                id="project"
                value={config.projectKey || ''}
                onChange={(e) => setConfig({ ...config, projectKey: e.target.value })}
                placeholder="ENG"
              />
            </div>

            <div>
              <Label htmlFor="issueType">Issue Type</Label>
              <Select
                value={config.issueType || 'Task'}
                onValueChange={(value) => setConfig({ ...config, issueType: value })}
              >
                <SelectTrigger id="issueType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="summary">Summary Template</Label>
              <Input
                id="summary"
                value={config.summaryTemplate || ''}
                onChange={(e) => setConfig({ ...config, summaryTemplate: e.target.value })}
                placeholder="{classification}: {title}"
              />
            </div>
          </div>
        );

      case 'write_salesforce':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="object">Salesforce Object</Label>
              <Select
                value={config.objectType || 'Lead'}
                onValueChange={(value) => setConfig({ ...config, objectType: value })}
              >
                <SelectTrigger id="object">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Case">Case</SelectItem>
                  <SelectItem value="Contact">Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="upsertKey">Upsert Key Field</Label>
              <Input
                id="upsertKey"
                value={config.upsertKey || 'Email'}
                onChange={(e) => setConfig({ ...config, upsertKey: e.target.value })}
                placeholder="Email"
              />
            </div>
          </div>
        );

      case 'generate_report':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="format">Report Format</Label>
              <Select
                value={config.format || 'PDF'}
                onValueChange={(value) => setConfig({ ...config, format: value })}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="Markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="citations">Include Citations</Label>
              <Switch
                id="citations"
                checked={config.includeCitations || false}
                onCheckedChange={(checked) => setConfig({ ...config, includeCitations: checked })}
              />
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">No configuration available</p>;
    }
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Configure {node.type} Node</SheetTitle>
          <SheetDescription>
            Update node settings and parameters
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {renderConfigFields()}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Configuration
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
