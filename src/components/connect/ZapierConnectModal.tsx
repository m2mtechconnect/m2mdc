import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Zap, ArrowRight } from "lucide-react";
import ZapTemplateList from "./ZapTemplateList";
import { FieldMapper } from "@/components/integrations/FieldMapper";

interface ZapierConnectModalProps {
  onClose: () => void;
}

const popularApps = [
  { name: "Gmail", icon: "📧", category: "Email", triggers: 5, actions: 8 },
  { name: "Slack", icon: "💬", category: "Communication", triggers: 12, actions: 6 },
  { name: "Salesforce", icon: "☁️", category: "CRM", triggers: 15, actions: 20 },
  { name: "Google Sheets", icon: "📊", category: "Spreadsheet", triggers: 8, actions: 10 },
  { name: "Zendesk", icon: "🎫", category: "Support", triggers: 10, actions: 7 },
  { name: "Jira", icon: "📋", category: "Project Mgmt", triggers: 9, actions: 11 },
  { name: "HubSpot", icon: "🎯", category: "Marketing", triggers: 14, actions: 16 },
  { name: "Stripe", icon: "💳", category: "Payments", triggers: 6, actions: 4 },
];

export default function ZapierConnectModal({ onClose }: ZapierConnectModalProps) {
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [showFieldMapper, setShowFieldMapper] = useState(false);

  const filteredApps = popularApps.filter(app =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.category.toLowerCase().includes(search.toLowerCase())
  );

  if (showFieldMapper && selectedApp) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <FieldMapper appName={selectedApp} />
        </DialogContent>
      </Dialog>
    );
  }

  if (selectedApp) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <ZapTemplateList
            appName={selectedApp}
            onSelect={() => setShowFieldMapper(true)}
            onBack={() => setSelectedApp(null)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Zap className="h-6 w-6 text-primary" />
            Connect via Zapier
          </DialogTitle>
          <p className="text-muted-foreground">
            Choose an app to connect — 6,000+ integrations available
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps (Gmail, Slack, Salesforce...)"
              className="pl-10"
            />
          </div>

          {/* Popular Apps Grid */}
          <div>
            <h3 className="font-bold mb-3">Popular Apps</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredApps.map((app) => (
                <button
                  key={app.name}
                  onClick={() => setSelectedApp(app.name)}
                  className="p-4 border border-border rounded-lg hover:border-primary/50 transition-smooth text-left group bg-card"
                >
                  <div className="text-3xl mb-2">{app.icon}</div>
                  <div className="font-bold text-sm mb-1">{app.name}</div>
                  <Badge variant="outline" className="text-xs">{app.category}</Badge>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground group-hover:text-primary transition-smooth">
                    <span>{app.triggers} triggers</span>
                    <span>•</span>
                    <span>{app.actions} actions</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <strong>How it works:</strong> Select an app → Choose a trigger or action → Map fields → Test → Done.
            Your Zap will run automatically in the background.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
