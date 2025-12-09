/**
 * Digital Twin Core Data Model
 * Defines the structure for digital twin entities, events, workflows, and metrics
 */

export type DigitalTwinStatus = 'draft' | 'active' | 'archived';

export type DigitalTwinEntityType = 'person' | 'system' | 'process' | 'asset' | 'custom';

export type DigitalTwinEventType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'status_change' 
  | 'workflow_trigger'
  | 'custom';

export type DigitalTwinNodeType =
  | 'trigger'
  | 'action'
  | 'decision'
  | 'human_in_loop'
  | 'condition'
  | 'transform'
  | 'end';

export type HumanInLoopType = 'approval' | 'input' | 'review' | 'notification';

export interface DigitalTwinEntity {
  id: string;
  type: DigitalTwinEntityType;
  name: string;
  properties: Record<string, unknown>;
  relationships?: {
    targetEntityId: string;
    relationshipType: string;
    metadata?: Record<string, unknown>;
  }[];
}

export interface DigitalTwinEvent {
  id: string;
  type: DigitalTwinEventType;
  name: string;
  description?: string;
  entityId?: string;
  triggers?: string[]; // Array of workflow node IDs
  payload?: Record<string, unknown>;
}

export interface HumanInLoopConfig {
  type: HumanInLoopType;
  assignedTo?: string; // User ID or role
  instructions: string;
  timeout?: number; // In seconds
  fallback?: string; // What to do if timeout
}

export interface DigitalTwinNode {
  id: string;
  type: DigitalTwinNodeType;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  humanInLoop?: HumanInLoopConfig;
  nextNodes?: string[]; // Array of node IDs
  conditions?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
    value: unknown;
    nextNode: string;
  }[];
}

export interface DigitalTwinMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description?: string;
  unit?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface DigitalTwinConfig {
  version: string;
  goal?: string; // Add goal to config
  entities: DigitalTwinEntity[];
  events: DigitalTwinEvent[];
  workflow: {
    nodes: DigitalTwinNode[];
    entryPoint: string; // ID of the first node
  };
  metrics?: DigitalTwinMetric[];
  settings?: {
    enableLogging?: boolean;
    enableMetrics?: boolean;
    enableHumanInLoop?: boolean;
    maxConcurrentRuns?: number;
  };
}

export interface DigitalTwin {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  status: DigitalTwinStatus;
  config: DigitalTwinConfig;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalTwinRun {
  id: string;
  twinId: string;
  userId: string;
  eventId?: string;
  runId?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    metadata?: Record<string, unknown>;
  }>;
  stateChanges: Array<{
    timestamp: string;
    nodeId: string;
    stateBefore?: Record<string, unknown>;
    stateAfter: Record<string, unknown>;
  }>;
  createdAt: string;
  completedAt?: string;
}

// Helper types
export type CreateDigitalTwinInput = Omit<DigitalTwin, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateDigitalTwinInput = Partial<Omit<DigitalTwin, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
