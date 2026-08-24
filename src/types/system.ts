/**
 * Deployed system data model.
 * Represents a persisted digital twin or agent instance without inventing
 * runtime measurements or configuration values that are not present.
 */
export interface DeployedSystem {
  id: string;
  name: string;
  description: string;
  /** Null when no department is bound to the record. */
  department: string | null;
  category: string;
  type: 'system' | 'agent' | 'twin';
  status: 'active' | 'draft' | 'paused' | 'archived';
  version: string;

  templateId?: string;

  createdAt: string;
  updatedAt: string;
  deployedAt?: string;

  /** Null when success rate is not available from persisted evidence. */
  successRate: number | null;
  /** Persisted run counter. */
  totalRuns: number;
  /** Null when ROI has not been computed from measured metrics. */
  roi: number | null;
  avgDuration?: number | null;
  connectedAppsCount?: number | null;

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

  intakeOrigin?: {
    type: 'url' | 'file' | 'questionnaire' | 'template';
    url?: string;
    fileName?: string;
    templateId?: string;
  };

  intelligence?: {
    /** Null when no model identifier is persisted. */
    modelId: string | null;
    /** Optional because absence must not be replaced with a conventional default. */
    temperature?: number | null;
    knowledgeSources?: Array<{
      name: string;
      type: string;
    }>;
  };

  tools?: Array<{
    name: string;
    provider: string;
    status: 'connected' | 'disconnected' | 'error';
    lastHealthCheck?: string;
  }>;

  workflows?: Array<{
    name: string;
    trigger: string;
    enabled: boolean;
    path?: string;
  }>;

  recentRuns?: Array<{
    id: string;
    timestamp: string;
    status: 'success' | 'error';
    duration: number | null;
    channel: string;
    user?: string;
    error?: string;
  }>;

  versions?: Array<{
    version: string;
    publishedAt: string;
    publishedBy: string;
  }>;
}
