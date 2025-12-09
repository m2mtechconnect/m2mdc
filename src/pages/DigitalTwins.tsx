import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Eye, Loader2, Server, Cpu, Zap } from "lucide-react";
import { toast } from "sonner";
import type { DigitalTwin, DigitalTwinStatus, DigitalTwinConfig } from "@/types/digitalTwin";
import { DCCard } from "@/components/dc-ui/DCCard";
import { DCSectionHeader } from "@/components/dc-ui/DCSectionHeader";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

export default function DigitalTwins() {
  const navigate = useNavigate();
  const [twins, setTwins] = useState<DigitalTwin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTwins();
  }, []);

  async function loadTwins() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("digital_twins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map database snake_case to TypeScript camelCase
      const mappedTwins: DigitalTwin[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        status: row.status as DigitalTwinStatus,
        config: row.config as unknown as DigitalTwinConfig,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      
      setTwins(mappedTwins);
    } catch (error) {
      console.error("Error loading digital twins:", error);
      toast.error("Failed to load digital twins");
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "active":
        return "bg-dc-green/20 text-dc-green border-dc-green/30";
      case "draft":
        return "bg-dc-amber/20 text-dc-amber border-dc-amber/30";
      case "archived":
        return "bg-muted text-muted-foreground border-dc-border";
      default:
        return "bg-muted text-muted-foreground border-dc-border";
    }
  }

  const activeCount = twins.filter(t => t.status === 'active').length;
  const draftCount = twins.filter(t => t.status === 'draft').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-dc-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-dc-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dc-bg-primary">
      <div className="container mx-auto py-8 space-y-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-lg bg-dc-cyan/10 border border-dc-cyan/30">
                <Server className="h-6 w-6 text-dc-cyan" />
              </div>
              Digital Twin Registry
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Manage and monitor your digital twin blueprints and their execution runs
            </p>
          </div>
        </div>

        {/* DC Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DCKPITile
            label="Total Twins"
            value={twins.length.toString()}
            sublabel="Registered systems"
            status="info"
            icon={<Server className="h-4 w-4" />}
          />
          <DCKPITile
            label="Active"
            value={activeCount.toString()}
            sublabel="Running twins"
            status="normal"
            icon={<Activity className="h-4 w-4" />}
          />
          <DCKPITile
            label="Draft"
            value={draftCount.toString()}
            sublabel="In development"
            status={draftCount > 0 ? "warning" : "info"}
            icon={<Cpu className="h-4 w-4" />}
          />
          <DCKPITile
            label="System Status"
            value="Online"
            sublabel="All twins operational"
            status="normal"
            icon={<Zap className="h-4 w-4" />}
          />
        </div>

        {/* Twins List */}
        {twins.length === 0 ? (
          <DCCard status="info" className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">No Digital Twins Yet</h3>
            <p className="text-muted-foreground">
              Digital twins will appear here once they are created
            </p>
          </DCCard>
        ) : (
          <DCCard status="info" className="p-0 overflow-hidden">
            <div className="p-4 border-b border-dc-border bg-dc-bg-secondary">
              <DCSectionHeader
                title="All Digital Twins"
                subtitle="View and manage your digital twin configurations"
                icon={<Server className="h-5 w-5 text-dc-cyan" />}
              />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-dc-border hover:bg-dc-bg-secondary">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Slug</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Description</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {twins.map((twin) => (
                    <TableRow key={twin.id} className="border-dc-border hover:bg-dc-bg-secondary">
                      <TableCell className="font-medium text-foreground">{twin.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-dc-bg-secondary px-2 py-1 rounded border border-dc-border text-dc-cyan">
                          {twin.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(twin.status)}>
                          {twin.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {twin.description || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(twin.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/digital-twins/${twin.slug}`)}
                          className="border-dc-border hover:bg-dc-bg-secondary hover:text-dc-cyan"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DCCard>
        )}
      </div>
    </div>
  );
}
