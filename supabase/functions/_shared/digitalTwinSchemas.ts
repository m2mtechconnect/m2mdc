/**
 * Shared Zod Validation Schemas for Digital Twin Edge Functions
 */

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// Status and type enums
export const digitalTwinStatusSchema = z.enum(['draft', 'active', 'archived']);
export const entityTypeSchema = z.enum(['person', 'system', 'process', 'asset', 'custom']);
export const eventTypeSchema = z.enum(['create', 'update', 'delete', 'status_change', 'workflow_trigger', 'custom']);
export const nodeTypeSchema = z.enum(['trigger', 'action', 'decision', 'human_in_loop', 'condition', 'transform', 'end']);
export const humanInLoopTypeSchema = z.enum(['approval', 'input', 'review', 'notification']);

// Entity schema
export const digitalTwinEntitySchema = z.object({
  id: z.string().uuid(),
  type: entityTypeSchema,
  name: z.string().min(1).max(255),
  properties: z.record(z.unknown()),
  relationships: z.array(z.object({
    targetEntityId: z.string().uuid(),
    relationshipType: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
});

// Event schema
export const digitalTwinEventSchema = z.object({
  id: z.string().uuid(),
  type: eventTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  entityId: z.string().uuid().optional(),
  triggers: z.array(z.string().uuid()).optional(),
  payload: z.record(z.unknown()).optional(),
});

// Human in loop config schema
export const humanInLoopConfigSchema = z.object({
  type: humanInLoopTypeSchema,
  assignedTo: z.string().optional(),
  instructions: z.string().min(1).max(2000),
  timeout: z.number().int().positive().optional(),
  fallback: z.string().optional(),
});

// Node schema
export const digitalTwinNodeSchema = z.object({
  id: z.string().uuid(),
  type: nodeTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  config: z.record(z.unknown()),
  humanInLoop: humanInLoopConfigSchema.optional(),
  nextNodes: z.array(z.string().uuid()).optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in']),
    value: z.unknown(),
    nextNode: z.string().uuid(),
  })).optional(),
});

// Metric schema
export const digitalTwinMetricSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['counter', 'gauge', 'histogram', 'summary']),
  description: z.string().max(1000).optional(),
  unit: z.string().max(50).optional(),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']).optional(),
});

// Config schema
export const digitalTwinConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  entities: z.array(digitalTwinEntitySchema).min(1, 'At least one entity is required'),
  events: z.array(digitalTwinEventSchema).min(1, 'At least one event is required'),
  workflow: z.object({
    nodes: z.array(digitalTwinNodeSchema).min(1, 'At least one workflow node is required'),
    entryPoint: z.string().uuid(),
  }),
  metrics: z.array(digitalTwinMetricSchema).optional(),
  settings: z.object({
    enableLogging: z.boolean().optional(),
    enableMetrics: z.boolean().optional(),
    enableHumanInLoop: z.boolean().optional(),
    maxConcurrentRuns: z.number().int().positive().max(100).optional(),
  }).optional(),
}).refine((data) => {
  // Validate that entryPoint exists in nodes
  return data.workflow.nodes.some(node => node.id === data.workflow.entryPoint);
}, {
  message: 'Entry point must reference an existing workflow node',
  path: ['workflow', 'entryPoint'],
});

// Create input schema
export const createDigitalTwinSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional(),
  status: digitalTwinStatusSchema.optional(),
  config: digitalTwinConfigSchema,
});

// Update input schema
export const updateDigitalTwinSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: digitalTwinStatusSchema.optional(),
  config: digitalTwinConfigSchema.optional(),
});

// List query schema
export const listDigitalTwinsSchema = z.object({
  status: digitalTwinStatusSchema.optional(),
  search: z.string().max(255).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
