import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Box } from "lucide-react";
import { toast } from "sonner";
import type { DigitalTwin, DigitalTwinStatus, DigitalTwinConfig } from "@/types/digitalTwin";
import { TwinOverviewTab } from "@/components/digital-twin/TwinOverviewTab";
import { TwinWorkflowTab } from "@/components/digital-twin/TwinWorkflowTab";
import { TwinEntitiesEventsTab } from "@/components/digital-twin/TwinEntitiesEventsTab";
import { TwinRunsTab } from "@/components/digital-twin/TwinRunsTab";
import { DCCard, DCSectionHeader } from "@/components/dc-ui";

export default function DigitalTwinDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [twin, setTwin] = useState<DigitalTwin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadTwin();
    }
  }, [slug]);

  async function loadTwin() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("digital_twins")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error("Digital twin not found");
        navigate("/");
        return;
      }

      // Map database snake_case to TypeScript camelCase
      const mappedTwin: DigitalTwin = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        status: data.status as DigitalTwinStatus,
        config: data.config as unknown as DigitalTwinConfig,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setTwin(mappedTwin);
    } catch (error) {
      console.error("Error loading digital twin:", error);
      toast.error("Failed to load digital twin");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  function getStatusVariant(status: string): "operational" | "warning" | "critical" | "neutral" {
    switch (status) {
      case "active":
        return "operational";
      case "draft":
        return "warning";
      case "archived":
        return "neutral";
      default:
        return "neutral";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!twin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <DCSectionHeader
            title={twin.name}
            subtitle={twin.slug}
            icon={<Box className="h-5 w-5 text-primary" />}
            action={
              <Badge variant={getStatusVariant(twin.status) === "operational" ? "default" : "secondary"}>
                {twin.status}
              </Badge>
            }
          />
        </div>
      </div>

      {/* Tabs */}
      <DCCard noPadding>
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-border/50 px-6">
            <TabsList className="bg-transparent border-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="entities-events">Entities & Events</TabsTrigger>
              <TabsTrigger value="runs">Runs</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6">
            <TwinOverviewTab twin={twin} />
          </TabsContent>

          <TabsContent value="workflow" className="p-6">
            <TwinWorkflowTab twin={twin} />
          </TabsContent>

          <TabsContent value="entities-events" className="p-6">
            <TwinEntitiesEventsTab twin={twin} />
          </TabsContent>

          <TabsContent value="runs" className="p-6">
            <TwinRunsTab twinId={twin.id} twinSlug={twin.slug} />
          </TabsContent>
        </Tabs>
      </DCCard>
    </div>
  );
}
