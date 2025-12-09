/**
 * Questionnaire to Blueprint Converter
 * Converts questionnaire answers into AgentBlueprint format
 */

import { AgentBlueprint } from '@/types/agentBlueprint';

export type QuestionnaireAnswers = {
  // Step 1: Business Context
  industry: string;
  department: string;
  teamSize: string;
  currentTools: string[];
  
  // Step 2: Primary Goal
  primaryGoal: string;
  specificChallenge?: string;
  successMetric: string;
  
  // Step 3: Agent Type
  agentType: 'agent' | 'process_twin' | '3d_twin';
  agentRole?: string;
  
  // Step 4: Risk & Safety
  riskLevel: 'low' | 'medium' | 'high';
  complianceNeeds: string[];
  dataSensitivity: 'public' | 'internal' | 'confidential';
};

export function questionnaireToBlueprint(answers: QuestionnaireAnswers): AgentBlueprint {
  // Determine level based on team size and risk
  let level: AgentBlueprint['level'] = 'Operational';
  if (answers.riskLevel === 'high' || answers.teamSize === '201+') {
    level = 'Strategic';
  } else if (answers.riskLevel === 'medium' || answers.teamSize === '51-200') {
    level = 'Tactical';
  }

  // Generate agent name
  const agentName = answers.agentRole || 
    `${answers.agentType === 'agent' ? 'AI Agent' : answers.agentType === 'process_twin' ? 'Process Twin' : '3D Twin'} for ${answers.department}`;

  // Generate description
  const description = answers.specificChallenge || 
    `${answers.agentType === 'agent' ? 'AI assistant' : 'Digital twin'} designed to ${answers.primaryGoal.toLowerCase()}`;

  // Generate system prompt
  const systemPrompt = generateSystemPrompt(answers);

  // Extract expected ROI from success metric
  const expectedRoi = extractRoiFromMetric(answers.successMetric);

  // Estimate time saved based on goal
  const timeSavedPerWeek = estimateTimeSaved(answers);

  // Build the blueprint
  const blueprint: AgentBlueprint = {
    source: 'questionnaire',
    createdAt: new Date().toISOString(),

    // Step 1: Summary
    name: agentName,
    description,
    industry: answers.industry,
    department: answers.department,
    useCase: answers.primaryGoal,
    level,
    type: answers.agentType,

    // Business metrics
    goals: [answers.primaryGoal],
    expectedRoi,
    timeSavedPerWeek,
    efficiencyGain: estimateEfficiency(answers),

    // Step 2: Intelligence Setup
    model: {
      provider: 'gemini',
      modelName: 'google/gemini-2.5-flash',
      temperature: answers.agentType === 'agent' ? 0.7 : 0.3, // More creative for agents
      topK: 20,
      topP: 0.95,
    },

    knowledge: {
      documents: [],
      urls: [],
      cloudDrives: {},
      summary: `Knowledge base for ${answers.industry} ${answers.department} operations`,
    },

    behavior: {
      systemPrompt,
      personaTemplate: generatePersonaTemplate(answers),
      communicationStyle: {
        formal: answers.riskLevel === 'high' || answers.dataSensitivity === 'confidential',
        emojis: answers.agentType === 'agent' && answers.riskLevel === 'low',
        detailedExplanations: true,
      },
      safety: {
        hallucinationPrevention: true,
        knowledgeRestrictions: answers.dataSensitivity !== 'public',
        requireCitations: answers.riskLevel === 'high' || answers.complianceNeeds.length > 0,
      },
    },

    // Step 3: Tools & Integrations
    tools: {
      recommendedIntegrations: answers.currentTools,
      preselectedIntegrations: answers.currentTools.slice(0, 3), // Pre-select top 3
      customApis: [],
    },

    // Step 4: Workflow Builder
    workflow: {
      templateType: 'auto',
      triggers: generateDefaultTriggers(answers),
      actions: generateDefaultActions(answers),
      integrations: answers.currentTools,
    },

    // Metadata
    tags: [
      answers.industry,
      answers.department,
      answers.agentType,
      ...answers.complianceNeeds,
      answers.riskLevel,
    ].filter(Boolean),
  };

  return blueprint;
}

/**
 * Generate system prompt based on answers
 */
function generateSystemPrompt(answers: QuestionnaireAnswers): string {
  const roleContext = answers.agentRole || `${answers.agentType} assistant`;
  const industryContext = `in the ${answers.industry} industry`;
  const goalContext = `to help ${answers.primaryGoal.toLowerCase()}`;

  let prompt = `You are a ${roleContext} ${industryContext}, designed ${goalContext}.\n\n`;

  // Add role-specific guidance
  if (answers.agentType === 'agent') {
    prompt += `Your role is to provide helpful, accurate, and timely assistance to users in the ${answers.department} department. `;
  } else if (answers.agentType === 'process_twin') {
    prompt += `You simulate and optimize business processes for the ${answers.department} department. `;
  } else {
    prompt += `You provide visual simulation and analysis for the ${answers.department} operations. `;
  }

  // Add safety guidance for high-risk scenarios
  if (answers.riskLevel === 'high') {
    prompt += `\n\nIMPORTANT: You handle sensitive ${answers.dataSensitivity} data. Always prioritize security, accuracy, and compliance with ${answers.complianceNeeds.join(', ') || 'industry standards'}.`;
  }

  // Add success metric focus
  prompt += `\n\nYour primary goal is to ${answers.successMetric.toLowerCase()}.`;

  return prompt;
}

/**
 * Generate persona template
 */
function generatePersonaTemplate(answers: QuestionnaireAnswers): string {
  if (answers.agentType === 'agent') {
    return `Professional ${answers.department} assistant with expertise in ${answers.industry}`;
  } else if (answers.agentType === 'process_twin') {
    return `Process optimization system for ${answers.department} workflows`;
  } else {
    return `Visual simulation and analysis tool for ${answers.department}`;
  }
}

/**
 * Extract ROI estimate from success metric
 */
function extractRoiFromMetric(metric: string): string | null {
  // Look for percentage patterns
  const percentMatch = metric.match(/(\d+)%/);
  if (percentMatch) {
    return `${percentMatch[1]}% improvement`;
  }

  // Look for time patterns
  const timeMatch = metric.match(/(\d+)\s*(hour|minute|day|week)/i);
  if (timeMatch) {
    return `${timeMatch[1]} ${timeMatch[2]}s saved`;
  }

  // Default estimate
  return '25-40% efficiency gain';
}

/**
 * Estimate time saved based on goal and team size
 */
function estimateTimeSaved(answers: QuestionnaireAnswers): string | null {
  const teamSizeNum = parseInt(answers.teamSize);
  
  if (teamSizeNum >= 201) {
    return '40+ hours/week';
  } else if (teamSizeNum >= 51) {
    return '20-40 hours/week';
  } else if (teamSizeNum >= 11) {
    return '10-20 hours/week';
  } else {
    return '5-10 hours/week';
  }
}

/**
 * Estimate efficiency gain
 */
function estimateEfficiency(answers: QuestionnaireAnswers): string | null {
  if (answers.riskLevel === 'high') {
    return '15-25% improvement'; // Conservative for high-risk
  } else if (answers.agentType === 'process_twin') {
    return '30-50% improvement'; // Higher for process automation
  } else {
    return '20-35% improvement';
  }
}

/**
 * Generate default workflow triggers
 */
function generateDefaultTriggers(answers: QuestionnaireAnswers): any[] {
  if (answers.agentType === 'agent') {
    return [
      {
        type: 'manual',
        name: 'User Request',
        description: 'Triggered when a user asks a question or makes a request',
      },
      {
        type: 'scheduled',
        name: 'Daily Summary',
        description: 'Generate daily summary reports',
      },
    ];
  } else if (answers.agentType === 'process_twin') {
    return [
      {
        type: 'event',
        name: 'Process Start',
        description: 'Triggered when a business process begins',
      },
      {
        type: 'scheduled',
        name: 'Optimization Check',
        description: 'Periodic process optimization analysis',
      },
    ];
  } else {
    return [
      {
        type: 'manual',
        name: 'Simulation Run',
        description: 'Run visual simulation on demand',
      },
    ];
  }
}

/**
 * Generate default workflow actions
 */
function generateDefaultActions(answers: QuestionnaireAnswers): any[] {
  if (answers.agentType === 'agent') {
    return [
      {
        type: 'respond',
        name: 'Generate Response',
        description: 'Process request and provide helpful answer',
      },
      {
        type: 'notify',
        name: 'Send Notification',
        description: 'Notify relevant stakeholders',
      },
    ];
  } else if (answers.agentType === 'process_twin') {
    return [
      {
        type: 'analyze',
        name: 'Analyze Process',
        description: 'Evaluate process efficiency and identify bottlenecks',
      },
      {
        type: 'optimize',
        name: 'Optimize Workflow',
        description: 'Apply optimization recommendations',
      },
    ];
  } else {
    return [
      {
        type: 'simulate',
        name: 'Run Simulation',
        description: 'Execute 3D visualization and analysis',
      },
      {
        type: 'report',
        name: 'Generate Report',
        description: 'Create visual analysis report',
      },
    ];
  }
}
