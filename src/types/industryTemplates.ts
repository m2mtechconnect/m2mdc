/**
 * Industry Template System
 * Montreal/Walmart Sovereign AI DC Twin is the MASTER TEMPLATE
 * All industries extend from this base
 */

import type { TwinBlueprintBaseSchema } from './twinBlueprintSchema';

/**
 * Supported industries for Digital Twin templates
 */
export type IndustryType = 
  | 'data_centre'
  | 'retail'
  | 'finance'
  | 'healthcare'
  | 'logistics'
  | 'energy'
  | 'manufacturing'
  | 'public_sector'
  | 'maritime'
  | 'agriculture'
  | 'technology_saas'
  | 'telecom';

/**
 * Industry-specific extension that overlays on the base template
 */
export interface IndustryExtension {
  industryType: IndustryType;
  displayName: string;
  description: string;
  
  // Additional KPIs specific to this industry
  additionalKpis: IndustryKPI[];
  
  // Additional agents specific to this industry
  additionalAgents: IndustryAgent[];
  
  // Additional scenarios specific to this industry
  additionalScenarios: IndustryScenario[];
  
  // Domain overrides or additions
  domainOverrides?: Record<string, Partial<IndustryDomain>>;
  
  // Compliance frameworks required for this industry
  complianceFrameworks: string[];
  
  // Sustainability metrics relevant to this industry
  sustainabilityMetrics: string[];
  
  // Financial model customizations
  financialCustomizations?: {
    costCategories?: string[];
    revenueStreams?: string[];
    riskFactors?: string[];
  };
}

export interface IndustryKPI {
  id: string;
  name: string;
  description: string;
  domain: string;
  unit: string;
  targetRange: { min?: number; max?: number; ideal?: number };
  direction: 'higher' | 'lower';
  warningThreshold: number;
  criticalThreshold: number;
}

export interface IndustryAgent {
  id: string;
  name: string;
  description: string;
  domain: string;
  type: 'monitoring' | 'control' | 'analytics' | 'incident';
  inputs: string[];
  outputs: string[];
  toolsUsed: string[];
}

export interface IndustryScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  durationMinutes: number;
  kpiImpacts: { kpiId: string; delta: number }[];
}

export interface IndustryDomain {
  name: string;
  description: string;
  icon: string;
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Registry of all industry extensions
 */
export const INDUSTRY_EXTENSIONS: Record<IndustryType, IndustryExtension> = {
  data_centre: {
    industryType: 'data_centre',
    displayName: 'Sovereign AI Data Centre',
    description: 'Master template for AI-ready data centre digital twins',
    additionalKpis: [], // Base template already has all DC KPIs
    additionalAgents: [],
    additionalScenarios: [],
    complianceFrameworks: ['SOC2', 'ISO27001', 'PIPEDA', 'GDPR'],
    sustainabilityMetrics: ['PUE', 'WUE', 'CUE', 'Carbon Intensity', 'Renewable %'],
  },
  
  retail: {
    industryType: 'retail',
    displayName: 'Retail Hyperscale',
    description: 'Retail-focused data centre with edge, cold-chain, and supply chain focus',
    additionalKpis: [
      { id: 'retail-edge-uptime', name: 'Edge Uptime', description: 'Store edge node availability', domain: 'network', unit: '%', targetRange: { min: 99.9, ideal: 99.99 }, direction: 'higher', warningThreshold: 99.5, criticalThreshold: 99 },
      { id: 'cold-chain-efficiency', name: 'Cold Chain Efficiency', description: 'Refrigeration system efficiency', domain: 'cooling', unit: '%', targetRange: { min: 85, ideal: 95 }, direction: 'higher', warningThreshold: 80, criticalThreshold: 70 },
      { id: 'retail-latency', name: 'POS Latency', description: 'Point of sale transaction latency', domain: 'network', unit: 'ms', targetRange: { max: 50, ideal: 20 }, direction: 'lower', warningThreshold: 75, criticalThreshold: 150 },
    ],
    additionalAgents: [
      { id: 'retail-edge-agent', name: 'Retail Edge Agent', description: 'Manages edge compute nodes across stores', domain: 'network', type: 'monitoring', inputs: ['Edge node status', 'Store metrics'], outputs: ['Edge alerts', 'Failover commands'], toolsUsed: ['Edge orchestrator', 'CDN API'] },
      { id: 'cold-chain-agent', name: 'Cold Chain Agent', description: 'Monitors cold storage and refrigeration', domain: 'cooling', type: 'control', inputs: ['Refrigeration temps', 'Product sensors'], outputs: ['Temperature alerts', 'Defrost commands'], toolsUsed: ['HACCP system', 'IoT sensors'] },
    ],
    additionalScenarios: [
      { id: 'retail-edge-failure', name: 'Regional Edge Failure', description: 'Multiple edge nodes fail in a region', category: 'network', severity: 'critical', durationMinutes: 30, kpiImpacts: [{ kpiId: 'retail-edge-uptime', delta: -2 }, { kpiId: 'retail-latency', delta: 200 }] },
      { id: 'cold-chain-failure', name: 'Cold Chain Compromise', description: 'Refrigeration failure affecting inventory', category: 'cooling', severity: 'emergency', durationMinutes: 60, kpiImpacts: [{ kpiId: 'cold-chain-efficiency', delta: -40 }] },
    ],
    complianceFrameworks: ['PCI-DSS', 'SOC2', 'GDPR', 'CCPA'],
    sustainabilityMetrics: ['PUE', 'Cold Chain Energy', 'Last Mile Carbon'],
  },
  
  finance: {
    industryType: 'finance',
    displayName: 'Financial Services',
    description: 'High-frequency trading and banking infrastructure',
    additionalKpis: [
      { id: 'trade-latency', name: 'Trade Latency', description: 'Order execution latency', domain: 'network', unit: 'μs', targetRange: { max: 100, ideal: 50 }, direction: 'lower', warningThreshold: 150, criticalThreshold: 500 },
      { id: 'market-data-freshness', name: 'Market Data Freshness', description: 'Age of market data feed', domain: 'workload_gpu', unit: 'ms', targetRange: { max: 10, ideal: 1 }, direction: 'lower', warningThreshold: 20, criticalThreshold: 100 },
      { id: 'transaction-integrity', name: 'Transaction Integrity', description: 'Successful transaction rate', domain: 'sovereignty', unit: '%', targetRange: { min: 99.999, ideal: 100 }, direction: 'higher', warningThreshold: 99.99, criticalThreshold: 99.9 },
    ],
    additionalAgents: [
      { id: 'hft-agent', name: 'HFT Infrastructure Agent', description: 'Monitors high-frequency trading systems', domain: 'network', type: 'monitoring', inputs: ['Network latency', 'Order flow'], outputs: ['Latency alerts', 'Route optimization'], toolsUsed: ['FPGA monitoring', 'Network TAPs'] },
      { id: 'fraud-detection-agent', name: 'Fraud Detection Agent', description: 'Real-time fraud pattern detection', domain: 'sovereignty', type: 'analytics', inputs: ['Transaction streams', 'Behavior models'], outputs: ['Fraud alerts', 'Block commands'], toolsUsed: ['ML models', 'Rules engine'] },
    ],
    additionalScenarios: [
      { id: 'flash-crash', name: 'Flash Crash Event', description: 'Rapid market volatility requiring system stability', category: 'workload', severity: 'emergency', durationMinutes: 15, kpiImpacts: [{ kpiId: 'trade-latency', delta: 500 }, { kpiId: 'transaction-integrity', delta: -0.01 }] },
      { id: 'market-data-outage', name: 'Market Data Feed Outage', description: 'Primary market data feed failure', category: 'network', severity: 'critical', durationMinutes: 10, kpiImpacts: [{ kpiId: 'market-data-freshness', delta: 10000 }] },
    ],
    complianceFrameworks: ['SOX', 'PCI-DSS', 'FINRA', 'SEC', 'GDPR'],
    sustainabilityMetrics: ['PUE', 'Carbon per Transaction'],
  },
  
  healthcare: {
    industryType: 'healthcare',
    displayName: 'Healthcare & Life Sciences',
    description: 'Hospital systems, research computing, and patient data',
    additionalKpis: [
      { id: 'patient-data-availability', name: 'Patient Data Availability', description: 'EHR system uptime', domain: 'sovereignty', unit: '%', targetRange: { min: 99.99, ideal: 100 }, direction: 'higher', warningThreshold: 99.9, criticalThreshold: 99 },
      { id: 'imaging-queue-time', name: 'Imaging Queue Time', description: 'Medical imaging processing queue', domain: 'workload_gpu', unit: 'min', targetRange: { max: 5, ideal: 1 }, direction: 'lower', warningThreshold: 10, criticalThreshold: 30 },
      { id: 'hipaa-compliance-score', name: 'HIPAA Compliance Score', description: 'Real-time compliance assessment', domain: 'sovereignty', unit: 'pts', targetRange: { min: 95, ideal: 100 }, direction: 'higher', warningThreshold: 90, criticalThreshold: 80 },
    ],
    additionalAgents: [
      { id: 'ehr-agent', name: 'EHR System Agent', description: 'Monitors electronic health record systems', domain: 'sovereignty', type: 'monitoring', inputs: ['EHR status', 'Access logs'], outputs: ['Availability alerts', 'Compliance reports'], toolsUsed: ['HL7 FHIR', 'Epic API'] },
      { id: 'medical-imaging-agent', name: 'Medical Imaging Agent', description: 'GPU workload for PACS and AI diagnostics', domain: 'workload_gpu', type: 'analytics', inputs: ['DICOM queue', 'GPU utilization'], outputs: ['Queue alerts', 'Priority scheduling'], toolsUsed: ['PACS API', 'NVIDIA Clara'] },
    ],
    additionalScenarios: [
      { id: 'ehr-outage', name: 'EHR System Outage', description: 'Critical patient data system unavailable', category: 'sovereignty', severity: 'emergency', durationMinutes: 30, kpiImpacts: [{ kpiId: 'patient-data-availability', delta: -10 }] },
      { id: 'ransomware-attack', name: 'Ransomware Incident', description: 'Cybersecurity incident affecting patient systems', category: 'sovereignty', severity: 'emergency', durationMinutes: 120, kpiImpacts: [{ kpiId: 'hipaa-compliance-score', delta: -30 }] },
    ],
    complianceFrameworks: ['HIPAA', 'HITECH', 'FDA 21 CFR Part 11', 'PIPEDA'],
    sustainabilityMetrics: ['PUE', 'Medical Waste Reduction', 'Telehealth Carbon Savings'],
  },
  
  logistics: {
    industryType: 'logistics',
    displayName: 'Logistics & Supply Chain',
    description: 'Warehouse automation, fleet management, and supply chain visibility',
    additionalKpis: [
      { id: 'fleet-visibility', name: 'Fleet Visibility', description: 'Tracked vehicles percentage', domain: 'network', unit: '%', targetRange: { min: 99, ideal: 100 }, direction: 'higher', warningThreshold: 95, criticalThreshold: 90 },
      { id: 'warehouse-throughput', name: 'Warehouse Throughput', description: 'Orders processed per hour', domain: 'workload_gpu', unit: '/hr', targetRange: { min: 1000, ideal: 1500 }, direction: 'higher', warningThreshold: 800, criticalThreshold: 500 },
    ],
    additionalAgents: [
      { id: 'fleet-agent', name: 'Fleet Management Agent', description: 'Monitors vehicle fleet and routes', domain: 'network', type: 'monitoring', inputs: ['GPS data', 'Vehicle telemetry'], outputs: ['Route optimization', 'Maintenance alerts'], toolsUsed: ['Fleet API', 'Route optimizer'] },
    ],
    additionalScenarios: [
      { id: 'supply-chain-disruption', name: 'Supply Chain Disruption', description: 'Major supplier or route unavailable', category: 'network', severity: 'critical', durationMinutes: 240, kpiImpacts: [{ kpiId: 'warehouse-throughput', delta: -50 }] },
    ],
    complianceFrameworks: ['C-TPAT', 'AEO', 'ISO28000'],
    sustainabilityMetrics: ['Fleet Carbon', 'Last Mile Efficiency', 'Packaging Waste'],
  },
  
  energy: {
    industryType: 'energy',
    displayName: 'Energy & Utilities',
    description: 'Power generation, grid management, and renewable integration',
    additionalKpis: [
      { id: 'grid-stability', name: 'Grid Stability Index', description: 'Power grid frequency stability', domain: 'power_ups', unit: 'Hz', targetRange: { min: 59.95, max: 60.05, ideal: 60 }, direction: 'higher', warningThreshold: 59.9, criticalThreshold: 59.5 },
      { id: 'renewable-integration', name: 'Renewable Integration', description: 'Renewable sources in energy mix', domain: 'financial_carbon', unit: '%', targetRange: { min: 50, ideal: 100 }, direction: 'higher', warningThreshold: 40, criticalThreshold: 20 },
    ],
    additionalAgents: [
      { id: 'grid-agent', name: 'Grid Management Agent', description: 'Monitors and balances power grid', domain: 'power_ups', type: 'control', inputs: ['Grid sensors', 'Demand forecast'], outputs: ['Load balancing', 'Blackout prevention'], toolsUsed: ['SCADA', 'EMS'] },
    ],
    additionalScenarios: [
      { id: 'grid-instability', name: 'Grid Instability Event', description: 'Frequency deviation requiring emergency response', category: 'power', severity: 'emergency', durationMinutes: 15, kpiImpacts: [{ kpiId: 'grid-stability', delta: -0.5 }] },
    ],
    complianceFrameworks: ['NERC CIP', 'FERC', 'IEC 62351'],
    sustainabilityMetrics: ['Carbon Intensity', 'Renewable %', 'Grid Losses'],
  },
  
  manufacturing: {
    industryType: 'manufacturing',
    displayName: 'Manufacturing & Industry 4.0',
    description: 'Smart factory, production optimization, and quality control',
    additionalKpis: [
      { id: 'oee', name: 'Overall Equipment Effectiveness', description: 'Production line efficiency', domain: 'workload_gpu', unit: '%', targetRange: { min: 85, ideal: 95 }, direction: 'higher', warningThreshold: 80, criticalThreshold: 70 },
      { id: 'defect-rate', name: 'Defect Rate', description: 'Products failing quality check', domain: 'workload_gpu', unit: 'ppm', targetRange: { max: 100, ideal: 10 }, direction: 'lower', warningThreshold: 200, criticalThreshold: 500 },
    ],
    additionalAgents: [
      { id: 'production-agent', name: 'Production Line Agent', description: 'Monitors manufacturing equipment', domain: 'workload_gpu', type: 'monitoring', inputs: ['PLC data', 'Sensor feeds'], outputs: ['Maintenance alerts', 'Quality flags'], toolsUsed: ['OPC-UA', 'MES'] },
    ],
    additionalScenarios: [
      { id: 'production-halt', name: 'Production Line Halt', description: 'Critical equipment failure stopping production', category: 'workload', severity: 'critical', durationMinutes: 60, kpiImpacts: [{ kpiId: 'oee', delta: -50 }] },
    ],
    complianceFrameworks: ['ISO 9001', 'ISO 14001', 'IEC 62443'],
    sustainabilityMetrics: ['Energy per Unit', 'Waste Reduction', 'Water Usage'],
  },
  
  public_sector: {
    industryType: 'public_sector',
    displayName: 'Government & Public Sector',
    description: 'Government services, citizen data, and sovereign computing',
    additionalKpis: [
      { id: 'citizen-service-uptime', name: 'Citizen Service Uptime', description: 'Public-facing service availability', domain: 'network', unit: '%', targetRange: { min: 99.9, ideal: 99.99 }, direction: 'higher', warningThreshold: 99.5, criticalThreshold: 99 },
      { id: 'data-sovereignty-score', name: 'Data Sovereignty Score', description: 'Compliance with data residency requirements', domain: 'sovereignty', unit: 'pts', targetRange: { min: 100, ideal: 100 }, direction: 'higher', warningThreshold: 95, criticalThreshold: 90 },
    ],
    additionalAgents: [
      { id: 'citizen-services-agent', name: 'Citizen Services Agent', description: 'Monitors public service platforms', domain: 'network', type: 'monitoring', inputs: ['Service status', 'User metrics'], outputs: ['Availability alerts', 'Capacity planning'], toolsUsed: ['APM', 'Load balancer'] },
    ],
    additionalScenarios: [
      { id: 'ddos-attack', name: 'DDoS Attack on Services', description: 'Distributed denial of service targeting citizen portals', category: 'network', severity: 'critical', durationMinutes: 60, kpiImpacts: [{ kpiId: 'citizen-service-uptime', delta: -5 }] },
    ],
    complianceFrameworks: ['FedRAMP', 'FISMA', 'StateRAMP', 'PIPEDA'],
    sustainabilityMetrics: ['PUE', 'Citizen Carbon Savings', 'Paper Reduction'],
  },
  
  maritime: {
    industryType: 'maritime',
    displayName: 'Maritime & Shipping',
    description: 'Port operations, vessel tracking, and cargo management',
    additionalKpis: [
      { id: 'port-throughput', name: 'Port Throughput', description: 'Containers processed per hour', domain: 'workload_gpu', unit: '/hr', targetRange: { min: 50, ideal: 100 }, direction: 'higher', warningThreshold: 40, criticalThreshold: 25 },
      { id: 'vessel-ais-coverage', name: 'Vessel AIS Coverage', description: 'Tracked vessels percentage', domain: 'network', unit: '%', targetRange: { min: 99, ideal: 100 }, direction: 'higher', warningThreshold: 95, criticalThreshold: 90 },
    ],
    additionalAgents: [
      { id: 'port-agent', name: 'Port Operations Agent', description: 'Monitors port and terminal operations', domain: 'workload_gpu', type: 'monitoring', inputs: ['Terminal status', 'Vessel schedule'], outputs: ['Berth allocation', 'Delay alerts'], toolsUsed: ['TOS', 'VTS'] },
    ],
    additionalScenarios: [
      { id: 'port-congestion', name: 'Port Congestion Crisis', description: 'Severe vessel backlog at port', category: 'workload', severity: 'critical', durationMinutes: 480, kpiImpacts: [{ kpiId: 'port-throughput', delta: -60 }] },
    ],
    complianceFrameworks: ['ISPS', 'IMO', 'SOLAS'],
    sustainabilityMetrics: ['Shore Power Usage', 'Vessel Emissions', 'Port Carbon'],
  },
  
  agriculture: {
    industryType: 'agriculture',
    displayName: 'Agriculture & AgTech',
    description: 'Smart farming, precision agriculture, and food supply chain',
    additionalKpis: [
      { id: 'crop-yield-prediction', name: 'Crop Yield Accuracy', description: 'AI prediction accuracy for yields', domain: 'workload_gpu', unit: '%', targetRange: { min: 90, ideal: 98 }, direction: 'higher', warningThreshold: 85, criticalThreshold: 75 },
      { id: 'irrigation-efficiency', name: 'Irrigation Efficiency', description: 'Water usage optimization', domain: 'cooling', unit: '%', targetRange: { min: 85, ideal: 95 }, direction: 'higher', warningThreshold: 80, criticalThreshold: 70 },
    ],
    additionalAgents: [
      { id: 'precision-ag-agent', name: 'Precision Agriculture Agent', description: 'Analyzes farm sensor and satellite data', domain: 'workload_gpu', type: 'analytics', inputs: ['Soil sensors', 'Weather data', 'Satellite imagery'], outputs: ['Irrigation commands', 'Fertilizer recommendations'], toolsUsed: ['GIS', 'ML models'] },
    ],
    additionalScenarios: [
      { id: 'drought-response', name: 'Drought Response Mode', description: 'Water scarcity requiring emergency conservation', category: 'cooling', severity: 'critical', durationMinutes: 1440, kpiImpacts: [{ kpiId: 'irrigation-efficiency', delta: -20 }] },
    ],
    complianceFrameworks: ['GlobalGAP', 'FSMA', 'Organic Certification'],
    sustainabilityMetrics: ['Water Usage', 'Fertilizer Efficiency', 'Carbon Sequestration'],
  },
  
  technology_saas: {
    industryType: 'technology_saas',
    displayName: 'Technology & SaaS',
    description: 'Cloud platforms, SaaS applications, and developer infrastructure',
    additionalKpis: [
      { id: 'api-latency-p99', name: 'API Latency P99', description: '99th percentile API response time', domain: 'network', unit: 'ms', targetRange: { max: 100, ideal: 50 }, direction: 'lower', warningThreshold: 150, criticalThreshold: 300 },
      { id: 'deployment-frequency', name: 'Deployment Frequency', description: 'Production deployments per day', domain: 'workload_gpu', unit: '/day', targetRange: { min: 10, ideal: 50 }, direction: 'higher', warningThreshold: 5, criticalThreshold: 1 },
    ],
    additionalAgents: [
      { id: 'platform-agent', name: 'Platform Reliability Agent', description: 'Monitors SaaS platform health', domain: 'network', type: 'monitoring', inputs: ['API metrics', 'Error rates'], outputs: ['Incident alerts', 'Scaling triggers'], toolsUsed: ['APM', 'Observability stack'] },
    ],
    additionalScenarios: [
      { id: 'platform-outage', name: 'Platform-Wide Outage', description: 'Major service disruption affecting customers', category: 'network', severity: 'emergency', durationMinutes: 30, kpiImpacts: [{ kpiId: 'api-latency-p99', delta: 10000 }] },
    ],
    complianceFrameworks: ['SOC2', 'ISO27001', 'GDPR', 'CCPA'],
    sustainabilityMetrics: ['PUE', 'Carbon per Request', 'Green Hosting %'],
  },
  
  telecom: {
    industryType: 'telecom',
    displayName: 'Telecommunications',
    description: '5G infrastructure, network operations, and edge computing',
    additionalKpis: [
      { id: 'network-availability', name: 'Network Availability', description: 'Overall network uptime', domain: 'network', unit: '%', targetRange: { min: 99.999, ideal: 100 }, direction: 'higher', warningThreshold: 99.99, criticalThreshold: 99.9 },
      { id: '5g-coverage', name: '5G Coverage', description: 'Population coverage percentage', domain: 'network', unit: '%', targetRange: { min: 80, ideal: 95 }, direction: 'higher', warningThreshold: 70, criticalThreshold: 50 },
    ],
    additionalAgents: [
      { id: 'noc-agent', name: 'Network Operations Agent', description: 'Monitors telecom network infrastructure', domain: 'network', type: 'monitoring', inputs: ['Network elements', 'Traffic data'], outputs: ['Fault alerts', 'Capacity planning'], toolsUsed: ['NMS', 'OSS/BSS'] },
    ],
    additionalScenarios: [
      { id: 'cell-tower-outage', name: 'Regional Tower Outage', description: 'Multiple cell towers offline in region', category: 'network', severity: 'critical', durationMinutes: 60, kpiImpacts: [{ kpiId: 'network-availability', delta: -0.1 }, { kpiId: '5g-coverage', delta: -15 }] },
    ],
    complianceFrameworks: ['CPNI', 'GDPR', 'FCC', 'ITU'],
    sustainabilityMetrics: ['Network Energy', 'E-Waste', 'Carbon per GB'],
  },
};

/**
 * Get industry extension by type
 */
export function getIndustryExtension(industry: IndustryType): IndustryExtension {
  return INDUSTRY_EXTENSIONS[industry] || INDUSTRY_EXTENSIONS.data_centre;
}

/**
 * Merge industry extension onto base blueprint
 */
export function applyIndustryExtension(
  baseBlueprint: TwinBlueprintBaseSchema,
  industry: IndustryType
): TwinBlueprintBaseSchema {
  const extension = getIndustryExtension(industry);
  
  return {
    ...baseBlueprint,
    metadata: {
      ...baseBlueprint.metadata,
      industry,
      complianceFrameworks: [
        ...(baseBlueprint.metadata.complianceFrameworks || []),
        ...extension.complianceFrameworks,
      ],
    },
    // Additional KPIs from industry extension would be merged here
    industryExtensions: {
      ...baseBlueprint.industryExtensions,
      [industry]: extension,
    },
  };
}

/**
 * Detect industry from URL or company name
 */
export function detectIndustryFromUrl(url: string, companyName?: string): IndustryType {
  const lowerUrl = url.toLowerCase();
  const lowerName = (companyName || '').toLowerCase();
  
  // Retail patterns
  if (
    /walmart|target|costco|tesco|amazon|ebay|shopify|etsy|aliexpress|alibaba/i.test(lowerName) ||
    /shop|store|retail|ecommerce|cart/i.test(lowerUrl)
  ) {
    return 'retail';
  }
  
  // Finance patterns
  if (
    /bank|capital|invest|credit|financial|jpmorgan|goldman|morgan stanley|visa|mastercard/i.test(lowerName) ||
    /bank|finance|trading|invest/i.test(lowerUrl)
  ) {
    return 'finance';
  }
  
  // Healthcare patterns
  if (
    /hospital|health|medical|pharma|clinic|care|medicine/i.test(lowerName) ||
    /health|medical|hospital|clinic|pharma/i.test(lowerUrl)
  ) {
    return 'healthcare';
  }
  
  // Energy patterns
  if (
    /energy|power|utility|electric|gas|solar|wind|renewable/i.test(lowerName) ||
    /energy|power|utility|electric/i.test(lowerUrl)
  ) {
    return 'energy';
  }
  
  // Manufacturing patterns
  if (
    /manufacturing|factory|industrial|automotive|aerospace/i.test(lowerName) ||
    /manufacturing|factory|industrial/i.test(lowerUrl)
  ) {
    return 'manufacturing';
  }
  
  // Government patterns
  if (
    /government|gov|federal|state|city|municipal|ministry/i.test(lowerName) ||
    /\.gov|government|public/i.test(lowerUrl)
  ) {
    return 'public_sector';
  }
  
  // Telecom patterns
  if (
    /telecom|wireless|mobile|verizon|at&t|t-mobile|vodafone/i.test(lowerName) ||
    /telecom|wireless|mobile/i.test(lowerUrl)
  ) {
    return 'telecom';
  }
  
  // Technology/SaaS patterns
  if (
    /software|saas|cloud|tech|digital|app|platform/i.test(lowerName) ||
    /\.io|\.app|\.dev|software|saas|cloud|tech/i.test(lowerUrl)
  ) {
    return 'technology_saas';
  }
  
  // Default to data centre (master template)
  return 'data_centre';
}
