/**
 * Data Centre Digital Twin - Domain-Specific Tools
 * Pre-configured tools for data centre operations
 */

export interface DataCentreTool {
  id: string;
  name: string;
  description: string;
  category: 'telemetry' | 'model' | 'compliance' | 'integration';
  icon: string;
  config: {
    endpoint?: string;
    protocol?: string;
    refreshInterval?: number;
    permissions?: string[];
  };
}

export const DATA_CENTRE_TOOLS: DataCentreTool[] = [
  // Telemetry Tools
  {
    id: 'power-telemetry',
    name: 'Power Telemetry',
    description: 'Real-time power consumption, PDU metrics, and UPS status monitoring',
    category: 'telemetry',
    icon: 'Zap',
    config: {
      protocol: 'SNMP/Modbus',
      refreshInterval: 5000,
      permissions: ['read:power', 'read:pdu'],
    },
  },
  {
    id: 'cooling-telemetry',
    name: 'Cooling Telemetry',
    description: 'CRAH/CRAC units, chiller status, coolant flow, and zone temperatures',
    category: 'telemetry',
    icon: 'Wind',
    config: {
      protocol: 'BACnet/Modbus',
      refreshInterval: 10000,
      permissions: ['read:cooling', 'read:thermal'],
    },
  },
  {
    id: 'gpu-metrics',
    name: 'GPU Metrics',
    description: 'GPU utilization, memory, temperature, and workload distribution across clusters',
    category: 'telemetry',
    icon: 'Cpu',
    config: {
      protocol: 'NVIDIA DCGM/Prometheus',
      refreshInterval: 1000,
      permissions: ['read:gpu', 'read:compute'],
    },
  },
  {
    id: 'thermal-sensors',
    name: 'Thermal Sensors',
    description: 'Rack inlet/outlet temps, hotspot detection, and airflow monitoring',
    category: 'telemetry',
    icon: 'Thermometer',
    config: {
      protocol: 'IPMI/Redfish',
      refreshInterval: 5000,
      permissions: ['read:thermal', 'read:environmental'],
    },
  },
  {
    id: 'network-fabric',
    name: 'Network Fabric',
    description: 'Switch utilization, InfiniBand metrics, packet errors, and latency',
    category: 'telemetry',
    icon: 'Network',
    config: {
      protocol: 'SNMP/gNMI',
      refreshInterval: 2000,
      permissions: ['read:network', 'read:fabric'],
    },
  },

  // Model Tools
  {
    id: 'pue-model',
    name: 'PUE Calculator',
    description: 'Real-time PUE calculation with trending, forecasting, and optimization suggestions',
    category: 'model',
    icon: 'Calculator',
    config: {
      refreshInterval: 60000,
      permissions: ['read:power', 'read:cooling', 'calculate:pue'],
    },
  },
  {
    id: 'carbon-model',
    name: 'Carbon Footprint Model',
    description: 'gCO₂e/kWh tracking, emissions per GPU-hour, and renewable energy mix',
    category: 'model',
    icon: 'Leaf',
    config: {
      refreshInterval: 300000,
      permissions: ['read:power', 'read:carbon', 'calculate:emissions'],
    },
  },
  {
    id: 'thermal-model',
    name: 'Thermal Prediction Model',
    description: 'Hotspot prediction, thermal runaway detection, and cooling optimization',
    category: 'model',
    icon: 'Flame',
    config: {
      refreshInterval: 30000,
      permissions: ['read:thermal', 'predict:thermal'],
    },
  },
  {
    id: 'financial-model',
    name: 'Financial Model',
    description: 'Cost per GPU-hour, energy cost forecasting, and ROI calculations',
    category: 'model',
    icon: 'DollarSign',
    config: {
      refreshInterval: 3600000,
      permissions: ['read:financial', 'calculate:costs'],
    },
  },

  // Compliance Tools
  {
    id: 'sovereignty-checker',
    name: 'Sovereignty Compliance',
    description: 'Data residency validation, jurisdiction tagging, and cross-border flow detection',
    category: 'compliance',
    icon: 'Shield',
    config: {
      refreshInterval: 60000,
      permissions: ['read:dataflow', 'audit:sovereignty'],
    },
  },
  {
    id: 'audit-logger',
    name: 'Compliance Audit Logger',
    description: 'Immutable audit trail for SOC2, ISO 27001, and regulatory compliance',
    category: 'compliance',
    icon: 'FileCheck',
    config: {
      permissions: ['write:audit', 'read:audit'],
    },
  },

  // Integration Tools
  {
    id: 'dcim-integration',
    name: 'DCIM Integration',
    description: 'Data Centre Infrastructure Management system connectivity',
    category: 'integration',
    icon: 'Database',
    config: {
      endpoint: '/api/dcim',
      permissions: ['read:dcim', 'write:dcim'],
    },
  },
  {
    id: 'k8s-integration',
    name: 'Kubernetes/Slurm',
    description: 'Container orchestration and HPC job scheduler integration',
    category: 'integration',
    icon: 'Layers',
    config: {
      endpoint: '/api/orchestrator',
      permissions: ['read:k8s', 'read:slurm'],
    },
  },
  {
    id: 'prometheus-integration',
    name: 'Prometheus/Grafana',
    description: 'Metrics collection and visualization platform integration',
    category: 'integration',
    icon: 'BarChart',
    config: {
      endpoint: '/api/prometheus',
      permissions: ['read:metrics', 'query:prometheus'],
    },
  },
  {
    id: 'energy-api',
    name: 'Energy Grid API',
    description: 'Real-time grid carbon intensity and energy pricing data',
    category: 'integration',
    icon: 'Activity',
    config: {
      endpoint: '/api/energy-grid',
      permissions: ['read:energy', 'read:carbon'],
    },
  },
];

/**
 * Get tools by category
 */
export function getToolsByCategory(category: DataCentreTool['category']): DataCentreTool[] {
  return DATA_CENTRE_TOOLS.filter(tool => tool.category === category);
}

/**
 * Get all tool IDs
 */
export function getAllToolIds(): string[] {
  return DATA_CENTRE_TOOLS.map(tool => tool.id);
}

/**
 * Get recommended tools for a use case
 */
export function getRecommendedTools(useCase: 'gpu' | 'cooling' | 'power' | 'sovereignty' | 'all'): DataCentreTool[] {
  switch (useCase) {
    case 'gpu':
      return DATA_CENTRE_TOOLS.filter(t => 
        ['gpu-metrics', 'thermal-sensors', 'k8s-integration', 'pue-model'].includes(t.id)
      );
    case 'cooling':
      return DATA_CENTRE_TOOLS.filter(t => 
        ['cooling-telemetry', 'thermal-sensors', 'thermal-model', 'pue-model'].includes(t.id)
      );
    case 'power':
      return DATA_CENTRE_TOOLS.filter(t => 
        ['power-telemetry', 'pue-model', 'carbon-model', 'energy-api'].includes(t.id)
      );
    case 'sovereignty':
      return DATA_CENTRE_TOOLS.filter(t => 
        ['sovereignty-checker', 'audit-logger', 'dcim-integration'].includes(t.id)
      );
    case 'all':
    default:
      return DATA_CENTRE_TOOLS;
  }
}
