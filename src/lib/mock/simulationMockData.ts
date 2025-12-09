/**
 * Mock simulation data for AOC Simulation tab
 * Industry-specific scenarios for different agent types
 */

interface MockSimulation {
  id: string;
  agent_id: string;
  user_id: string;
  run_type: string;
  input_query: string;
  output_summary: string;
  status: string;
  duration_ms: number;
  industry: string;
  scenario_label: string;
  created_at: string;
  completed_at: string;
  error: string | null;
}

const bankingComplianceSimulations: Omit<MockSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'High-risk wire transfer flagged for AML',
    input_query: 'Simulate a suspicious $250,000 wire transfer from a high-risk jurisdiction and show how the compliance digital twin would flag and escalate it.',
    output_summary: 'Flagged transaction TXN-98765 ($250,000 USD → Cayman Islands). Risk score: 0.92. Matched OFAC watchlist. Escalated to L2 compliance review with full audit trail. Recommended action: HOLD pending manual review.',
    status: 'completed',
    duration_ms: 5200,
    industry: 'banking',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'KYC/PEP match review',
    input_query: 'Simulate onboarding a new client that partially matches a PEP/sanctions list and show the review workflow.',
    output_summary: 'Client onboarding simulation: Match found against PEP database (85% confidence). Triggered enhanced due diligence workflow. Generated risk assessment report. Status: PENDING manual review by compliance officer. EDD checklist: 12/15 items completed.',
    status: 'completed',
    duration_ms: 6100,
    industry: 'banking',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Regulatory breach backtest',
    input_query: 'Simulate last quarter\'s transactions to detect potential regulatory breaches and summarize top 3 risk findings.',
    output_summary: 'Analyzed 456,789 Q4 transactions. Detected 3 high-risk patterns: (1) 23 transactions exceeded single-transaction reporting threshold without CTR filing, (2) 8 customers showed structured deposit patterns, (3) 5 cross-border wires to high-risk jurisdictions without proper documentation. Generated compliance remediation plan.',
    status: 'completed',
    duration_ms: 7800,
    industry: 'banking',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Stress test - liquidity crisis',
    input_query: 'Simulate a market liquidity crisis and show how the compliance twin would monitor exposure and trigger alerts.',
    output_summary: 'Simulated 30% market drop scenario. Monitored 1,234 client positions. Triggered 45 margin call alerts. Identified 12 clients at risk of forced liquidation. Generated exposure report for risk committee. Total at-risk exposure: $18.5M.',
    status: 'completed',
    duration_ms: 8900,
    industry: 'banking',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Real-time sanctions screening',
    input_query: 'Simulate a batch of 500 transactions and show how many would be flagged for sanctions screening.',
    output_summary: 'Processed 500 simulated transactions. Screened against OFAC, EU, UN sanctions lists. Flagged 3 transactions for review (0.6% hit rate). Average screening time: 245ms per transaction. All flags were false positives after secondary review.',
    status: 'completed',
    duration_ms: 4500,
    industry: 'banking',
    error: null,
  },
];

const bankingRiskSimulations: Omit<MockSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Portfolio stress test',
    input_query: 'Run a stress test on our retail portfolio and list top 5 clients at risk of non-compliance.',
    output_summary: 'Analyzed 2,456 retail credit accounts. Applied 3-sigma stress scenario (unemployment +15%, rates +2%). Identified 5 high-risk accounts with default probabilities ranging from 55% to 78%. Recommended portfolio rebalancing.',
    status: 'completed',
    duration_ms: 9200,
    industry: 'banking',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Credit application - high risk',
    input_query: 'Simulate evaluating a credit application from a high-risk applicant with inconsistent income documentation.',
    output_summary: 'Application #APP-9876 evaluated. Applicant: Self-employed, 2 years history. Requested: $75,000. Risk factors: Inconsistent income, high DTI ratio (48%), recent credit inquiry spike. Credit score: 640. Decision: DECLINED. Recommendation: Reapply after 6 months with consistent income proof.',
    status: 'completed',
    duration_ms: 1850,
    industry: 'banking',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Fraud pattern detection',
    input_query: 'Simulate detecting fraud patterns across 1000 recent applications.',
    output_summary: 'Analyzed 1,000 credit applications. Detected 3 potential fraud rings with 25 flagged applications. Prevented estimated $450K in potential fraud losses.',
    status: 'completed',
    duration_ms: 12400,
    industry: 'banking',
    error: null,
  },
];

const genericSimulations: Omit<MockSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Comprehensive stress test',
    input_query: 'Run a comprehensive stress test on this agent\'s core capabilities.',
    output_summary: 'Executed 50 concurrent test scenarios across all agent capabilities. Success rate: 94%. Average response time: 1.2s. Identified 3 edge cases requiring optimization.',
    status: 'completed',
    duration_ms: 8500,
    industry: 'generic',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Multi-step workflow simulation',
    input_query: 'Simulate a complex multi-step workflow and summarize the decision path.',
    output_summary: 'Executed 7-step workflow simulation. All decision nodes triggered correctly. Total execution time: 3.4s. Generated detailed decision tree with 15 branch points.',
    status: 'completed',
    duration_ms: 3400,
    industry: 'generic',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Performance benchmark',
    input_query: 'Run a performance benchmark with 100 concurrent requests.',
    output_summary: 'Processed 100 concurrent requests. P50: 890ms, P95: 2.1s, P99: 3.8s. Success rate: 98%. Identified throughput limit at ~120 req/s.',
    status: 'completed',
    duration_ms: 15200,
    industry: 'generic',
    error: null,
  },
];

function generateTimestamps(hoursAgo: number, durationMs: number) {
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const completedAt = new Date(createdAt.getTime() + durationMs);
  return {
    created_at: createdAt.toISOString(),
    completed_at: completedAt.toISOString(),
  };
}

export function getMockSimulations(agentId: string, templateId?: string): MockSimulation[] {
  // For Transport Canada twin, use transport-specific scenarios
  if (templateId === 'TRANSPORT_CANADA_TWIN' || templateId?.toLowerCase().includes('transport_canada')) {
    const { getTransportCanadaSimulations } = require('@/lib/mock/transportCanadaMockData');
    return getTransportCanadaSimulations(agentId);
  }

  // For the compliance digital twin, use banking compliance scenarios
  if (agentId === '1af78dfb-035e-4d97-bf15-55d649161058') {
    return bankingComplianceSimulations.map((sim, idx) => ({
      ...sim,
      id: `mock-sim-compliance-${idx}`,
      agent_id: agentId,
      user_id: 'mock-user',
      ...generateTimestamps((idx + 1) * 2, sim.duration_ms),
    }));
  }

  // For credit risk agents, use banking risk scenarios
  if (agentId.includes('credit') || agentId.includes('risk')) {
    return bankingRiskSimulations.map((sim, idx) => ({
      ...sim,
      id: `mock-sim-risk-${idx}`,
      agent_id: agentId,
      user_id: 'mock-user',
      ...generateTimestamps((idx + 1) * 3, sim.duration_ms),
    }));
  }

  // Generic fallback
  return genericSimulations.map((sim, idx) => ({
    ...sim,
    id: `mock-sim-generic-${idx}`,
    agent_id: agentId,
    user_id: 'mock-user',
    ...generateTimestamps((idx + 1) * 4, sim.duration_ms),
  }));
}
