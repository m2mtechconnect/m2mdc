import { useState, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useSearchParams } from "react-router-dom";
import { SectionHeader } from "@/components/ui/section-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Mail, Database, Activity, TrendingUp, CheckCircle2, AlertTriangle, ShieldAlert, Plug, Server, Zap } from "lucide-react";
import { IntegrationCard, IntegrationState, IntegrationCTA } from "@/components/integrations/IntegrationCard";
import { ZapierConnectModal } from "@/components/integrations/ZapierConnectModal";
import { IntegrationDrawer } from "@/components/integrations/IntegrationDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { DCCard } from "@/components/dc-ui/DCCard";
import { DCSectionHeader } from "@/components/dc-ui/DCSectionHeader";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

type CategoryKey = "all" | "ai_llm" | "rag" | "storage" | "knowledge" | "web" | "crm" | "erp" | "pm" | "comms" | "itsm" | "cloud" | "marketing" | "support" | "analytics";
type StatusFilter = "all" | "connected" | "not_connected" | "errors";

interface Integration {
  id: string;
  logoUrl: string;
  name: string;
  category: string;
  description: string;
  state: IntegrationState;
  ctaType: IntegrationCTA;
  lastRun?: string;
  region?: string;
  hasError?: boolean;
  errorCount?: number;
  connectMethod: "oauth" | "apikey" | "zapier";
  type?: "gemini" | "vertex" | "openai" | "anthropic" | "deepseek" | "mistral" | "cohere" | "huggingface";
  integrationType?: "native" | "zapier" | "oauth";
  zapierAppKey?: string;
}

const integrations: Integration[] = [
  // AI/LLM Engines
  {
    id: "gemini",
    logoUrl: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
    name: "Google Gemini",
    category: "AI/LLM",
    description: "Gemini 2.0 Pro/Flash for grounded generation & RAG pipelines",
    state: "connected",
    ctaType: "configure",
    lastRun: "2m ago",
    region: "northamerica-northeast1",
    connectMethod: "oauth",
    type: "gemini",
    integrationType: "native",
  },
  // ... keep existing code (all other integrations)
  {
    id: "vertex",
    logoUrl: "https://www.gstatic.com/pantheon/images/aiplatform/vertexai_icon.svg",
    name: "Vertex AI Search",
    category: "RAG",
    description: "Vector search, grounding & retrieval with enterprise-grade RAG",
    state: "connected",
    ctaType: "configure",
    lastRun: "5m ago",
    region: "northamerica-northeast1",
    connectMethod: "oauth",
    type: "vertex",
    integrationType: "native",
  },
  {
    id: "openai",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/openai.svg",
    name: "OpenAI",
    category: "AI/LLM",
    description: "GPT-4o and o1 models for advanced reasoning and generation",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    type: "openai",
    integrationType: "native",
  },
  {
    id: "anthropic",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/anthropic.svg",
    name: "Anthropic",
    category: "AI/LLM",
    description: "Claude 3.5 Sonnet for long-context understanding and reasoning",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    type: "anthropic",
    integrationType: "native",
  },
  {
    id: "deepseek",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/deepseek.svg",
    name: "DeepSeek",
    category: "AI/LLM",
    description: "DeepSeek V3 for code generation and technical reasoning",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    type: "deepseek",
    integrationType: "native",
  },
  {
    id: "mistral",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/mistral.svg",
    name: "Mistral AI",
    category: "AI/LLM",
    description: "Mistral Large for multilingual and specialized tasks",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    type: "mistral",
    integrationType: "native",
  },
  {
    id: "cohere",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/cohere.svg",
    name: "Cohere",
    category: "AI/LLM",
    description: "Command R+ for enterprise RAG and semantic search",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    type: "cohere",
    integrationType: "native",
  },
  {
    id: "huggingface",
    logoUrl: "https://huggingface.co/front/assets/huggingface_logo.svg",
    name: "Hugging Face",
    category: "AI/LLM",
    description: "Access 400k+ open-source models for custom AI workflows",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    type: "huggingface",
    integrationType: "native",
  },
  // Storage & Knowledge Sources
  {
    id: "drive",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googledrive.svg",
    name: "Google Drive",
    category: "Storage",
    description: "Cloud document storage and collaboration",
    state: "connected",
    ctaType: "configure",
    lastRun: "5m ago",
    connectMethod: "oauth",
    integrationType: "native",
  },
  {
    id: "sharepoint",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftsharepoint.svg",
    name: "SharePoint",
    category: "Storage",
    description: "Enterprise content management and team sites",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "oauth",
    integrationType: "native",
  },
  {
    id: "onedrive",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftonedrive.svg",
    name: "OneDrive",
    category: "Storage",
    description: "Personal and business file storage",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "oauth",
    integrationType: "native",
  },
  {
    id: "confluence",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/confluence.svg",
    name: "Confluence",
    category: "Knowledge",
    description: "Team knowledge base and documentation hub",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "oauth",
    integrationType: "native",
  },
  {
    id: "website",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googlechrome.svg",
    name: "Website Crawler",
    category: "Web",
    description: "Crawl and index web content for search",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    integrationType: "native",
  },
  {
    id: "s3",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazons3.svg",
    name: "AWS S3",
    category: "Storage",
    description: "Object storage for any data type at scale",
    state: "not-connected",
    ctaType: "configure",
    connectMethod: "apikey",
    integrationType: "native",
  },
  // Business Systems
  {
    id: "salesforce",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/salesforce.svg",
    name: "Salesforce",
    category: "CRM",
    description: "Customer relationship management platform",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "salesforce",
  },
  {
    id: "sap",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/sap.svg",
    name: "SAP",
    category: "ERP",
    description: "Enterprise resource planning system",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "sap",
  },
  {
    id: "jira",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/jira.svg",
    name: "Jira",
    category: "Project Management",
    description: "Issues tracking and agile sprint management",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "jira",
  },
  {
    id: "servicenow",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/servicenow.svg",
    name: "ServiceNow",
    category: "ITSM",
    description: "IT service management workflows",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "servicenow",
  },
  // Communication
  {
    id: "teams",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftteams.svg",
    name: "Microsoft Teams",
    category: "Communication",
    description: "Team collaboration and video conferencing",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "teams",
  },
  {
    id: "slack",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/slack.svg",
    name: "Slack",
    category: "Communication",
    description: "Business messaging and team collaboration",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "slack",
  },
  // Cloud Infrastructure
  {
    id: "aws",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazonaws.svg",
    name: "AWS",
    category: "Cloud",
    description: "Amazon Web Services cloud infrastructure",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "aws",
  },
  {
    id: "azure",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftazure.svg",
    name: "Azure",
    category: "Cloud",
    description: "Microsoft cloud computing platform",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "azure",
  },
  {
    id: "gcp",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googlecloud.svg",
    name: "Google Cloud",
    category: "Cloud",
    description: "GCP cloud services and infrastructure",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "gcp",
  },
  // Marketing & Analytics
  {
    id: "hubspot",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/hubspot.svg",
    name: "HubSpot",
    category: "Marketing",
    description: "Marketing automation and CRM platform",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "hubspot",
  },
  {
    id: "zendesk",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/zendesk.svg",
    name: "Zendesk",
    category: "Support",
    description: "Customer support ticketing and knowledge base",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "zendesk",
  },
  {
    id: "tableau",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/tableau.svg",
    name: "Tableau",
    category: "Analytics",
    description: "Business intelligence and data visualization",
    state: "not-connected",
    ctaType: "zapier",
    connectMethod: "zapier",
    integrationType: "zapier",
    zapierAppKey: "tableau",
  },
];

// Category mapping
const categoryMap: Record<string, CategoryKey> = {
  "All": "all",
  "AI/LLM": "ai_llm",
  "RAG": "rag",
  "Storage": "storage",
  "Knowledge": "knowledge",
  "Web": "web",
  "CRM": "crm",
  "ERP": "erp",
  "Project Management": "pm",
  "Communication": "comms",
  "ITSM": "itsm",
  "Cloud": "cloud",
  "Marketing": "marketing",
  "Support": "support",
  "Analytics": "analytics",
};

const categories = Object.keys(categoryMap);

interface IntegrationsProps {
  embedded?: boolean; // Hide header and search when embedded in Marketplace or Builder
  externalSearchQuery?: string; // Use external search query from Marketplace
}

export default function Integrations({ 
  embedded = false, 
  externalSearchQuery = ""
}: IntegrationsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("cat") || "All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all"
  );
  const debouncedSearch = useDebounce(searchQuery, 150);
  const [selectedApp, setSelectedApp] = useState<Integration | null>(null);
  const [showZapierModal, setShowZapierModal] = useState(false);
  const [showNativeDrawer, setShowNativeDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isExecutive, setIsExecutive] = useState(false);
  const [dbIntegrations, setDbIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState({
    activeConnections: 0,
    documentsSynced: 12400,
    syncSuccessRate: 98.2,
    lastSync: "checking..."
  });
  const { toast } = useToast();

  // Check if user is executive on mount
  useEffect(() => {
    checkExecutiveRole();
  }, []);

  // Fetch integrations from database
  useEffect(() => {
    if (isExecutive) {
      fetchIntegrations();
    }
  }, [isExecutive]);

  const checkExecutiveRole = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Auth error:', userError);
        toast({
          title: "Authentication required",
          description: "Please sign in to access integrations",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: hasRole, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'executive' });

      if (error) {
        console.error('Role check error:', error);
      }

      setIsExecutive(hasRole || false);
      setLoading(false);

      if (!hasRole) {
        toast({
          title: "Access denied",
          description: "Executive role required to manage integrations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      setLoading(false);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('integrations-list');

      if (error) throw error;

      if (data?.integrations) {
        // Merge DB integrations with catalog
        const mergedIntegrations = integrations.map(catalogItem => {
          const dbItem = data.integrations?.find((db: any) => db.provider === catalogItem.id);
          if (dbItem) {
            return {
              ...catalogItem,
              state: dbItem.state as IntegrationState,
              lastRun: dbItem.last_sync ? new Date(dbItem.last_sync).toLocaleString() : undefined,
              hasError: dbItem.state === 'error',
            };
          }
          return catalogItem;
        });
        setDbIntegrations(mergedIntegrations);

        // Update stats
        setStats(prev => ({
          ...prev,
          activeConnections: data.stats?.connected || 0,
          lastSync: data.integrations.length > 0 ? "just now" : prev.lastSync,
        }));
      }
    } catch (error) {
      console.error('Fetch integrations error:', error);
      toast({
        title: "Error loading integrations",
        description: error instanceof Error ? error.message : "Failed to load integrations",
        variant: "destructive",
      });
    }
  };

  // Update search query from external prop
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Update URL params when filters change (skip in embedded mode)
  useEffect(() => {
    if (!embedded) {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.q = debouncedSearch;
      if (selectedCategory !== "All") params.cat = categoryMap[selectedCategory];
      if (statusFilter !== "all") params.status = statusFilter;
      setSearchParams(params, { replace: true });
    }
  }, [debouncedSearch, selectedCategory, statusFilter, setSearchParams, embedded]);

  // Show filtering state briefly when filters change
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 200);
    return () => clearTimeout(timer);
  }, [debouncedSearch, selectedCategory, statusFilter]);

  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      const matchesSearch =
        debouncedSearch === "" ||
        integration.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        integration.description.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || integration.category === selectedCategory;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "connected" && integration.state === "connected") ||
        (statusFilter === "not_connected" && integration.state === "not-connected") ||
        (statusFilter === "errors" && (integration.hasError || (integration.errorCount || 0) > 0));

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
      // Sort by error count desc when errors filter is active
      if (statusFilter === "errors") {
        return (b.errorCount || 0) - (a.errorCount || 0);
      }
      return 0;
    });
  }, [debouncedSearch, selectedCategory, statusFilter]);

  const handleCardClick = (integration: Integration) => {
    if (!isExecutive) {
      toast({
        title: "Access denied",
        description: "Executive role required",
        variant: "destructive",
      });
      return;
    }

    setSelectedApp(integration);
    if (integration.ctaType === "zapier") {
      setShowZapierModal(true);
    } else {
      setShowNativeDrawer(true);
    }
  };

  const handleConnect = async (integration: Integration, config?: any) => {
    if (!isExecutive) {
      toast({
        title: "Access denied",
        description: "Executive role required",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Connecting...",
      description: `Setting up ${integration.name}`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('integrations-connect', {
        body: {
          integrationId: integration.id,
          name: integration.name,
          category: integration.category,
          connectMethod: integration.connectMethod,
          config,
        }
      });

      if (error) throw error;

      toast({
        title: "Connected successfully",
        description: `${integration.name} is now active`,
      });

      // Refresh integrations
      fetchIntegrations();
    } catch (error) {
      console.error('Connect error:', error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect integration",
        variant: "destructive",
      });
    }
  };

  const handleTest = async (integration: Integration) => {
    if (!isExecutive) {
      toast({
        title: "Access denied",
        description: "Executive role required",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Running test...",
      description: `Testing ${integration.name} connection`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('integrations-test', {
        body: { integrationId: integration.id }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Test successful",
          description: data.result?.message || `${integration.name} is working correctly`,
        });
        fetchIntegrations();
      } else {
        throw new Error(data?.result?.message || 'Test failed');
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!isExecutive) {
      toast({
        title: "Access denied",
        description: "Executive role required",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to disconnect ${integration.name}?`)) {
      return;
    }

    toast({
      title: "Disconnecting...",
      description: `Removing ${integration.name}`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('integrations-disconnect', {
        body: { integrationId: integration.id }
      });

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: `${integration.name} has been removed`,
      });

      fetchIntegrations();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnection failed",
        description: error instanceof Error ? error.message : "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={embedded ? "space-y-8" : "min-h-screen bg-background section-padding-lg"}>
      <div className={embedded ? "space-y-8" : "max-w-7xl mx-auto space-y-8"}>
        {!embedded && (
          <SectionHeader
            title="Integrations Hub"
            description="Connect your enterprise tools, AI engines, and data sources — all in one unified workspace."
          />
        )}

        {/* Unified Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-in">
          <DCKPITile
            label="Active Connections"
            value={stats.activeConnections.toString()}
            sublabel="Connected systems"
            status="normal"
            icon={<Activity className="h-4 w-4" />}
            trend="up"
          />
          <DCKPITile
            label="Documents Synced"
            value={`${(stats.documentsSynced / 1000).toFixed(1)}k`}
            sublabel="Data indexed"
            status="info"
            icon={<Database className="h-4 w-4" />}
            trend="up"
          />
          <DCKPITile
            label="Sync Success Rate"
            value={`${stats.syncSuccessRate}%`}
            sublabel="Reliability index"
            status={stats.syncSuccessRate >= 95 ? "normal" : stats.syncSuccessRate >= 80 ? "warning" : "critical"}
            icon={<TrendingUp className="h-4 w-4" />}
            thresholdValue={stats.syncSuccessRate}
            threshold={{ value: stats.syncSuccessRate, max: 100, showBar: true }}
          />
          <DCKPITile
            label="System Status"
            value={stats.lastSync}
            sublabel="All systems operational"
            status="normal"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          {/* Search - hidden when embedded */}
          {!embedded && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 6,000+ apps, tools, or connectors (e.g., Salesforce, Slack, Gemini)"
                className="pl-12 h-12 text-body bg-card/50"
              />
            </div>
          )}

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95"
                onClick={() => setSelectedCategory(category)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedCategory(category)}
                tabIndex={0}
                role="button"
                aria-pressed={selectedCategory === category}
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Status Toggle */}
          <div className="flex gap-2">
            {[
              { key: "all" as const, label: "All" },
              { key: "connected" as const, label: "Connected" },
              { key: "not_connected" as const, label: "Not Connected" },
              { key: "errors" as const, label: "Errors" },
            ].map((status) => (
              <Button
                key={status.key}
                variant={statusFilter === status.key ? "default" : "outline"}
                size="sm"
                className="transition-all duration-200 hover:scale-105 active:scale-95"
                onClick={() => setStatusFilter(status.key)}
                onKeyDown={(e) => e.key === 'Enter' && setStatusFilter(status.key)}
                tabIndex={0}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Zapier Integration Card */}
        <Card className="p-6 border-2 border-[hsl(var(--gold-400))] bg-gradient-to-br from-[hsl(var(--gold-500))]/10 to-[hsl(var(--electric-blue-500))]/10 sticky top-4 z-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex gap-4 flex-1">
              <div className="h-16 w-16 rounded-xl bg-[hsl(var(--gold-400))]/20 flex items-center justify-center shrink-0">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="hsl(var(--gold-500))" stroke="hsl(var(--gold-500))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="hsl(var(--electric-blue-500))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="hsl(var(--gold-500))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-h3 mb-2">Access 6,000+ Apps via Zapier</h3>
                <p className="text-body text-muted-foreground mb-4">
                  Connect Gmail, Slack, Salesforce, Zendesk, Sheets, and thousands more without code.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-[hsl(var(--gold-400))] text-[hsl(var(--gold-500))]">No code</Badge>
                  <Badge variant="outline" className="border-[hsl(var(--electric-blue-400))] text-[hsl(var(--electric-blue-500))]">6,000+ apps</Badge>
                  <Badge variant="outline" className="border-[hsl(var(--gold-400))] text-[hsl(var(--gold-500))]">Instant setup</Badge>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowZapierModal(true)} className="glow-yellow shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Connect Zapier App
            </Button>
          </div>
        </Card>

        {/* Integration Grid */}
        {isFiltering ? (
          <div>
            <h3 className="text-h3 mb-4">Loading...</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : filteredIntegrations.length > 0 ? (
          <div className="animate-fade-in">
            <h3 className="text-h3 mb-4">All Integrations ({filteredIntegrations.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIntegrations.map((integration, index) => (
                <div
                  key={integration.id}
                  className="animate-scale-in"
                  style={{
                    animationDelay: `${index * 30}ms`,
                    animationFillMode: 'backwards'
                  }}
                >
                  <IntegrationCard
                    integration={{
                      id: integration.id,
                      name: integration.name,
                      type: (integration.integrationType || 'native') as any,
                      status: integration.state === 'connected' ? 'connected' : integration.state === 'error' ? 'error' : 'available',
                      connected: integration.state === 'connected',
                      category: integration.category as any,
                      description: integration.description,
                      logo_url: integration.logoUrl,
                      config: {},
                      error_message: integration.hasError ? 'Integration error' : undefined,
                    }}
                    onConnect={() => handleConnect(integration)}
                    onDisconnect={() => handleDisconnect(integration)}
                    onConfigure={() => handleCardClick(integration)}
                    onViewDetails={() => handleCardClick(integration)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <EmptyState
              icon={Search}
              title="No integrations found"
              description={
                selectedCategory !== "All" && statusFilter !== "all"
                  ? `No ${statusFilter.replace('_', ' ')} ${selectedCategory} integrations found. Try adjusting your filters.`
                  : selectedCategory !== "All"
                  ? `No ${selectedCategory} integrations yet.`
                  : statusFilter !== "all"
                  ? `No ${statusFilter.replace('_', ' ')} integrations found.`
                  : "Try adjusting your search query or filters to find what you're looking for."
              }
            />
          </div>
        )}

        {/* Footer CTA */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-8 text-center">
          <h3 className="text-h3 mb-3">Need a Custom Integration?</h3>
          <p className="text-body text-muted-foreground mb-6 max-w-2xl mx-auto">
            Connect any service with our OAuth wizard or request a new connector.
          </p>
          <div className="flex gap-4 justify-center">
            <Button className="glow-yellow">
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Connector
            </Button>
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Request Integration
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedApp && (
        <>
          <ZapierConnectModal
            open={showZapierModal}
            onOpenChange={setShowZapierModal}
            appName={selectedApp.name}
            appIcon={selectedApp.logoUrl}
          />
          <IntegrationDrawer
            open={showNativeDrawer}
            onOpenChange={setShowNativeDrawer}
            appName={selectedApp.name}
            appIcon={selectedApp.logoUrl}
            type={selectedApp.type || "gemini"}
          />
        </>
      )}
    </div>
  );
}
