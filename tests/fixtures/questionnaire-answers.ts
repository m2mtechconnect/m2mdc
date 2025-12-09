/**
 * Test fixtures for questionnaire answers
 */

import type { QuestionnaireAnswers } from '@/lib/builder/questionnaireToBlueprint';

export const customerSupportAgentAnswers: QuestionnaireAnswers = {
  // Step 1: Business Context
  industry: 'Technology',
  department: 'Customer Support',
  teamSize: '11-50',
  currentTools: ['Slack', 'Salesforce', 'HubSpot'],
  
  // Step 2: Primary Goal
  primaryGoal: 'Automate customer support responses',
  specificChallenge: 'High volume of repetitive support tickets consuming team time',
  successMetric: 'Reduce response time by 50%',
  
  // Step 3: Agent Type
  agentType: 'agent',
  agentRole: 'Customer Success Assistant',
  
  // Step 4: Risk & Safety
  riskLevel: 'medium',
  complianceNeeds: ['GDPR', 'SOC 2'],
  dataSensitivity: 'internal',
};

export const inventoryOptimizationTwinAnswers: QuestionnaireAnswers = {
  // Step 1: Business Context
  industry: 'Retail',
  department: 'Operations',
  teamSize: '51-200',
  currentTools: ['Microsoft 365', 'Jira', 'Monday.com'],
  
  // Step 2: Primary Goal
  primaryGoal: 'Optimize inventory management across multiple locations',
  specificChallenge: 'Manual inventory tracking leading to stockouts and overstock',
  successMetric: 'Improve inventory accuracy by 75%',
  
  // Step 3: Agent Type
  agentType: 'process_twin',
  agentRole: 'Inventory Optimization Twin',
  
  // Step 4: Risk & Safety
  riskLevel: 'high',
  complianceNeeds: ['ISO 27001'],
  dataSensitivity: 'confidential',
};

export const minimalAnswers: QuestionnaireAnswers = {
  industry: 'Finance',
  department: 'IT',
  teamSize: '1-10',
  currentTools: [],
  primaryGoal: 'Streamline IT requests',
  successMetric: 'Reduce ticket resolution time',
  agentType: 'agent',
  riskLevel: 'low',
  complianceNeeds: [],
  dataSensitivity: 'public',
};
