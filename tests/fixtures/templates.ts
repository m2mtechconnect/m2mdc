/**
 * Test fixtures for marketplace templates
 */

export const inventoryOptimizationTemplate = {
  id: 'multi-location-inventory-twin',
  name: 'Multi-Location Inventory Optimization Twin',
  description: 'Digital twin that monitors and optimizes inventory across multiple retail locations in real-time',
  short_description: 'Real-time multi-location inventory optimization',
  industry: 'Retail',
  department: 'Operations',
  twin_type: 'process_twin',
  certified: true,
  rating: 4.8,
  downloads: 342,
  roi_pct: 45,
  roi_hint: 45,
  tags: ['inventory', 'retail', 'optimization', 'multi-location'],
  hero_icon: '📦',
  
  default_config: {
    department: 'Operations',
    useCase: 'Multi-location inventory optimization',
    level: 'Strategic',
    type: 'process_twin',
    goals: [
      'Reduce stockouts by 60%',
      'Minimize overstock by 40%',
      'Improve turnover rate by 35%',
    ],
    selectedModel: 'google/gemini-2.5-flash',
    temperature: 0.3,
    topK: 20,
    topP: 0.95,
    systemPrompt: 'You are an inventory optimization twin that monitors stock levels, predicts demand, and recommends reorder points across multiple retail locations.',
    personaTemplate: 'Data-driven inventory optimization system',
    grounding: true,
    knowledge: true,
    communicationStyle: {
      formal: true,
      emojis: false,
      detailedExplanations: true,
    },
    connectors: ['POS System', 'Warehouse Management', 'Supply Chain API'],
    workflowNodes: [
      {
        type: 'trigger',
        name: 'Stock Level Alert',
        description: 'Triggered when stock falls below threshold',
      },
      {
        type: 'trigger',
        name: 'Daily Optimization',
        description: 'Scheduled daily inventory analysis',
      },
      {
        type: 'action',
        name: 'Analyze Demand',
        description: 'Predict demand based on historical data',
      },
      {
        type: 'action',
        name: 'Generate Reorder',
        description: 'Create optimized purchase orders',
      },
      {
        type: 'action',
        name: 'Transfer Stock',
        description: 'Recommend inter-location transfers',
      },
    ],
  },
  
  // Alternative schema support (from JSON files)
  blueprint: {
    kpis: [
      { name: 'Stockout Reduction', metric: 'percentage', target: 60 },
      { name: 'Overstock Reduction', metric: 'percentage', target: 40 },
      { name: 'Turnover Improvement', metric: 'percentage', target: 35 },
    ],
    integrations: ['POS System', 'Warehouse Management', 'Supply Chain API'],
  },
  
  kpi_definitions: {
    timeSavedPerWeek: '25 hours/week',
    efficiencyGain: '45% improvement',
  },
  
  metrics_defaults: {
    time_saved_per_run_min: 30,
    runs_per_week: 50,
  },
};

export const customerSupportTemplate = {
  id: 'customer-support-ai-agent',
  name: 'Customer Support AI Agent',
  description: 'Intelligent customer support agent that handles inquiries 24/7',
  industry: 'Technology',
  certified: false,
  rating: 4.5,
  downloads: 523,
  roi_pct: 35,
  tags: ['support', 'customer-service', 'chatbot'],
  hero_icon: '💬',
  
  default_config: {
    department: 'Customer Support',
    useCase: 'Automated customer support',
    level: 'Tactical',
    type: 'agent',
    goals: [
      'Reduce response time by 80%',
      'Handle 70% of tickets automatically',
      'Improve CSAT score to 4.5+',
    ],
    selectedModel: 'google/gemini-2.5-flash',
    temperature: 0.7,
    topK: 20,
    topP: 0.95,
    systemPrompt: 'You are a helpful customer support agent. Provide clear, friendly, and accurate responses to customer inquiries.',
    personaTemplate: 'Friendly and professional support assistant',
    grounding: true,
    knowledge: true,
    communicationStyle: {
      formal: false,
      emojis: true,
      detailedExplanations: true,
    },
    connectors: ['Slack', 'Zendesk', 'Knowledge Base API'],
    workflowNodes: [
      {
        type: 'trigger',
        name: 'New Customer Message',
        description: 'Triggered when customer sends message',
      },
      {
        type: 'action',
        name: 'Analyze Intent',
        description: 'Understand customer request',
      },
      {
        type: 'action',
        name: 'Search Knowledge Base',
        description: 'Find relevant information',
      },
      {
        type: 'action',
        name: 'Generate Response',
        description: 'Provide helpful answer',
      },
    ],
  },
  
  kpi_definitions: {
    timeSavedPerWeek: '30 hours/week',
    efficiencyGain: '35% improvement',
  },
};

export const minimalTemplate = {
  id: 'basic-agent',
  name: 'Basic AI Agent',
  description: 'Simple AI agent starter template',
  industry: 'Technology',
  certified: false,
  rating: 4.0,
  downloads: 150,
  roi_pct: 20,
  tags: ['basic', 'starter'],
  
  default_config: {
    type: 'agent',
    goals: ['Automate basic tasks'],
    selectedModel: 'google/gemini-2.5-flash',
    systemPrompt: 'You are a helpful AI assistant.',
    connectors: [],
    workflowNodes: [],
  },
  
  kpi_definitions: {},
};
