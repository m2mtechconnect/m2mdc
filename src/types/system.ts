/**
 * Deployed system data model
 * Represents a real, deployed digital twin or agent instance
 */
export interface DeployedSystem {
  id: string;
  name: string;
  description: string;
  department: string;
  category: string;
  type: 'system' | 'agent' | 'twin';
  status: 'active' | 'draft' | 'paused' | 'archived';
  version: string;
  
  // Template linkage
  templateId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  
  // Metrics
  roi: number;
  successRate: number;
  totalRuns: number;
  avgDuration?: number;
  connectedAppsCount?: number;
  
  // Runtime data
  lastRun?: {
    timestamp: string;
    channel: string;
    status: string;
  };
  
  recentActivity?: Array<{
    id: string;
    timestamp: string;
    description: string;
  }>;
  
  // Intake origin
  intakeOrigin?: {
    type: 'url' | 'file' | 'questionnaire' | 'template';
    url?: string;
    fileName?: string;
    templateId?: string;
  };
  
  // Intelligence config
  intelligence?: {
    modelId: string;
    temperature: number;
    knowledgeSources?: Array<{
      name: string;
      type: string;
    }>;
  };
  
  // Tools & integrations
  tools?: Array<{
    name: string;
    provider: string;
    status: 'connected' | 'disconnected' | 'error';
    lastHealthCheck?: string;
  }>;
  
  // Workflows
  workflows?: Array<{
    name: string;
    trigger: string;
    enabled: boolean;
    path?: string;
  }>;
  
  // Recent runs
  recentRuns?: Array<{
    id: string;
    timestamp: string;
    status: 'success' | 'error';
    duration: number;
    channel: string;
    user?: string;
    error?: string;
  }>;
  
  // Versions
  versions?: Array<{
    version: string;
    publishedAt: string;
    publishedBy: string;
  }>;
}
