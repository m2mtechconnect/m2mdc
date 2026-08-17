import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  Calendar,
  Rocket,
  ArrowUpDown,
  Server,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { DCCard } from "@/components/dc-ui/DCCard";
import { PagePurpose } from "@/components/capability/PagePurpose";
import { DCSectionHeader } from "@/components/dc-ui/DCSectionHeader";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

interface Deployment {
  id: string;
  system_id: string;
  version: string;
  status: string;
  region: string;
  model: string | null;
  grounding: boolean | null;
  runtime_url: string | null;
  health: string | null;
  error_message: string | null;
  deployed_by: string | null;
  created_at: string;
  updated_at: string;
  agent_name?: string;
}

export default function DeploymentHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [filteredDeployments, setFilteredDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadDeploymentHistory();
  }, []);

  useEffect(() => {
    filterDeployments();
  }, [deployments, searchQuery, statusFilter, healthFilter, sortOrder]);

  const loadDeploymentHistory = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');

      // Fetch deployments
      const { data: deploymentsData, error: deploymentsError } = await supabase
        .from('deployments')
        .select('*')
        .eq('deployed_by', user.id)
        .order('created_at', { ascending: false });

      if (deploymentsError) throw deploymentsError;

      // Fetch agent names for each deployment
      const systemIds = deploymentsData?.map(d => d.system_id) || [];
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, name')
        .in('id', systemIds);

      if (agentsError) throw agentsError;

      // Create a map of system_id -> agent_name
      const agentNamesMap = new Map(agentsData?.map(a => [a.id, a.name]) || []);

      // Combine deployments with agent names
      const deploymentsWithNames = deploymentsData?.map(d => ({
        ...d,
        agent_name: agentNamesMap.get(d.system_id) || 'Unknown System',
      })) || [];

      setDeployments(deploymentsWithNames);
    } catch (error: any) {
      console.error('Error loading deployment history:', error);
      toast({
        title: "Failed to load deployment history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDeployments = () => {
    let filtered = [...deployments];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.agent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.version.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // Apply health filter
    if (healthFilter !== 'all') {
      filtered = filtered.filter(d => d.health === healthFilter);
    }

    // Apply sort order
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredDeployments(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getHealthBadge = (health: string | null) => {
    if (!health) return <Badge variant="outline">Unknown</Badge>;
    
    switch (health) {
      case 'OK':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'DEGRADED':
        return <Badge variant="secondary" className="bg-yellow-500">Degraded</Badge>;
      case 'DOWN':
        return <Badge variant="destructive">Down</Badge>;
      default:
        return <Badge variant="outline">{health}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Runtime Environments</h1>
          </div>
          <PagePurpose route="/deployments" />
          <p className="mt-1 text-muted-foreground text-sm">
            {t('deploy.completeAuditTrail', 'Complete audit trail of all system deployments')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <DCKPITile
            label="Total Deployments"
            value={deployments.length.toString()}
            sublabel="All time"
            status="info"
            icon={<Rocket className="h-4 w-4" />}
          />
          <DCKPITile
            label="Active"
            value={deployments.filter(d => d.status === 'active').length.toString()}
            sublabel="Running systems"
            status="normal"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <DCKPITile
            label="Failed"
            value={deployments.filter(d => d.status === 'failed').length.toString()}
            sublabel="Requires attention"
            status={deployments.filter(d => d.status === 'failed').length > 0 ? 'critical' : 'normal'}
            icon={<XCircle className="h-4 w-4" />}
          />
          <DCKPITile
            label="Pending"
            value={deployments.filter(d => d.status === 'pending').length.toString()}
            sublabel="In progress"
            status={deployments.filter(d => d.status === 'pending').length > 0 ? 'warning' : 'normal'}
            icon={<Clock className="h-4 w-4" />}
          />
        </div>

        {/* Filters */}
        <DCCard status="info" className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by system name, model, or version..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-full md:w-48">
              <AlertCircle className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              <SelectItem value="OK">Healthy</SelectItem>
              <SelectItem value="DEGRADED">Degraded</SelectItem>
              <SelectItem value="DOWN">Down</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="w-full md:w-auto"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </div>
        </DCCard>

        {/* Deployments Table */}
        <DCCard status="info" className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Deployed</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeployments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' || healthFilter !== 'all' 
                      ? 'No deployments match your filters' 
                      : 'No deployments yet. Deploy your first system to get started!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeployments.map((deployment) => (
                  <TableRow key={deployment.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{deployment.agent_name}</div>
                      {deployment.error_message && (
                        <div className="text-xs text-destructive mt-1">
                          Error: {deployment.error_message.substring(0, 50)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(deployment.status)}
                        <Badge variant={getStatusVariant(deployment.status)}>
                          {deployment.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getHealthBadge(deployment.health)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {deployment.model || 'N/A'}
                        {deployment.grounding && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Grounded
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {deployment.version}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {deployment.region}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{format(new Date(deployment.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(deployment.created_at), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(deployment.updated_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {deployment.runtime_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(deployment.runtime_url!, '_blank')}
                            title="Open Runtime URL"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/builder?id=${deployment.system_id}`)}
                        >
                          View System
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </DCCard>

        {/* Footer Summary */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Showing {filteredDeployments.length} of {deployments.length} deployments
        </div>
      </div>
    </div>
  );
}
