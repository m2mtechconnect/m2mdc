/**
 * Agent Recommendation Generator
 * 
 * Generates agent recommendations with:
 * - One-sentence purpose
 * - Scan-derived rationale (why this company needs it)
 * - Priority classification
 */

import type { DCScanIndustry, DCScanSignals } from '@/types/dcScan';
import type { AgentRecommendation } from '@/types/enhancedRecommendation';

interface AgentTemplate {
  id: string;
  name: string;
  purpose: string;
  domain: string;
  icon: string;
  priority: 'critical' | 'high' | 'recommended' | 'optional';
  rationales: Record<DCScanIndustry, string>;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'thermal-guardian',
    name: 'Thermal Guardian',
    purpose: 'Predicts thermal spikes and adjusts cooling preemptively to prevent GPU throttling.',
    domain: 'thermal',
    icon: 'thermometer',
    priority: 'critical',
    rationales: {
      finance: 'Recommended due to high-density trading infrastructure with tight thermal margins.',
      government: 'Essential for maintaining thermal stability in secure facility zones with limited airflow.',
      retail: 'Critical during Black Friday peaks when GPU-accelerated personalization drives heat loads.',
      telecom: 'Required for distributed edge sites with constrained cooling capacity.',
      cloud_saas: 'Necessary for managing thermal drift during large-scale model training jobs.',
      manufacturing: 'Protects OT compute from thermal excursions on factory floors.',
      healthcare: 'Ensures imaging and diagnostic AI systems maintain thermal stability.',
      energy: 'Manages heat from real-time grid analytics and demand response compute.',
      ai_compute: 'Critical for multi-day training runs that push GPU thermal limits.',
      other: 'Recommended for high-density compute environments.',
    },
  },
  {
    id: 'power-monitor',
    name: 'Power & UPS Monitor',
    purpose: 'Tracks power distribution health and manages failover to ensure uninterrupted operations.',
    domain: 'power',
    icon: 'zap',
    priority: 'critical',
    rationales: {
      finance: 'Essential for zero-downtime trading systems with N+1 power requirements.',
      government: 'Required for Protected B facilities with generator failover compliance.',
      retail: 'Ensures POS and fulfillment systems survive grid instability during peak seasons.',
      telecom: 'Critical for carrier-grade power continuity across network infrastructure.',
      cloud_saas: 'Protects multi-tenant workloads from power quality issues.',
      manufacturing: 'Prevents production line halts from power anomalies.',
      healthcare: 'Life-critical for clinical systems requiring continuous power.',
      energy: 'Manages grid integration and demand response power flows.',
      ai_compute: 'Protects expensive training jobs from power interruptions.',
      other: 'Recommended for any facility requiring high availability.',
    },
  },
  {
    id: 'cooling-optimizer',
    name: 'Cooling Optimization Agent',
    purpose: 'Optimizes chiller and airflow efficiency to reduce PUE and prevent cooling failures.',
    domain: 'cooling',
    icon: 'wind',
    priority: 'high',
    rationales: {
      finance: 'Drives PUE optimization for trading floor data centers.',
      government: 'Balances security zone cooling constraints with efficiency targets.',
      retail: 'Critical for managing rapid thermal changes during traffic spikes.',
      telecom: 'Optimizes distributed cooling across edge and core sites.',
      cloud_saas: 'Essential for maintaining PUE targets at scale.',
      manufacturing: 'Manages cooling for mixed IT/OT environments.',
      healthcare: 'Ensures consistent cooling for sensitive medical imaging equipment.',
      energy: 'Coordinates cooling with renewable availability windows.',
      ai_compute: 'Required for liquid cooling optimization in GPU clusters.',
      other: 'Recommended for improving energy efficiency and reducing costs.',
    },
  },
  {
    id: 'sovereignty-sentinel',
    name: 'Sovereignty Sentinel',
    purpose: 'Detects cross-border data flows and enforces regional data-processing constraints.',
    domain: 'sovereignty',
    icon: 'shield',
    priority: 'high',
    rationales: {
      finance: 'Enforces OSFI data residency requirements for Canadian financial data.',
      government: 'Critical for Protected B data that must remain within Canadian jurisdiction.',
      retail: 'Ensures PCI-DSS and privacy compliance for customer data.',
      telecom: 'Manages data sovereignty for subscriber information.',
      cloud_saas: 'Enforces tenant data residency requirements across regions.',
      manufacturing: 'Protects proprietary OT data from cross-border routing.',
      healthcare: 'Essential for PHIPA/HIPAA patient data sovereignty.',
      energy: 'Protects critical infrastructure data from foreign routing.',
      ai_compute: 'Ensures model training data remains within jurisdiction.',
      other: 'Recommended for any organization with data residency requirements.',
    },
  },
  {
    id: 'carbon-optimizer',
    name: 'Carbon & Cost Optimizer',
    purpose: 'Forecasts emissions and cost exposure based on workload, grid mix, and carbon pricing.',
    domain: 'financial',
    icon: 'dollar-sign',
    priority: 'high',
    rationales: {
      finance: 'Tracks carbon cost exposure for ESG reporting and regulatory compliance.',
      government: 'Supports federal net-zero commitments with emissions tracking.',
      retail: 'Quantifies carbon per order for sustainability reporting.',
      telecom: 'Optimizes carbon footprint across network infrastructure.',
      cloud_saas: 'Enables carbon-aware workload scheduling for sustainability targets.',
      manufacturing: 'Tracks carbon per production line for Scope 1/2/3 reporting.',
      healthcare: 'Balances sustainability with reliability requirements.',
      energy: 'Critical for carbon credit optimization and grid integration.',
      ai_compute: 'Tracks and minimizes carbon per training run.',
      other: 'Recommended for organizations with sustainability commitments.',
    },
  },
  {
    id: 'workload-orchestrator',
    name: 'Workload Orchestrator',
    purpose: 'Balances GPU workloads across racks and optimizes queue times.',
    domain: 'workload',
    icon: 'cpu',
    priority: 'high',
    rationales: {
      finance: 'Manages trading algorithm compute priority and latency.',
      government: 'Schedules workloads across security classification levels.',
      retail: 'Handles elastic scaling for promotional events.',
      telecom: 'Distributes edge and core workloads efficiently.',
      cloud_saas: 'Fair scheduling across multi-tenant GPU resources.',
      manufacturing: 'Coordinates IT and OT workload priorities.',
      healthcare: 'Prioritizes life-critical diagnostic workloads.',
      energy: 'Schedules compute for grid forecasting and demand response.',
      ai_compute: 'Essential for training/inference workload prioritization.',
      other: 'Recommended for environments with mixed workload priorities.',
    },
  },
  {
    id: 'network-sentinel',
    name: 'Network Sentinel',
    purpose: 'Monitors switch saturation, latency spikes, and packet loss to maintain reliability.',
    domain: 'network',
    icon: 'network',
    priority: 'recommended',
    rationales: {
      finance: 'Critical for low-latency trading network monitoring.',
      government: 'Ensures secure network segmentation between classification levels.',
      retail: 'Monitors CDN and checkout infrastructure during peaks.',
      telecom: 'Essential for carrier network health monitoring.',
      cloud_saas: 'Tracks tenant network performance and isolation.',
      manufacturing: 'Monitors OT network health and segmentation.',
      healthcare: 'Ensures reliable connectivity for clinical systems.',
      energy: 'Monitors grid communication networks.',
      ai_compute: 'Tracks GPU cluster interconnect performance.',
      other: 'Recommended for complex network environments.',
    },
  },
  {
    id: 'facility-guardian',
    name: 'Facility Guardian',
    purpose: 'Detects environmental anomalies, fire risks, and water intrusion.',
    domain: 'facility',
    icon: 'building',
    priority: 'recommended',
    rationales: {
      finance: 'Protects trading floor infrastructure from physical threats.',
      government: 'Essential for secure facility safety compliance.',
      retail: 'Monitors distribution center and store data center environments.',
      telecom: 'Protects distributed edge sites from environmental hazards.',
      cloud_saas: 'Standard for multi-tenant facility safety.',
      manufacturing: 'Monitors factory floor environmental conditions.',
      healthcare: 'Ensures clinical environment safety compliance.',
      energy: 'Protects critical infrastructure from physical threats.',
      ai_compute: 'Monitors specialized GPU cluster environments.',
      other: 'Recommended for all data center facilities.',
    },
  },
  {
    id: 'incident-response',
    name: 'Incident Response Agent',
    purpose: 'Coordinates automated responses to critical alerts across all domains.',
    domain: 'facility',
    icon: 'alert-triangle',
    priority: 'recommended',
    rationales: {
      finance: 'Orchestrates rapid response to trading system incidents.',
      government: 'Coordinates security incident response procedures.',
      retail: 'Manages incident response during high-traffic events.',
      telecom: 'Orchestrates network incident remediation.',
      cloud_saas: 'Handles multi-tenant incident isolation and response.',
      manufacturing: 'Coordinates OT and IT incident response.',
      healthcare: 'Manages clinical system incident escalation.',
      energy: 'Coordinates grid-related incident response.',
      ai_compute: 'Handles training job failures and cluster incidents.',
      other: 'Recommended for comprehensive incident management.',
    },
  },
];

/**
 * Generate agent recommendations with scan-derived rationale
 */
export function generateAgentRecommendations(
  agentIds: string[],
  industry: DCScanIndustry,
  companyName: string,
  signals?: DCScanSignals
): AgentRecommendation[] {
  const recommendations: AgentRecommendation[] = [];
  
  for (const agentId of agentIds) {
    // Map various agent ID formats to templates
    const normalizedId = normalizeAgentId(agentId);
    const template = AGENT_TEMPLATES.find(t => t.id === normalizedId);
    
    if (template) {
      const rationale = template.rationales[industry] || template.rationales.other;
      
      recommendations.push({
        id: template.id,
        name: template.name,
        purpose: template.purpose,
        rationale: personalizeRationale(rationale, companyName),
        domain: template.domain,
        icon: template.icon,
        priority: template.priority,
      });
    } else {
      // Fallback for unknown agents
      recommendations.push({
        id: agentId,
        name: formatAgentName(agentId),
        purpose: 'Monitors and optimizes domain-specific operations.',
        rationale: `Recommended based on ${companyName}'s operational profile.`,
        domain: 'general',
        priority: 'recommended',
      });
    }
  }
  
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, recommended: 2, optional: 3 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Normalize agent ID to match templates
 */
function normalizeAgentId(agentId: string): string {
  const mappings: Record<string, string> = {
    'thermal_guardian': 'thermal-guardian',
    'thermal_agent': 'thermal-guardian',
    'power_monitor': 'power-monitor',
    'power_agent': 'power-monitor',
    'cooling_optimizer': 'cooling-optimizer',
    'cooling_agent': 'cooling-optimizer',
    'sovereignty_sentinel': 'sovereignty-sentinel',
    'sovereignty_agent': 'sovereignty-sentinel',
    'financial_carbon_agent': 'carbon-optimizer',
    'carbon_cost_agent': 'carbon-optimizer',
    'workload_orchestrator': 'workload-orchestrator',
    'workload_gpu_agent': 'workload-orchestrator',
    'gpu_scheduler': 'workload-orchestrator',
    'network_monitor': 'network-sentinel',
    'network_agent': 'network-sentinel',
    'facility_safety': 'facility-guardian',
    'facility_safety_agent': 'facility-guardian',
    'incident_response': 'incident-response',
    'incident_response_agent': 'incident-response',
  };
  
  return mappings[agentId.toLowerCase()] || agentId.toLowerCase().replace(/_/g, '-');
}

/**
 * Format agent ID as display name
 */
function formatAgentName(agentId: string): string {
  return agentId
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bagent\b/i, 'Agent');
}

/**
 * Personalize rationale with company name
 */
function personalizeRationale(rationale: string, companyName: string): string {
  // Could add more sophisticated personalization here
  return rationale;
}
