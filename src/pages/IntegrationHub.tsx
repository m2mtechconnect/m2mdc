import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationMarketplace } from "@/components/integrations/IntegrationMarketplace";
import { Integration } from "@/types/integrations";
import { ZapierConnectModal } from "@/components/integrations/ZapierConnectModal";
import { toast } from "sonner";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <div className="container max-w-[1400px] mx-auto py-8 px-4">
      <IntegrationMarketplace
        integrations={integrations}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onConfigure={handleConfigure}
        onViewDetails={handleViewDetails}
      />

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedIntegration?.icon}</span>
              {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium mb-2">Category</h4>
              <p className="text-sm text-muted-foreground">{selectedIntegration?.category}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Type</h4>
              <p className="text-sm text-muted-foreground capitalize">{selectedIntegration?.type}</p>
            </div>
            {selectedIntegration?.type === "zapier" && (
              <div>
                <h4 className="font-medium mb-2">Capabilities</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedIntegration.triggers} triggers • {selectedIntegration.actions} actions
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
