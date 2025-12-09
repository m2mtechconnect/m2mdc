import { CoPilotContext } from '@/lib/copilot/contextBuilder';

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedDuration: string;
  trigger?: string;
}

export interface MockRun {
  id: string;
  scenario: string;
  status: 'completed' | 'running' | 'failed';
  duration: number;
  timestamp: string;
  result: string;
  kpis?: Record<string, number>;
}

export interface MockMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

const industryScenarios: Record<string, SimulationScenario[]> = {
  finance: [
    {
      id: 'fin-1',
      title: 'Suspicious Wire Transfer Pattern',
      description: 'Detect multiple wire transfers to high-risk jurisdictions within 24 hours',
      category: 'AML/Fraud',
      priority: 'critical',
      expectedDuration: '2-5 seconds',
      trigger: 'Transaction threshold exceeded'
    },
    {
      id: 'fin-2',
      title: 'High-Frequency Micro-Transactions',
      description: 'Identify structuring behavior with transactions just under reporting threshold',
      category: 'AML/Fraud',
      priority: 'high',
      expectedDuration: '3-7 seconds',
      trigger: 'Pattern detection'
    },
    {
      id: 'fin-3',
      title: 'Stale KYC Record Check',
      description: 'Flag accounts with outdated customer information requiring refresh',
      category: 'Compliance',
      priority: 'medium',
      expectedDuration: '1-3 seconds',
      trigger: 'Scheduled review'
    },
    {
      id: 'fin-4',
      title: 'Credit Risk Scoring Update',
      description: 'Re-evaluate creditworthiness based on new financial data',
      category: 'Risk Assessment',
      priority: 'medium',
      expectedDuration: '5-10 seconds',
      trigger: 'Data refresh'
    },
    {
      id: 'fin-5',
      title: 'Regulatory Reporting Audit',
      description: 'Validate completeness of quarterly regulatory filings',
      category: 'Compliance',
      priority: 'high',
      expectedDuration: '10-15 seconds',
      trigger: 'Reporting deadline'
    }
  ],
  retail: [
    {
      id: 'ret-1',
      title: 'Cart Abandonment Spike',
      description: 'Detect sudden increase in cart abandonment rate on checkout page',
      category: 'Customer Experience',
      priority: 'high',
      expectedDuration: '2-4 seconds',
      trigger: 'Threshold breach'
    },
    {
      id: 'ret-2',
      title: 'Inventory Stock-Out Prediction',
      description: 'Forecast stock depletion for high-demand items',
      category: 'Supply Chain',
      priority: 'critical',
      expectedDuration: '3-6 seconds',
      trigger: 'Inventory level'
    },
    {
      id: 'ret-3',
      title: 'Dynamic Pricing Adjustment',
      description: 'Optimize pricing based on demand signals and competitor analysis',
      category: 'Revenue Optimization',
      priority: 'medium',
      expectedDuration: '4-8 seconds',
      trigger: 'Market change'
    },
    {
      id: 'ret-4',
      title: 'Customer Churn Risk',
      description: 'Identify high-value customers at risk of churning',
      category: 'Customer Retention',
      priority: 'high',
      expectedDuration: '5-10 seconds',
      trigger: 'Behavior pattern'
    }
  ],
  manufacturing: [
    {
      id: 'mfg-1',
      title: 'Equipment Downtime Prediction',
      description: 'Predict maintenance needs based on sensor data anomalies',
      category: 'Predictive Maintenance',
      priority: 'critical',
      expectedDuration: '3-5 seconds',
      trigger: 'Sensor threshold'
    },
    {
      id: 'mfg-2',
      title: 'Quality Control Defect Detection',
      description: 'Identify production defects from visual inspection data',
      category: 'Quality Assurance',
      priority: 'high',
      expectedDuration: '2-6 seconds',
      trigger: 'Inspection cycle'
    },
    {
      id: 'mfg-3',
      title: 'Supply Chain Delay Alert',
      description: 'Monitor supplier delivery delays impacting production',
      category: 'Supply Chain',
      priority: 'high',
      expectedDuration: '4-8 seconds',
      trigger: 'Delivery status'
    },
    {
      id: 'mfg-4',
      title: 'Production Efficiency Optimization',
      description: 'Analyze throughput and recommend process improvements',
      category: 'Operations',
      priority: 'medium',
      expectedDuration: '10-15 seconds',
      trigger: 'Daily review'
    }
  ],
  healthcare: [
    {
      id: 'hc-1',
      title: 'Abnormal Vital Signs Alert',
      description: 'Detect critical changes in patient vital signs requiring intervention',
      category: 'Patient Safety',
      priority: 'critical',
      expectedDuration: '1-2 seconds',
      trigger: 'Threshold breach'
    },
    {
      id: 'hc-2',
      title: 'Drug Interaction Check',
      description: 'Identify potential adverse drug interactions in prescription',
      category: 'Clinical Safety',
      priority: 'critical',
      expectedDuration: '2-4 seconds',
      trigger: 'Prescription order'
    },
    {
      id: 'hc-3',
      title: 'Readmission Risk Prediction',
      description: 'Assess likelihood of patient readmission within 30 days',
      category: 'Care Management',
      priority: 'high',
      expectedDuration: '5-10 seconds',
      trigger: 'Discharge planning'
    },
    {
      id: 'hc-4',
      title: 'Medical Imaging Analysis',
      description: 'AI-assisted diagnostic image interpretation',
      category: 'Diagnostics',
      priority: 'medium',
      expectedDuration: '8-15 seconds',
      trigger: 'Imaging request'
    }
  ],
  logistics: [
    {
      id: 'log-1',
      title: 'Route Optimization Update',
      description: 'Recalculate optimal delivery routes based on traffic conditions',
      category: 'Operations',
      priority: 'high',
      expectedDuration: '5-10 seconds',
      trigger: 'Traffic update'
    },
    {
      id: 'log-2',
      title: 'Package Delay Notification',
      description: 'Alert customers of expected delivery delays',
      category: 'Customer Service',
      priority: 'medium',
      expectedDuration: '2-4 seconds',
      trigger: 'Route deviation'
    },
    {
      id: 'log-3',
      title: 'Warehouse Capacity Planning',
      description: 'Forecast storage needs based on incoming shipments',
      category: 'Capacity Management',
      priority: 'medium',
      expectedDuration: '6-12 seconds',
      trigger: 'Daily forecast'
    }
  ],
  construction: [
    {
      id: 'con-1',
      title: 'Permit Compliance Check',
      description: 'Verify all required permits are current and valid',
      category: 'Compliance',
      priority: 'critical',
      expectedDuration: '3-5 seconds',
      trigger: 'Project milestone'
    },
    {
      id: 'con-2',
      title: 'Budget Overrun Alert',
      description: 'Flag projects approaching or exceeding budget limits',
      category: 'Financial',
      priority: 'high',
      expectedDuration: '4-8 seconds',
      trigger: 'Cost threshold'
    },
    {
      id: 'con-3',
      title: 'Safety Incident Report',
      description: 'Document and analyze safety incidents on site',
      category: 'Safety',
      priority: 'critical',
      expectedDuration: '5-10 seconds',
      trigger: 'Incident report'
    }
  ]
};

export function getSimulationScenarios(context: CoPilotContext): SimulationScenario[] {
  const { industry } = context;
  
  // Try to get industry-specific scenarios
  if (industry && industryScenarios[industry.toLowerCase()]) {
    return industryScenarios[industry.toLowerCase()];
  }
  
  // Default: return general scenarios from finance
  return industryScenarios.finance;
}

export function generateMockRuns(scenarios: SimulationScenario[], count: number = 5): MockRun[] {
  const runs: MockRun[] = [];
  const statuses: MockRun['status'][] = ['completed', 'completed', 'completed', 'running', 'failed'];
  
  for (let i = 0; i < Math.min(count, scenarios.length); i++) {
    const scenario = scenarios[i];
    const status = statuses[i % statuses.length];
    const hoursAgo = Math.floor(Math.random() * 48);
    
    runs.push({
      id: `run-${i}`,
      scenario: scenario.title,
      status,
      duration: Math.floor(Math.random() * 10000) + 1000,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      result: status === 'failed' 
        ? 'Error: Connection timeout' 
        : status === 'running'
        ? 'Processing...'
        : 'Successfully completed',
      kpis: status === 'completed' ? {
        accuracy: Math.random() * 100,
        latency: Math.random() * 1000,
        confidence: Math.random() * 100
      } : undefined
    });
  }
  
  return runs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function generateMockMetrics(context: CoPilotContext): MockMetric[] {
  const baseMetrics: MockMetric[] = [
    {
      name: 'Total Runs',
      value: Math.floor(Math.random() * 10000) + 1000,
      unit: 'runs',
      trend: 'up',
      change: Math.floor(Math.random() * 30) + 5
    },
    {
      name: 'Success Rate',
      value: Math.floor(Math.random() * 15) + 85,
      unit: '%',
      trend: Math.random() > 0.3 ? 'up' : 'down',
      change: Math.floor(Math.random() * 10)
    },
    {
      name: 'Avg Response Time',
      value: Math.floor(Math.random() * 500) + 200,
      unit: 'ms',
      trend: Math.random() > 0.5 ? 'down' : 'up',
      change: Math.floor(Math.random() * 50)
    },
    {
      name: 'Active Workflows',
      value: Math.floor(Math.random() * 20) + 5,
      unit: 'workflows',
      trend: 'stable',
      change: 0
    }
  ];
  
  // Add industry-specific metrics
  if (context.industry === 'finance') {
    baseMetrics.push({
      name: 'Fraud Cases Detected',
      value: Math.floor(Math.random() * 50) + 10,
      unit: 'cases',
      trend: 'up',
      change: Math.floor(Math.random() * 20)
    });
  } else if (context.industry === 'retail') {
    baseMetrics.push({
      name: 'Revenue Impact',
      value: Math.floor(Math.random() * 50000) + 10000,
      unit: '$',
      trend: 'up',
      change: Math.floor(Math.random() * 25)
    });
  }
  
  return baseMetrics;
}

export function generateActivityLog(context: CoPilotContext, count: number = 20): any[] {
  const activities: any[] = [];
  const types = ['workflow', 'integration', 'llm', 'error', 'action'];
  const messages = {
    workflow: ['Workflow triggered', 'Workflow completed', 'Workflow paused'],
    integration: ['API call successful', 'Data fetched', 'External service connected'],
    llm: ['Model invoked', 'Response generated', 'Context updated'],
    error: ['Connection timeout', 'Authentication failed', 'Rate limit exceeded'],
    action: ['Action executed', 'Notification sent', 'Record updated']
  };
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const minutesAgo = Math.floor(Math.random() * 120);
    
    activities.push({
      id: `activity-${i}`,
      type,
      message: messages[type as keyof typeof messages][
        Math.floor(Math.random() * messages[type as keyof typeof messages].length)
      ],
      timestamp: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
      metadata: {
        duration: Math.floor(Math.random() * 5000),
        status: Math.random() > 0.1 ? 'success' : 'error'
      }
    });
  }
  
  return activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
