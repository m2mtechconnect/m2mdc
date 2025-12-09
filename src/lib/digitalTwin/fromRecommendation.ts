/**
 * Map AI Recommendation to Digital Twin Config
 * Converts recommendation data into a valid DigitalTwinConfig structure
 */

import { DigitalTwinConfig, DigitalTwinEntity, DigitalTwinEvent, DigitalTwinNode } from '@/types/digitalTwin';
import { RecommendationData } from '@/types/recommendation';

export function mapRecommendationToDigitalTwinConfig(params: {
  recommendation: RecommendationData;
  systemName: string;
}): DigitalTwinConfig {
  const { recommendation, systemName } = params;

  // Determine entity type based on department/industry
  const department = recommendation.department || 'Operations';
  const entityType = inferEntityType(department);
  const entityName = inferEntityName(department);

  // Create primary entity
  const primaryEntity: DigitalTwinEntity = {
    id: 'entity_primary',
    type: entityType,
    name: entityName,
    properties: {
      name: { type: 'string', required: true },
      description: { type: 'string', required: false },
      status: { type: 'string', required: true, enum: ['pending', 'in_progress', 'completed', 'archived'] },
      priority: { type: 'string', required: false, enum: ['low', 'medium', 'high'] },
      created_at: { type: 'timestamp', required: true },
      updated_at: { type: 'timestamp', required: true },
    },
  };

  // Create intake event
  const intakeEvent: DigitalTwinEvent = {
    id: 'intake_submitted',
    type: 'create',
    name: 'Intake Submitted',
    description: `New ${entityName.toLowerCase()} intake submitted`,
    triggers: ['node_trigger'],
  };

  // Build workflow nodes based on recommendation
  const nodes: DigitalTwinNode[] = [
    // Entry point
    {
      id: 'node_trigger',
      type: 'trigger',
      name: 'Intake Trigger',
      description: `Triggered when new ${entityName.toLowerCase()} is submitted`,
      config: {
        eventId: 'intake_submitted',
      },
      nextNodes: ['node_classify'],
    },
    // AI classification
    {
      id: 'node_classify',
      type: 'action',
      name: 'AI Classification',
      description: 'Analyze and classify the submission using AI',
      config: {
        actionType: 'ai_decision',
        model: 'google/gemini-2.5-flash',
        prompt: buildAIPrompt(recommendation, department),
        outputSchema: {
          category: 'string',
          priority: 'string',
          readiness_score: 'number',
          rationale: 'string',
        },
      },
      nextNodes: ['node_rules'],
    },
    // Rule-based screening
    {
      id: 'node_rules',
      type: 'decision',
      name: 'Rule Screening',
      description: 'Apply business rules to the classification',
      config: {
        rules: [
          {
            condition: 'priority === "high" && readiness_score >= 70',
            action: 'route_to_human',
          },
          {
            condition: 'priority === "low" || readiness_score < 40',
            action: 'auto_triage',
          },
        ],
      },
      conditions: [
        {
          field: 'priority',
          operator: 'eq',
          value: 'high',
          nextNode: 'node_human_review',
        },
      ],
      nextNodes: ['node_state_update', 'node_human_review'],
    },
    // Human review (conditional)
    {
      id: 'node_human_review',
      type: 'human_in_loop',
      name: 'Human Review',
      description: 'High-priority cases require human approval',
      config: {
        role: 'analyst',
        instructions: `Review this ${entityName.toLowerCase()} and approve or reject`,
      },
      humanInLoop: {
        type: 'approval',
        assignedTo: 'analyst',
        instructions: `Review the AI classification and approve next steps`,
        timeout: 86400, // 24 hours
        fallback: 'auto_approve',
      },
      nextNodes: ['node_state_update'],
    },
    // State update
    {
      id: 'node_state_update',
      type: 'transform',
      name: 'Update State',
      description: `Update ${entityName.toLowerCase()} state with triage results`,
      config: {
        stateUpdates: {
          status: 'triaged',
          triage_completed_at: '{{now}}',
          ai_category: '{{context.category}}',
          priority: '{{context.priority}}',
          readiness_score: '{{context.readiness_score}}',
        },
      },
      nextNodes: ['node_notify'],
    },
    // Notification
    {
      id: 'node_notify',
      type: 'action',
      name: 'Send Notification',
      description: 'Notify relevant stakeholders',
      config: {
        actionType: 'notification',
        recipient: 'team',
        template: 'triage_complete',
      },
      nextNodes: ['node_end'],
    },
    // End
    {
      id: 'node_end',
      type: 'end',
      name: 'Process Complete',
      description: 'Triage workflow completed',
      config: {},
    },
  ];

  // Assemble the complete config
  const config: DigitalTwinConfig = {
    version: '1.0',
    goal: recommendation.problem || `Automate ${department} ${entityName.toLowerCase()} triage`,
    entities: [primaryEntity],
    events: [intakeEvent],
    workflow: {
      nodes,
      entryPoint: 'node_trigger',
    },
    settings: {
      enableLogging: true,
      enableMetrics: true,
      enableHumanInLoop: true,
      maxConcurrentRuns: 10,
    },
  };

  return config;
}

/**
 * Infer entity type from department
 */
function inferEntityType(department: string): DigitalTwinEntity['type'] {
  const lower = department.toLowerCase();
  
  if (lower.includes('hr') || lower.includes('people')) {
    return 'person';
  }
  if (lower.includes('it') || lower.includes('tech')) {
    return 'system';
  }
  if (lower.includes('finance') || lower.includes('accounting')) {
    return 'process';
  }
  if (lower.includes('operations') || lower.includes('supply')) {
    return 'process';
  }
  
  return 'process'; // Default
}

/**
 * Infer entity name from department
 */
function inferEntityName(department: string): string {
  const lower = department.toLowerCase();
  
  if (lower.includes('funding') || lower.includes('grant')) {
    return 'Funding Case';
  }
  if (lower.includes('hr') || lower.includes('hiring')) {
    return 'Candidate';
  }
  if (lower.includes('sales') || lower.includes('customer')) {
    return 'Lead';
  }
  if (lower.includes('support') || lower.includes('service')) {
    return 'Support Ticket';
  }
  if (lower.includes('finance') || lower.includes('accounting')) {
    return 'Financial Request';
  }
  
  return 'Case'; // Generic default
}

/**
 * Build AI classification prompt from recommendation
 */
function buildAIPrompt(recommendation: RecommendationData, department: string): string {
  return `You are an AI classifier for ${department} operations.

CONTEXT:
${recommendation.problem || 'Analyze and triage incoming requests'}

TASK:
Analyze the incoming submission and provide:
1. Category classification
2. Priority level (low/medium/high)
3. Readiness score (0-100)
4. Brief rationale

Return structured JSON with these fields:
{
  "category": string,
  "priority": "low" | "medium" | "high",
  "readiness_score": number,
  "rationale": string
}

Be precise and objective in your analysis.`;
}
