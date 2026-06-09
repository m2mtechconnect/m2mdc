import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationMarketplace } from "@/components/integrations/IntegrationMarketplace";
import { Integration } from "@/types/integrations";
import { ZapierConnectModal } from "@/components/integrations/ZapierConnectModal";
import { toast } from "sonner";
import { Server, Plug, Zap, CheckCircle2 } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DCCard } from "@/components/dc-ui/DCCard";
import { DCSectionHeader } from "@/components/dc-ui/DCSectionHeader";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

// Featured integrations catalog
const FEATURED_INTEGRATIONS: Omit<Integration, "id" | "status" | "connected">[] = [
  {
    name: "Slack",
    type: "zapier",
    description: "Team communication and collaboration platform",
    category: "Communication",
    icon: "💬",
    triggers: 12,
    actions: 6,
    config: {},
  },
  {
    name: "Gmail",
    type: "zapier",
    description: "Email service and communication",
    category: "Email",
    icon: "📧",
    triggers: 5,
    actions: 8,
    config: {},
  },
  {
    name: "HubSpot",
    type: "zapier",
    description: "CRM and marketing automation platform",
    category: "CRM",
    icon: "🎯",
    triggers: 14,
    actions: 16,
    config: {},
  },
  {
    name: "Salesforce",
    type: "zapier",
    description: "Cloud-based CRM platform",
    category: "CRM",
    icon: "☁️",
    triggers: 15,
    actions: 20,
    config: {},
  },
  {
    name: "Jira",
    type: "zapier",
    description: "Project tracking and issue management",
    category: "Project Management",
    icon: "📋",
    triggers: 9,
    actions: 11,
    config: {},
  },
  {
    name: "Zendesk",
    type: "zapier",
    description: "Customer support and service platform",
    category: "Support",
    icon: "🎫",
    triggers: 10,
    actions: 7,
    config: {},
  },
  {
    name: "Notion",
    type: "native",
    description: "All-in-one workspace for notes and docs",
    category: "Productivity & Docs",
    icon: "📝",
    config: {},
  },
  {
    name: "Linear",
    type: "native",
    description: "Issue tracking for software teams",
    category: "Project Management",
    icon: "📊",
    config: {},
  },
];

export default function IntegrationHub() {
  const { t } = useTranslation();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [zapierModalOpen, setZapierModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch connected integrations from database
  const { data: connections, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Merge featured integrations with connection status
  const integrations: Integration[] = FEATURED_INTEGRATIONS.map((featured, index) => {
    const connection = connections?.find(
      (c) => c.name.toLowerCase() === featured.name.toLowerCase()
    );

    const status = connection
      ? connection.status === "connected"
        ? "connected"
        : connection.status === "error"
        ? "error"
        : "available"
      : "available";

    return {
      ...featured,
      id: featured.name.toLowerCase().replace(/\s+/g, "_"),
      status,
      connected: status === "connected",
      connectionId: connection?.id,
      error_message: connection?.error_message,
    };
  });

  const connectedCount = integrations.filter(i => i.connected).length;
  const availableCount = integrations.filter(i => !i.connected).length;

  const handleConnect = async (integration: Integration) => {
    console.log("Connecting to:", integration.name);
    
    if (integration.type === "zapier") {
      setSelectedIntegration(integration);
      setZapierModalOpen(true);
    } else {
      toast.info(`${integration.name} integration coming soon!`);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!integration.connectionId) return;

    try {
      const { error } = await supabase
        .from("integrations")
        .delete()
        .eq("id", integration.connectionId);

      if (error) throw error;

      toast.success(`${integration.name} disconnected successfully`);
      refetch();
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect integration");
    }
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDetailsOpen(true);
  };

  const handleViewDetails = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[1400px] mx-auto py-8 px-4 space-y-6">
        {/* DC Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <Plug className="h-6 w-6 text-primary" />
              </div>
              {t('integrationHub.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('integrationHub.subtitle')}
            </p>
          </div>
        </div>

        {/* DC-Style Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DCKPITile
            label="Connected"
            value={connectedCount.toString()}
            sublabel="Active integrations"
            status="normal"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <DCKPITile
            label="Available"
            value={availableCount.toString()}
            sublabel="Ready to connect"
            status="info"
            icon={<Plug className="h-4 w-4" />}
          />
          <DCKPITile
            label="Zapier Apps"
            value="6,000+"
            sublabel="Ecosystem access"
            status="info"
            icon={<Zap className="h-4 w-4" />}
          />
          <DCKPITile
            label="System Status"
            value="Online"
            sublabel="All services operational"
            status="normal"
            icon={<Server className="h-4 w-4" />}
          />
        </div>

        {/* Marketplace wrapped in DC Card */}
        <DCCard status="info" className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border bg-muted">
            <DCSectionHeader 
              title="Integration Marketplace"
              subtitle="Connect enterprise tools and data sources"
              icon={<Plug className="h-5 w-5 text-primary" />}
            />
          </div>
          <div className="p-6 bg-background">
            <IntegrationMarketplace
              integrations={integrations}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onConfigure={handleConfigure}
              onViewDetails={handleViewDetails}
            />
          </div>
        </DCCard>

        {/* Zapier Connect Modal */}
        {selectedIntegration && (
          <ZapierConnectModal
            open={zapierModalOpen}
            onOpenChange={(open) => {
              setZapierModalOpen(open);
              if (!open) {
                setSelectedIntegration(null);
                refetch();
              }
            }}
            appName={selectedIntegration.name}
            appIcon={selectedIntegration.icon || "🔌"}
          />
        )}

        {/* Integration Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <span className="text-2xl">{selectedIntegration?.icon}</span>
                {selectedIntegration?.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedIntegration?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-medium mb-2 text-foreground">Category</h4>
                <p className="text-sm text-muted-foreground">{selectedIntegration?.category}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-foreground">Type</h4>
                <p className="text-sm text-muted-foreground capitalize">{selectedIntegration?.type}</p>
              </div>
              {selectedIntegration?.type === "zapier" && (
                <div>
                  <h4 className="font-medium mb-2 text-foreground">Capabilities</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedIntegration.triggers} triggers • {selectedIntegration.actions} actions
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
