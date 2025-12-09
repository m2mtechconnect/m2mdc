import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DigitalTwin, DigitalTwinStatus, DigitalTwinConfig } from "@/types/digitalTwin";

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
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "draft":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "archived":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Digital Twins
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your digital twin blueprints and their execution runs
          </p>
        </div>
      </div>

      {/* Twins List */}
      {twins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Digital Twins Yet</h3>
            <p className="text-muted-foreground">
              Digital twins will appear here once they are created
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Digital Twins</CardTitle>
            <CardDescription>
              View and manage your digital twin configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {twins.map((twin) => (
                  <TableRow key={twin.id}>
                    <TableCell className="font-medium">{twin.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {twin.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(twin.status)}>
                        {twin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {twin.description || "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(twin.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/digital-twins/${twin.slug}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
