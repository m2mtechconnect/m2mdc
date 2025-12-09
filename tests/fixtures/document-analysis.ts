/**
 * Test fixtures for document analysis results
 */

import type { DocumentAnalysisResult } from '@/hooks/useDocumentAnalysis';

export const smallDocumentAnalysis: DocumentAnalysisResult = {
  detected_industry: 'Healthcare',
  detected_department: 'Operations',
  use_case: 'Patient intake and scheduling optimization',
  summary: 'Healthcare facility seeks to automate patient intake, reduce wait times, and improve scheduling efficiency.',
  estimated_complexity: 'Medium',
  risk_level: 'High',
  recommended_agent_type: 'Process Twin',
  
  detected_kpis: [
    {
      name: 'Wait Time Reduction',
      current_estimate: '45 minutes average',
      target_improvement: '50% reduction',
      confidence: 0.9,
    },
    {
      name: 'Scheduling Efficiency',
      current_estimate: '60% utilization',
      target_improvement: '85% utilization',
      confidence: 0.85,
    },
  ],
  
  suggested_workflows: [
    {
      trigger: 'New Patient Arrival',
      description: 'Automated check-in and intake processing',
      actions: [
        'Verify insurance',
        'Collect medical history',
        'Assign to provider',
        'Notify staff',
      ],
      integration_needed: ['Electronic Health Record System', 'Insurance Verification API'],
    },
  ],
  
  suggested_integrations: [
    'Electronic Health Record System',
    'Insurance Verification API',
    'SMS Notification Service',
  ],
  
  compliance_requirements: ['HIPAA', 'SOC 2'],
  
  rag_requirements: {
    needs_rag: true,
    suggested_sources: ['Patient intake forms', 'Insurance policies', 'Facility procedures'],
  },
  
  builderPrefill: {
    step1_goal: 'You are a healthcare intake assistant specializing in patient scheduling and registration. Help reduce wait times and improve scheduling efficiency while maintaining HIPAA compliance.',
  },
};

export const largeDocumentAnalysis: DocumentAnalysisResult = {
  detected_industry: 'Manufacturing',
  detected_department: 'Operations',
  use_case: 'Enterprise supply chain optimization and predictive maintenance',
  summary: 'Large manufacturing operation needs to optimize supply chain logistics, predict equipment maintenance needs, and reduce operational downtime across multiple facilities.',
  estimated_complexity: 'High',
  risk_level: 'Medium',
  recommended_agent_type: 'Digital Twin',
  
  detected_kpis: [
    {
      name: 'Equipment Downtime',
      current_estimate: '120 hours/month',
      target_improvement: '40% reduction',
      confidence: 0.88,
    },
    {
      name: 'Supply Chain Efficiency',
      current_estimate: '72% on-time delivery',
      target_improvement: '95% on-time delivery',
      confidence: 0.82,
    },
    {
      name: 'Maintenance Costs',
      current_estimate: '$500K/month',
      target_improvement: '30% cost reduction',
      confidence: 0.75,
    },
  ],
  
  suggested_workflows: [
    {
      trigger: 'Equipment Sensor Alert',
      description: 'Predictive maintenance workflow',
      actions: [
        'Analyze sensor data',
        'Predict failure probability',
        'Schedule preventive maintenance',
        'Order parts',
        'Notify maintenance team',
      ],
      integration_needed: ['IoT Sensor Platform', 'CMMS', 'ERP System'],
    },
    {
      trigger: 'Supply Chain Event',
      description: 'Supply chain optimization workflow',
      actions: [
        'Monitor inventory levels',
        'Predict demand',
        'Optimize reorder points',
        'Generate purchase orders',
      ],
      integration_needed: ['ERP System', 'Warehouse Management System'],
    },
  ],
  
  suggested_integrations: [
    'IoT Sensor Platform',
    'CMMS (Computerized Maintenance Management System)',
    'ERP System',
    'Warehouse Management System',
    'Predictive Analytics Platform',
  ],
  
  compliance_requirements: ['ISO 9001', 'ISO 27001'],
  
  rag_requirements: {
    needs_rag: true,
    suggested_sources: [
      'Equipment maintenance manuals',
      'Historical maintenance records',
      'Supply chain documentation',
      'Safety procedures',
    ],
  },
  
  builderPrefill: {
    step1_goal: 'You are an industrial operations twin that monitors equipment health, predicts maintenance needs, and optimizes supply chain logistics. Use sensor data and historical patterns to prevent downtime and improve efficiency.',
  },
};

export const minimalDocumentAnalysis: DocumentAnalysisResult = {
  detected_industry: 'Technology',
  detected_department: 'IT',
  use_case: 'IT helpdesk automation',
  summary: 'Basic IT helpdesk automation for common support requests.',
  estimated_complexity: 'Low',
  risk_level: 'Low',
  recommended_agent_type: 'Agent',
  
  detected_kpis: [
    {
      name: 'Response Time',
      current_estimate: '2 hours',
      target_improvement: '15 minutes',
      confidence: 0.9,
    },
  ],
  
  suggested_workflows: [
    {
      trigger: 'New Support Ticket',
      description: 'Automated ticket triage and response',
      actions: ['Categorize ticket', 'Provide automated response', 'Route to specialist if needed'],
      integration_needed: ['Ticketing System'],
    },
  ],
  
  suggested_integrations: ['Ticketing System', 'Knowledge Base'],
  
  compliance_requirements: [],
  
  rag_requirements: {
    needs_rag: true,
    suggested_sources: ['IT knowledge base', 'Common support issues'],
  },
  
  builderPrefill: {
    step1_goal: 'You are an IT helpdesk assistant that helps resolve common IT issues quickly.',
  },
};
