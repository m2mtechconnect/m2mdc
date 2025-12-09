import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Upload, Zap } from "lucide-react";

interface ZapTemplateListProps {
  appName: string;
  onSelect: (templateId: string) => void;
  onBack: () => void;
}

const templates = {
  triggers: [
    { id: "new-file", name: "New File Created", desc: "Trigger when a new file is added" },
    { id: "updated-file", name: "File Updated", desc: "Trigger when a file is modified" },
    { id: "new-row", name: "New Row in Sheet", desc: "Trigger when a new row is added" },
    { id: "new-ticket", name: "New Support Ticket", desc: "Trigger when a ticket is created" },
  ],
  actions: [
    { id: "create-record", name: "Create Record", desc: "Create a new record in the system" },
    { id: "send-message", name: "Send Message", desc: "Post a message to a channel" },
    { id: "update-status", name: "Update Status", desc: "Change the status of an item" },
    { id: "create-task", name: "Create Task", desc: "Add a new task or issue" },
  ],
};

export default function ZapTemplateList({ appName, onSelect, onBack }: ZapTemplateListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Configure {appName} Connection</h2>
          <p className="text-sm text-muted-foreground">Choose how you want to connect this app</p>
        </div>
      </div>

      {/* Triggers Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-5 w-5 text-primary" />
          <h3 className="font-bold">Triggers (Incoming Data)</h3>
          <Badge variant="outline" className="text-xs">Data flows into Studio</Badge>
        </div>
        <div className="space-y-2">
          {templates.triggers.map((template) => (
            <Card
              key={template.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-smooth group"
              onClick={() => onSelect(template.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold mb-1">{template.name}</div>
                  <div className="text-sm text-muted-foreground">{template.desc}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-smooth"
                >
                  Configure
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-5 w-5 text-secondary" />
          <h3 className="font-bold">Actions (Outgoing Data)</h3>
          <Badge variant="outline" className="text-xs">Studio triggers external app</Badge>
        </div>
        <div className="space-y-2">
          {templates.actions.map((template) => (
            <Card
              key={template.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-smooth group"
              onClick={() => onSelect(template.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold mb-1">{template.name}</div>
                  <div className="text-sm text-muted-foreground">{template.desc}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-smooth"
                >
                  Configure
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Help */}
      <div className="p-4 bg-muted/50 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <Zap className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <strong>Tip:</strong> Triggers bring data into M2M Studio for AI processing. Actions send results back to your apps.
          </div>
        </div>
      </div>
    </div>
  );
}
