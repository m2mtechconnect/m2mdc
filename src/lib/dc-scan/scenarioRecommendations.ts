/**
 * Scenario Recommendation Generator
 * 
 * Generates visual, tagged, and contextual scenarios:
 * - Industry-relevant prioritization
 * - Severity classification
 * - Expected impact descriptions
 */

import type { DCScanIndustry } from '@/types/dcScan';
import type { ScenarioRecommendation } from '@/types/enhancedRecommendation';

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  domain: string;
  duration: string;
  expectedImpact: string;
  industryRelevance: DCScanIndustry[];
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  // Workload scenarios
  {
    id: 'gpu-spike',
    name: 'GPU Load Spike',
    description: 'Simulate rapid GPU load surges and observe thermal drift, throttling risk, and carbon impact.',
    severity: 'high',
    category: 'workload',
    domain: 'workload',
    duration: '30 min',
    expectedImpact: 'Tests cooling response and GPU throttling prevention.',
    industryRelevance: ['ai_compute', 'cloud_saas', 'retail', 'manufacturing'],
  },
  {
    id: 'training-job-surge',
    name: 'Training Job Surge',
    description: 'Model sudden increase in AI training workloads across GPU cluster.',
    severity: 'high',
    category: 'workload',
    domain: 'workload',
    duration: '4 hr',
    expectedImpact: 'Validates scheduling fairness and thermal management.',
    industryRelevance: ['ai_compute', 'cloud_saas'],
  },
  {
    id: 'black-friday-peak',
    name: 'Black Friday Peak Load',
    description: 'Simulate 10x traffic surge for e-commerce checkout and fulfillment.',
    severity: 'high',
    category: 'workload',
    domain: 'workload',
    duration: '8 hr',
    expectedImpact: 'Tests elastic scaling and checkout latency targets.',
    industryRelevance: ['retail'],
  },
  {
    id: 'trading-peak-surge',
    name: 'Trading Peak Surge',
    description: 'Model market volatility with extreme trading volume spikes.',
    severity: 'critical',
    category: 'workload',
    domain: 'workload',
    duration: '2 hr',
    expectedImpact: 'Validates sub-millisecond latency under load.',
    industryRelevance: ['finance'],
  },
  
  // Cooling scenarios
  {
    id: 'cooling-failure',
    name: 'Cooling System Failure',
    description: 'Model sudden CRAH/chiller loss and predict failure cascades across racks.',
    severity: 'critical',
    category: 'cooling',
    domain: 'cooling',
    duration: '15 min',
    expectedImpact: 'Tests thermal runaway prevention and workload migration.',
    industryRelevance: ['finance', 'government', 'healthcare', 'ai_compute', 'cloud_saas', 'retail', 'telecom', 'manufacturing', 'energy', 'other'],
  },
  {
    id: 'cold-chain-failure',
    name: 'Cold Chain Failure',
    description: 'Simulate refrigeration failure in logistics data centers.',
    severity: 'critical',
    category: 'cooling',
    domain: 'cooling',
    duration: '30 min',
    expectedImpact: 'Tests perishable inventory protection response.',
    industryRelevance: ['retail', 'healthcare'],
  },
  
  // Power scenarios
  {
    id: 'grid-instability',
    name: 'Grid Instability',
    description: 'Evaluate resilience during renewable fluctuation or brownout conditions.',
    severity: 'high',
    category: 'power',
    domain: 'power',
    duration: '60 min',
    expectedImpact: 'Tests UPS capacity and generator failover timing.',
    industryRelevance: ['energy', 'government', 'healthcare', 'finance', 'telecom'],
  },
  {
    id: 'power-outage',
    name: 'Extended Power Outage',
    description: 'Simulate prolonged utility failure and evaluate UPS/generator endurance.',
    severity: 'critical',
    category: 'power',
    domain: 'power',
    duration: '4 hr',
    expectedImpact: 'Validates fuel reserves and graceful degradation.',
    industryRelevance: ['healthcare', 'government', 'finance', 'telecom'],
  },
  {
    id: 'ups-failure',
    name: 'UPS Failure with Generator Failover',
    description: 'Test transition from UPS to generator during power loss.',
    severity: 'critical',
    category: 'power',
    domain: 'power',
    duration: '10 min',
    expectedImpact: 'Tests transfer switch timing and load shedding.',
    industryRelevance: ['finance', 'healthcare', 'government'],
  },
  
  // Financial scenarios
  {
    id: 'carbon-price-shock',
    name: 'Carbon Price Shock',
    description: 'Quantify operational cost exposure as carbon price increases 50%+.',
    severity: 'medium',
    category: 'financial',
    domain: 'financial',
    duration: '24 hr',
    expectedImpact: 'Forecasts OPEX impact and payback period changes.',
    industryRelevance: ['energy', 'manufacturing', 'retail', 'cloud_saas', 'ai_compute', 'other'],
  },
  {
    id: 'renewable-drop',
    name: 'Renewable Availability Drop',
    description: 'Model grid carbon intensity increase during low renewable output.',
    severity: 'low',
    category: 'financial',
    domain: 'financial',
    duration: '12 hr',
    expectedImpact: 'Tests carbon-aware scheduling effectiveness.',
    industryRelevance: ['energy', 'cloud_saas', 'ai_compute'],
  },
  
  // Sovereignty scenarios
  {
    id: 'sovereignty-breach',
    name: 'Sovereignty Breach Attempt',
    description: 'Test detection and response to unauthorized cross-border data routing.',
    severity: 'critical',
    category: 'sovereignty',
    domain: 'sovereignty',
    duration: '5 min',
    expectedImpact: 'Validates real-time enforcement and alerting.',
    industryRelevance: ['government', 'healthcare', 'finance'],
  },
  {
    id: 'data-residency-violation',
    name: 'Data Residency Violation',
    description: 'Simulate workload accidentally routed outside jurisdiction.',
    severity: 'critical',
    category: 'sovereignty',
    domain: 'sovereignty',
    duration: '10 min',
    expectedImpact: 'Tests compliance enforcement and audit logging.',
    industryRelevance: ['government', 'healthcare', 'finance'],
  },
  
  // Thermal scenarios
  {
    id: 'thermal-runaway',
    name: 'Thermal Runaway',
    description: 'Model cascading thermal failures from hot aisle containment breach.',
    severity: 'critical',
    category: 'thermal',
    domain: 'thermal',
    duration: '20 min',
    expectedImpact: 'Tests emergency shutdown and workload evacuation.',
    industryRelevance: ['ai_compute', 'cloud_saas', 'finance'],
  },
  
  // Network scenarios
  {
    id: 'network-saturation',
    name: 'Network Saturation',
    description: 'Test network resilience under extreme traffic loads and DDoS.',
    severity: 'high',
    category: 'network',
    domain: 'network',
    duration: '30 min',
    expectedImpact: 'Validates QoS enforcement and traffic shaping.',
    industryRelevance: ['retail', 'cloud_saas', 'telecom'],
  },
  {
    id: 'edge-site-overload',
    name: 'Edge Site Overload',
    description: 'Simulate distributed edge site capacity exhaustion.',
    severity: 'high',
    category: 'network',
    domain: 'network',
    duration: '1 hr',
    expectedImpact: 'Tests edge-to-core failover and load balancing.',
    industryRelevance: ['telecom', 'retail'],
  },
];

/**
 * Generate scenario recommendations prioritized by industry
 */
export function generateScenarioRecommendations(
  scenarioIds: string[],
  industry: DCScanIndustry
): ScenarioRecommendation[] {
  const recommendations: ScenarioRecommendation[] = [];
  
  for (const scenarioId of scenarioIds) {
    const normalizedId = normalizeScenarioId(scenarioId);
    const template = SCENARIO_TEMPLATES.find(t => t.id === normalizedId);
    
    if (template) {
      recommendations.push({
        id: template.id,
        name: template.name,
        description: template.description,
        severity: template.severity,
        category: template.category,
        domain: template.domain,
        industryRelevance: template.industryRelevance,
        duration: template.duration,
        expectedImpact: template.expectedImpact,
      });
    } else {
      // Fallback for unknown scenarios
      recommendations.push({
        id: scenarioId,
        name: formatScenarioName(scenarioId),
        description: 'Stress-test operational resilience under specified conditions.',
        severity: 'medium',
        category: 'general',
        domain: 'general',
        industryRelevance: [industry],
        duration: '30 min',
        expectedImpact: 'Tests system response to simulated conditions.',
      });
    }
  }
  
  // Sort: industry-relevant first, then by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => {
    const aRelevant = a.industryRelevance.includes(industry) ? 0 : 1;
    const bRelevant = b.industryRelevance.includes(industry) ? 0 : 1;
    if (aRelevant !== bRelevant) return aRelevant - bRelevant;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Get top scenarios for an industry
 */
export function getTopScenariosForIndustry(industry: DCScanIndustry, count: number = 6): ScenarioTemplate[] {
  return SCENARIO_TEMPLATES
    .filter(s => s.industryRelevance.includes(industry))
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, count);
}

/**
 * Normalize scenario ID to match templates
 */
function normalizeScenarioId(scenarioId: string): string {
  const mappings: Record<string, string> = {
    'gpu_spike_training_cluster': 'gpu-spike',
    'gpu_spike': 'gpu-spike',
    'training_job_surge': 'training-job-surge',
    'black_friday_peak_load': 'black-friday-peak',
    'flash_sale_gpu_spike': 'gpu-spike',
    'trading_peak_surge': 'trading-peak-surge',
    'cooling_cascade_failure': 'cooling-failure',
    'cooling_unit_degradation': 'cooling-failure',
    'cold_chain_failure': 'cold-chain-failure',
    'grid_outage_battery_transition': 'grid-instability',
    'grid_instability': 'grid-instability',
    'power_outage': 'power-outage',
    'ups_failure_generator_failover': 'ups-failure',
    'carbon_price_spike': 'carbon-price-shock',
    'carbon_price_shock': 'carbon-price-shock',
    'renewable_availability_drop': 'renewable-drop',
    'sovereignty_breach_attempt': 'sovereignty-breach',
    'sovereignty_routing_violation': 'sovereignty-breach',
    'thermal_runaway': 'thermal-runaway',
    'thermal_excursion_secure_zone': 'thermal-runaway',
    'network_saturation': 'network-saturation',
    'edge_site_overload': 'edge-site-overload',
  };
  
  return mappings[scenarioId.toLowerCase()] || scenarioId.toLowerCase().replace(/_/g, '-');
}

/**
 * Format scenario ID as display name
 */
function formatScenarioName(scenarioId: string): string {
  return scenarioId
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
