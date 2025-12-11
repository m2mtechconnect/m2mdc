/**
 * Industry-Specific Objectives Generator
 * 
 * Generates scan-derived objectives mapped to industry + domain signals.
 * Each industry has tailored objectives based on their operational requirements.
 */

import type { DCScanIndustry, DCScanSignals } from '@/types/dcScan';
import type { IndustryObjective } from '@/types/enhancedRecommendation';

interface ObjectiveTemplate {
  text: string;
  category: 'operational' | 'sustainability' | 'compliance' | 'financial';
  priority: number;
  requiredSignals?: string[]; // Optional signals that must be present
}

const INDUSTRY_OBJECTIVES: Record<DCScanIndustry, ObjectiveTemplate[]> = {
  finance: [
    { text: 'Guarantee 99.99% uptime for core trading and banking systems', category: 'operational', priority: 1 },
    { text: 'Minimize carbon footprint per transaction with real-time emissions tracking', category: 'sustainability', priority: 2 },
    { text: 'Ensure OSFI/PCI-DSS data sovereignty compliance for financial workloads', category: 'compliance', priority: 3 },
    { text: 'Optimize power redundancy during trading hours peaks', category: 'operational', priority: 4 },
    { text: 'Achieve sub-1ms latency for high-frequency trading infrastructure', category: 'operational', priority: 5 },
    { text: 'Reduce regulatory audit risk through automated compliance monitoring', category: 'compliance', priority: 6 },
  ],
  
  government: [
    { text: '100% data residency compliance within Canadian jurisdiction', category: 'compliance', priority: 1 },
    { text: 'Zero unauthorized cross-border data flows with real-time enforcement', category: 'compliance', priority: 2 },
    { text: 'Meet federal net-zero government commitments by 2050', category: 'sustainability', priority: 3 },
    { text: 'Maintain classified workload isolation with air-gapped security zones', category: 'operational', priority: 4 },
    { text: 'Ensure Protected B cloud security certification compliance', category: 'compliance', priority: 5 },
    { text: 'Optimize cooling for secure facility zones with limited airflow', category: 'operational', priority: 6 },
  ],
  
  retail: [
    { text: 'Scale elastically for Black Friday/Cyber Monday peak demand', category: 'operational', priority: 1 },
    { text: 'Minimize carbon per order processed across fulfillment network', category: 'sustainability', priority: 2 },
    { text: 'Maintain sub-100ms checkout latency during traffic surges', category: 'operational', priority: 3 },
    { text: 'Optimize cooling during demand spikes without service degradation', category: 'operational', priority: 4 },
    { text: 'Reduce cold-chain energy consumption across logistics network', category: 'sustainability', priority: 5 },
    { text: 'Ensure PCI-DSS compliance for payment processing systems', category: 'compliance', priority: 6 },
  ],
  
  telecom: [
    { text: 'Ultra-low latency for 5G edge workloads and MEC applications', category: 'operational', priority: 1 },
    { text: 'Distributed cooling optimization across 1000+ edge sites', category: 'operational', priority: 2 },
    { text: 'Minimize tower and edge power consumption per subscriber', category: 'sustainability', priority: 3 },
    { text: 'Carbon-aware traffic routing across network segments', category: 'sustainability', priority: 4 },
    { text: 'Ensure network function virtualization (NFV) resilience', category: 'operational', priority: 5 },
    { text: 'Maintain carrier-grade 99.999% uptime for core network', category: 'operational', priority: 6 },
  ],
  
  cloud_saas: [
    { text: 'Optimize GPU utilization across training and inference workloads', category: 'operational', priority: 1 },
    { text: 'Balance carbon intensity with customer SLA latency requirements', category: 'sustainability', priority: 2 },
    { text: 'Fair resource allocation and isolation across multi-tenant workloads', category: 'operational', priority: 3 },
    { text: 'Minimize idle GPU power consumption during low-demand periods', category: 'sustainability', priority: 4 },
    { text: 'Enable workload migration for carbon-aware scheduling', category: 'sustainability', priority: 5 },
    { text: 'Ensure SOC2/ISO27001 compliance for customer data handling', category: 'compliance', priority: 6 },
  ],
  
  manufacturing: [
    { text: 'Real-time OT data processing with sub-10ms factory floor latency', category: 'operational', priority: 1 },
    { text: 'Seamless integration with OPC-UA/Modbus industrial protocols', category: 'operational', priority: 2 },
    { text: 'Host predictive maintenance AI models with high availability', category: 'operational', priority: 3 },
    { text: 'Carbon tracking per production line and shift', category: 'sustainability', priority: 4 },
    { text: 'Ensure IEC 62443 industrial cybersecurity compliance', category: 'compliance', priority: 5 },
    { text: 'Optimize energy consumption during production shift changes', category: 'sustainability', priority: 6 },
  ],
  
  healthcare: [
    { text: 'HIPAA/PHIPA compliant data handling at all processing points', category: 'compliance', priority: 1 },
    { text: 'Sub-second access to patient imaging and EHR systems', category: 'operational', priority: 2 },
    { text: 'Continuous 99.999% uptime for life-critical clinical systems', category: 'operational', priority: 3 },
    { text: 'Minimize carbon footprint while maintaining N+2 redundancy', category: 'sustainability', priority: 4 },
    { text: 'Ensure patient data sovereignty within provincial jurisdiction', category: 'compliance', priority: 5 },
    { text: 'Support real-time AI diagnostics with GPU-accelerated inference', category: 'operational', priority: 6 },
  ],
  
  energy: [
    { text: 'Real-time grid balancing and demand response capabilities', category: 'operational', priority: 1 },
    { text: 'Maximize renewable energy utilization with smart scheduling', category: 'sustainability', priority: 2 },
    { text: 'Achieve carbon-negative data center operations', category: 'sustainability', priority: 3 },
    { text: 'Maintain grid stability during peak demand and renewables fluctuation', category: 'operational', priority: 4 },
    { text: 'Ensure NERC CIP compliance for critical infrastructure protection', category: 'compliance', priority: 5 },
    { text: 'Optimize battery storage cycling for carbon credit maximization', category: 'financial', priority: 6 },
  ],
  
  ai_compute: [
    { text: 'Optimize GPU fleet utilization for large-scale model training', category: 'operational', priority: 1 },
    { text: 'Minimize carbon per training run through renewable scheduling', category: 'sustainability', priority: 2 },
    { text: 'Enable sovereign AI compute for sensitive model development', category: 'compliance', priority: 3 },
    { text: 'Balance training vs inference workload priorities dynamically', category: 'operational', priority: 4 },
    { text: 'Manage thermal limits during multi-day training jobs', category: 'operational', priority: 5 },
    { text: 'Track and report emissions per model and experiment', category: 'sustainability', priority: 6 },
  ],
  
  other: [
    { text: 'Optimize power usage effectiveness (PUE) toward industry-leading targets', category: 'operational', priority: 1 },
    { text: 'Increase renewable energy share year-over-year', category: 'sustainability', priority: 2 },
    { text: 'Reduce carbon footprint with measurable annual targets', category: 'sustainability', priority: 3 },
    { text: 'Maintain high availability for business-critical workloads', category: 'operational', priority: 4 },
    { text: 'Ensure data sovereignty compliance for regulated data', category: 'compliance', priority: 5 },
    { text: 'Optimize total cost of ownership through efficiency gains', category: 'financial', priority: 6 },
  ],
};

/**
 * Generate industry-specific objectives based on scan signals
 * Returns exactly 4 objectives prioritized for the detected industry
 */
export function generateIndustryObjectives(
  industry: DCScanIndustry,
  companyName: string,
  signals?: DCScanSignals
): IndustryObjective[] {
  const templates = INDUSTRY_OBJECTIVES[industry] || INDUSTRY_OBJECTIVES.other;
  
  // Take top 4 objectives by priority
  const topObjectives = templates
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4);
  
  // Personalize with company name where appropriate
  return topObjectives.map(obj => ({
    text: personalizeObjective(obj.text, companyName),
    category: obj.category,
    priority: obj.priority,
  }));
}

/**
 * Personalize objective text with company name
 */
function personalizeObjective(text: string, companyName: string): string {
  // For generic phrases, we can add context
  // But typically objectives are already company-agnostic
  return text;
}

/**
 * Get all objectives for an industry (for advanced display)
 */
export function getAllIndustryObjectives(industry: DCScanIndustry): ObjectiveTemplate[] {
  return INDUSTRY_OBJECTIVES[industry] || INDUSTRY_OBJECTIVES.other;
}
