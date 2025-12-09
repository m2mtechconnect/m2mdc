/**
 * Industry-specific simulation templates for digital twins
 * Provides mock KPIs, events, and scenarios for all industries
 */

export type TwinIndustry =
  | 'banking'
  | 'insurance'
  | 'retail'
  | 'manufacturing'
  | 'supply_chain'
  | 'healthcare'
  | 'telecom'
  | 'energy_utilities'
  | 'public_sector'
  | 'education'
  | 'real_estate'
  | 'travel_hospitality'
  | 'government_transport';

export interface SimulationEvent {
  timestampOffsetMin: number;
  type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  label: string;
  details: Record<string, unknown>;
}

export interface SimulationKPI {
  code: string;
  label: string;
  unit: string;
  baseline: number;
  simulated: number;
}

export interface SimulationTemplate {
  industry: TwinIndustry | 'generic';
  title: string;
  description: string;
  defaultQuery: string;
  scenarioSummary: string;
  kpis: SimulationKPI[];
  events: SimulationEvent[];
}

export const SIMULATION_TEMPLATES: Record<TwinIndustry | 'generic', SimulationTemplate> = {
  banking: {
    industry: 'banking',
    title: 'Card Fraud & AML Monitoring',
    description: 'Real-time transaction monitoring for fraud detection and anti-money laundering compliance',
    defaultQuery: 'Simulate a suspicious $250,000 wire transfer from a high-risk jurisdiction and show how the compliance digital twin would flag and escalate it.',
    scenarioSummary: 'Banking compliance twin monitoring wire transfers for fraud and AML violations',
    kpis: [
      { code: 'fraud_detection_rate', label: 'Fraud Detection Rate', unit: '%', baseline: 72, simulated: 94 },
      { code: 'false_positive_rate', label: 'False Positive Rate', unit: '%', baseline: 28, simulated: 8 },
      { code: 'avg_investigation_time', label: 'Avg Investigation Time', unit: 'hours', baseline: 4.5, simulated: 1.2 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'transaction_batch', severity: 'low', label: 'Batch ingested', details: { transactions: 1250, source: 'SWIFT Gateway' } },
      { timestampOffsetMin: 2, type: 'anomaly_detected', severity: 'high', label: 'Suspicious wire flagged', details: { amount: 250000, destination: 'Cayman Islands', riskScore: 0.92 } },
      { timestampOffsetMin: 5, type: 'escalation', severity: 'critical', label: 'OFAC watchlist match', details: { matchType: 'partial', confidence: 0.87, action: 'HOLD' } },
      { timestampOffsetMin: 8, type: 'workflow_complete', severity: 'medium', label: 'Case created for review', details: { caseId: 'AML-2024-98765', assignedTo: 'L2 Compliance' } },
    ],
  },

  insurance: {
    industry: 'insurance',
    title: 'Claims Triage & Fraud Scoring',
    description: 'Automated claims processing with fraud detection and triage prioritization',
    defaultQuery: 'Simulate processing a high-value auto claim with potential fraud indicators and show the triage workflow.',
    scenarioSummary: 'Insurance twin triaging claims and detecting fraud patterns',
    kpis: [
      { code: 'claims_processing_time', label: 'Claims Processing Time', unit: 'days', baseline: 14, simulated: 3 },
      { code: 'fraud_savings', label: 'Fraud Prevention Savings', unit: '$K', baseline: 120, simulated: 450 },
      { code: 'customer_satisfaction', label: 'Customer Satisfaction', unit: '%', baseline: 68, simulated: 89 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'claim_submitted', severity: 'low', label: 'New claim received', details: { claimId: 'CLM-45678', type: 'Auto Collision', amount: 35000 } },
      { timestampOffsetMin: 3, type: 'fraud_check', severity: 'medium', label: 'Fraud indicators detected', details: { indicators: ['Recent policy change', 'Prior claims history'], score: 0.72 } },
      { timestampOffsetMin: 7, type: 'document_analysis', severity: 'low', label: 'Photos analyzed', details: { damageConsistency: 0.85, timestampValid: true } },
      { timestampOffsetMin: 12, type: 'triage_complete', severity: 'high', label: 'Flagged for SIU review', details: { priority: 'High', reason: 'Multiple fraud indicators' } },
    ],
  },

  retail: {
    industry: 'retail',
    title: 'Cart Recovery & Recommendation Twin',
    description: 'Personalized shopping experience with cart abandonment recovery and product recommendations',
    defaultQuery: 'Simulate a customer abandoning a $350 cart and show the recovery workflow with personalized outreach.',
    scenarioSummary: 'Retail twin recovering abandoned carts and driving conversions',
    kpis: [
      { code: 'cart_recovery_rate', label: 'Cart Recovery Rate', unit: '%', baseline: 12, simulated: 34 },
      { code: 'avg_order_value', label: 'Average Order Value', unit: '$', baseline: 85, simulated: 112 },
      { code: 'recommendation_ctr', label: 'Recommendation CTR', unit: '%', baseline: 2.1, simulated: 8.5 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'cart_abandoned', severity: 'low', label: 'Cart abandoned', details: { cartValue: 350, items: 4, customerSegment: 'High Value' } },
      { timestampOffsetMin: 15, type: 'trigger_activated', severity: 'low', label: 'Recovery workflow started', details: { channel: 'Email', template: 'Personalized Offer' } },
      { timestampOffsetMin: 45, type: 'engagement', severity: 'medium', label: 'Email opened', details: { openTime: '2.3 hours', clickedOffer: true } },
      { timestampOffsetMin: 90, type: 'conversion', severity: 'high', label: 'Cart recovered', details: { finalValue: 385, addedItems: 1, discount: '10%' } },
    ],
  },

  manufacturing: {
    industry: 'manufacturing',
    title: 'Production Line OEE & Downtime Twin',
    description: 'Real-time production monitoring with predictive maintenance and OEE optimization',
    defaultQuery: 'Simulate a vibration anomaly on Assembly Line 3 and show the predictive maintenance workflow.',
    scenarioSummary: 'Manufacturing twin optimizing OEE and predicting equipment failures',
    kpis: [
      { code: 'oee', label: 'Overall Equipment Effectiveness', unit: '%', baseline: 65, simulated: 84 },
      { code: 'unplanned_downtime', label: 'Unplanned Downtime', unit: 'hours/month', baseline: 48, simulated: 12 },
      { code: 'maintenance_cost', label: 'Maintenance Cost Reduction', unit: '%', baseline: 0, simulated: 35 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'sensor_reading', severity: 'low', label: 'Sensor data ingested', details: { sensors: 24, line: 'Assembly Line 3', frequency: '100ms' } },
      { timestampOffsetMin: 5, type: 'anomaly_detected', severity: 'high', label: 'Vibration anomaly detected', details: { machine: 'CNC-Mill-07', deviation: '2.3 sigma', trend: 'increasing' } },
      { timestampOffsetMin: 8, type: 'prediction', severity: 'critical', label: 'Failure predicted', details: { component: 'Spindle bearing', probability: 0.89, timeToFailure: '72 hours' } },
      { timestampOffsetMin: 10, type: 'work_order', severity: 'medium', label: 'Maintenance scheduled', details: { workOrderId: 'WO-2024-1234', scheduledFor: 'Next shift', parts: ['Bearing SKF-6205'] } },
    ],
  },

  supply_chain: {
    industry: 'supply_chain',
    title: 'Inventory & ETA Optimization Twin',
    description: 'End-to-end supply chain visibility with demand forecasting and logistics optimization',
    defaultQuery: 'Simulate a supplier delay affecting 3 product lines and show the mitigation workflow.',
    scenarioSummary: 'Supply chain twin optimizing inventory and predicting disruptions',
    kpis: [
      { code: 'inventory_turnover', label: 'Inventory Turnover', unit: 'x/year', baseline: 6.2, simulated: 9.8 },
      { code: 'stockout_rate', label: 'Stockout Rate', unit: '%', baseline: 8.5, simulated: 1.2 },
      { code: 'forecast_accuracy', label: 'Demand Forecast Accuracy', unit: '%', baseline: 72, simulated: 91 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'supplier_alert', severity: 'high', label: 'Supplier delay detected', details: { supplier: 'Acme Parts Co', delay: '5 days', affectedSKUs: 12 } },
      { timestampOffsetMin: 3, type: 'impact_analysis', severity: 'medium', label: 'Impact assessed', details: { productLines: 3, customerOrders: 45, revenue_at_risk: '$125K' } },
      { timestampOffsetMin: 8, type: 'mitigation', severity: 'low', label: 'Alt supplier activated', details: { supplier: 'FastParts Inc', leadTime: '2 days', costPremium: '8%' } },
      { timestampOffsetMin: 15, type: 'resolution', severity: 'low', label: 'Orders rerouted', details: { ordersAffected: 45, newETA: 'On-time', customerNotified: true } },
    ],
  },

  healthcare: {
    industry: 'healthcare',
    title: 'Patient Flow & Triage Twin',
    description: 'Real-time patient flow optimization with triage prioritization and resource allocation',
    defaultQuery: 'Simulate ER surge conditions with 15 simultaneous arrivals and show the triage workflow.',
    scenarioSummary: 'Healthcare twin optimizing patient flow and triage decisions',
    kpis: [
      { code: 'door_to_doc', label: 'Door-to-Doctor Time', unit: 'min', baseline: 45, simulated: 18 },
      { code: 'readmission_rate', label: '30-Day Readmission Rate', unit: '%', baseline: 14.2, simulated: 8.5 },
      { code: 'bed_utilization', label: 'Bed Utilization', unit: '%', baseline: 78, simulated: 92 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'patient_arrival', severity: 'high', label: 'ER surge detected', details: { arrivals: 15, currentCapacity: '85%', estimatedWait: '45 min' } },
      { timestampOffsetMin: 2, type: 'triage', severity: 'critical', label: 'Critical patient identified', details: { patientId: 'P-9876', condition: 'Chest pain', ESI: 2 } },
      { timestampOffsetMin: 5, type: 'resource_allocation', severity: 'medium', label: 'Resources reallocated', details: { bedsFreed: 3, staffReassigned: 2, expectedCapacity: '110%' } },
      { timestampOffsetMin: 12, type: 'flow_optimized', severity: 'low', label: 'Patient flow stabilized', details: { avgWait: '22 min', discharges: 8, admissions: 4 } },
    ],
  },

  telecom: {
    industry: 'telecom',
    title: 'Network Quality & Churn Prevention Twin',
    description: 'Real-time network monitoring with proactive churn prevention and service optimization',
    defaultQuery: 'Simulate a network degradation event affecting 5000 subscribers and show the response workflow.',
    scenarioSummary: 'Telecom twin monitoring network quality and preventing customer churn',
    kpis: [
      { code: 'network_uptime', label: 'Network Uptime', unit: '%', baseline: 99.2, simulated: 99.95 },
      { code: 'churn_rate', label: 'Monthly Churn Rate', unit: '%', baseline: 2.8, simulated: 1.1 },
      { code: 'nps', label: 'Net Promoter Score', unit: 'points', baseline: 32, simulated: 58 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'degradation_detected', severity: 'high', label: 'Network degradation', details: { tower: 'Cell-Tower-445', affectedUsers: 5000, severity: 'Moderate' } },
      { timestampOffsetMin: 3, type: 'churn_risk', severity: 'critical', label: 'High churn risk identified', details: { atRiskCustomers: 125, segment: 'High Value', reason: 'Repeated issues' } },
      { timestampOffsetMin: 8, type: 'proactive_outreach', severity: 'medium', label: 'Retention offers sent', details: { offers: 125, type: 'Data bonus + Credit', value: '$25 avg' } },
      { timestampOffsetMin: 20, type: 'resolution', severity: 'low', label: 'Service restored', details: { MTTR: '20 min', customerSatisfaction: '87%', churnPrevented: 112 } },
    ],
  },

  energy_utilities: {
    industry: 'energy_utilities',
    title: 'Grid Load & Outage Prediction Twin',
    description: 'Smart grid monitoring with load balancing and predictive outage management',
    defaultQuery: 'Simulate a heatwave causing 40% demand surge and show the load balancing workflow.',
    scenarioSummary: 'Energy twin predicting grid load and preventing outages',
    kpis: [
      { code: 'outage_prevention', label: 'Outages Prevented', unit: '%', baseline: 45, simulated: 82 },
      { code: 'peak_demand_reduction', label: 'Peak Demand Reduction', unit: 'MW', baseline: 120, simulated: 340 },
      { code: 'renewable_utilization', label: 'Renewable Utilization', unit: '%', baseline: 28, simulated: 45 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'demand_surge', severity: 'high', label: 'Demand surge detected', details: { increase: '40%', cause: 'Heatwave', peakForecast: '4.2 GW' } },
      { timestampOffsetMin: 5, type: 'load_analysis', severity: 'critical', label: 'Grid stress warning', details: { zones: ['Zone-A', 'Zone-C'], capacity: '95%', timeToOverload: '2 hours' } },
      { timestampOffsetMin: 10, type: 'demand_response', severity: 'medium', label: 'DR program activated', details: { participants: 12500, loadReduction: '180 MW', incentive: '$0.15/kWh' } },
      { timestampOffsetMin: 25, type: 'stabilized', severity: 'low', label: 'Grid stabilized', details: { peakShaved: '340 MW', outagesPrevented: 3, customerImpact: 'None' } },
    ],
  },

  public_sector: {
    industry: 'public_sector',
    title: 'Service Request & Case Management Twin',
    description: 'Citizen service optimization with automated case routing and response management',
    defaultQuery: 'Simulate 500 concurrent citizen service requests during a storm event and show the response workflow.',
    scenarioSummary: 'Public sector twin managing citizen requests and case workflows',
    kpis: [
      { code: 'response_time', label: 'Average Response Time', unit: 'hours', baseline: 72, simulated: 12 },
      { code: 'first_contact_resolution', label: 'First Contact Resolution', unit: '%', baseline: 45, simulated: 78 },
      { code: 'citizen_satisfaction', label: 'Citizen Satisfaction', unit: '%', baseline: 52, simulated: 84 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'surge_detected', severity: 'high', label: 'Request surge', details: { requests: 500, trigger: 'Storm event', categories: ['Roads', 'Power', 'Trees'] } },
      { timestampOffsetMin: 5, type: 'auto_triage', severity: 'medium', label: 'Requests triaged', details: { urgent: 45, standard: 380, informational: 75 } },
      { timestampOffsetMin: 15, type: 'dispatch', severity: 'medium', label: 'Crews dispatched', details: { crews: 12, priority: 'Downed power lines', eta: '45 min' } },
      { timestampOffsetMin: 45, type: 'progress_update', severity: 'low', label: 'Citizens notified', details: { notified: 500, method: 'SMS + App', satisfaction: '91%' } },
    ],
  },

  education: {
    industry: 'education',
    title: 'Student Success & Retention Twin',
    description: 'Early warning system for at-risk students with personalized intervention recommendations',
    defaultQuery: 'Simulate mid-semester analysis identifying 50 at-risk students and show the intervention workflow.',
    scenarioSummary: 'Education twin predicting student success and recommending interventions',
    kpis: [
      { code: 'retention_rate', label: 'Student Retention Rate', unit: '%', baseline: 78, simulated: 91 },
      { code: 'graduation_rate', label: 'On-Time Graduation Rate', unit: '%', baseline: 65, simulated: 82 },
      { code: 'intervention_success', label: 'Intervention Success Rate', unit: '%', baseline: 42, simulated: 74 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'analysis_triggered', severity: 'low', label: 'Mid-semester analysis', details: { students: 2500, dataPoints: 45000, models: ['Engagement', 'Performance', 'Attendance'] } },
      { timestampOffsetMin: 8, type: 'at_risk_identified', severity: 'high', label: 'At-risk students flagged', details: { students: 50, riskLevel: 'High', primaryFactors: ['Attendance', 'Grade trend'] } },
      { timestampOffsetMin: 15, type: 'intervention_plan', severity: 'medium', label: 'Interventions assigned', details: { tutoring: 25, advisorMeeting: 35, peerMentoring: 15 } },
      { timestampOffsetMin: 30, type: 'outreach_complete', severity: 'low', label: 'Students contacted', details: { reached: 48, scheduled: 42, responseRate: '84%' } },
    ],
  },

  real_estate: {
    industry: 'real_estate',
    title: 'Lead-to-Close Mortgage & Co-Buyer Twin',
    description: 'Automated mortgage lead scoring with co-buyer matching and application acceleration',
    defaultQuery: 'Simulate a pre-qualified buyer looking for $400K property and show the matching workflow.',
    scenarioSummary: 'Real estate twin matching buyers and accelerating mortgage closings',
    kpis: [
      { code: 'lead_conversion', label: 'Lead Conversion Rate', unit: '%', baseline: 8, simulated: 22 },
      { code: 'time_to_close', label: 'Average Time to Close', unit: 'days', baseline: 45, simulated: 28 },
      { code: 'match_accuracy', label: 'Property Match Accuracy', unit: '%', baseline: 65, simulated: 89 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'lead_qualified', severity: 'low', label: 'Lead pre-qualified', details: { budget: 400000, preApproval: true, creditScore: 720, preferences: ['3BR', 'Suburban'] } },
      { timestampOffsetMin: 5, type: 'matching', severity: 'medium', label: 'Properties matched', details: { matches: 12, topMatch: '123 Oak St', matchScore: 0.94 } },
      { timestampOffsetMin: 15, type: 'co_buyer_match', severity: 'low', label: 'Co-buyer opportunity', details: { potential: true, poolSize: 3, combinedBudget: 550000 } },
      { timestampOffsetMin: 30, type: 'application_started', severity: 'high', label: 'Mortgage app initiated', details: { lender: 'FastBank', rate: '6.5%', estimatedClose: '28 days' } },
    ],
  },

  travel_hospitality: {
    industry: 'travel_hospitality',
    title: 'Booking Demand & Service Ops Twin',
    description: 'Dynamic pricing optimization with demand forecasting and service quality management',
    defaultQuery: 'Simulate a major event driving 300% demand spike and show the yield management workflow.',
    scenarioSummary: 'Hospitality twin optimizing pricing and predicting demand',
    kpis: [
      { code: 'revpar', label: 'Revenue Per Available Room', unit: '$', baseline: 125, simulated: 185 },
      { code: 'occupancy_rate', label: 'Occupancy Rate', unit: '%', baseline: 72, simulated: 94 },
      { code: 'guest_satisfaction', label: 'Guest Satisfaction', unit: '%', baseline: 78, simulated: 92 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'demand_spike', severity: 'high', label: 'Demand surge detected', details: { trigger: 'Major Conference', demandIncrease: '300%', bookingWindow: '72 hours' } },
      { timestampOffsetMin: 5, type: 'pricing_adjustment', severity: 'medium', label: 'Dynamic pricing activated', details: { rateIncrease: '45%', competitorAnalysis: true, demandElasticity: 0.8 } },
      { timestampOffsetMin: 15, type: 'inventory_optimization', severity: 'low', label: 'Inventory reallocated', details: { premiumRooms: '+20%', standardRooms: '-10%', packages: 'Conference special' } },
      { timestampOffsetMin: 60, type: 'revenue_update', severity: 'low', label: 'Revenue optimized', details: { revPARIncrease: '48%', bookings: 245, avgRate: 185 } },
    ],
  },

  government_transport: {
    industry: 'government_transport',
    title: 'National Multimodal Transport Operations',
    description: 'Real-time monitoring of Canada\'s transportation network across Aviation, Marine, Rail, and Road with safety analytics and regulatory oversight',
    defaultQuery: 'Simulate a coastal storm impacting YVR, YXX, and Port of Vancouver. Show cascading effects on aviation delays, marine vessel holds, and highway closures.',
    scenarioSummary: 'Transport Canada twin monitoring national multimodal operations with incident prediction and compliance automation',
    kpis: [
      { code: 'on_time_performance', label: 'On-Time Performance', unit: '%', baseline: 78, simulated: 91 },
      { code: 'avg_border_wait_min', label: 'Avg Border Wait Time', unit: 'min', baseline: 45, simulated: 28 },
      { code: 'port_congestion_index', label: 'Port Congestion Index', unit: '%', baseline: 72, simulated: 48 },
      { code: 'rail_safety_index', label: 'Rail Safety Risk Index', unit: '%', baseline: 35, simulated: 15 },
      { code: 'incident_rate', label: 'Incident Rate per 1000', unit: 'rate', baseline: 3.2, simulated: 1.8 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'weather_alert', severity: 'high', label: 'Storm warning issued', details: { region: 'BC South Coast', visibility: '2km', wind: '45kts', precip: 'rain' } },
      { timestampOffsetMin: 5, type: 'aviation_impact', severity: 'critical', label: 'Ground stops at YVR', details: { flights_delayed: 23, avg_delay: 45, runway_closures: 1 } },
      { timestampOffsetMin: 10, type: 'marine_impact', severity: 'high', label: 'Vessel holds at Vancouver Port', details: { vessels_waiting: 8, berth_availability: '35%', eta_delays: '6-12h' } },
      { timestampOffsetMin: 15, type: 'road_impact', severity: 'medium', label: 'Highway advisories issued', details: { segments_affected: 4, closures: 1, travel_time_increase: '45min' } },
      { timestampOffsetMin: 25, type: 'coordination', severity: 'low', label: 'Regional ops center activated', details: { agencies: 5, resources_deployed: 12, status: 'monitoring' } },
    ],
  },

  generic: {
    industry: 'generic',
    title: 'Generic Operations Twin – Baseline Simulation',
    description: 'General-purpose digital twin for operations monitoring and workflow automation',
    defaultQuery: 'Run a comprehensive stress test on this agent\'s core capabilities and show the results.',
    scenarioSummary: 'Generic operations twin monitoring workflows and optimizing processes',
    kpis: [
      { code: 'process_efficiency', label: 'Process Efficiency', unit: '%', baseline: 65, simulated: 85 },
      { code: 'error_rate', label: 'Error Rate', unit: '%', baseline: 12, simulated: 3 },
      { code: 'throughput', label: 'Throughput Increase', unit: '%', baseline: 0, simulated: 40 },
    ],
    events: [
      { timestampOffsetMin: 0, type: 'workflow_start', severity: 'low', label: 'Workflow initiated', details: { tasks: 25, complexity: 'Medium', estimatedDuration: '15 min' } },
      { timestampOffsetMin: 5, type: 'checkpoint', severity: 'low', label: 'First checkpoint', details: { completed: 10, remaining: 15, onTrack: true } },
      { timestampOffsetMin: 10, type: 'anomaly', severity: 'medium', label: 'Minor anomaly detected', details: { type: 'Performance degradation', impact: 'Low', autoResolved: true } },
      { timestampOffsetMin: 15, type: 'workflow_complete', severity: 'low', label: 'Workflow completed', details: { success: true, duration: '14.5 min', efficiency: '97%' } },
    ],
  },
};

// Industry label mapping for display
const INDUSTRY_LABELS: Record<string, string> = {
  banking: 'Banking & Financial Services',
  insurance: 'Insurance',
  retail: 'Retail & E-Commerce',
  manufacturing: 'Manufacturing',
  supply_chain: 'Supply Chain & Logistics',
  healthcare: 'Healthcare',
  telecom: 'Telecommunications',
  energy_utilities: 'Energy & Utilities',
  public_sector: 'Public Sector & Government',
  education: 'Education',
  real_estate: 'Real Estate & Mortgage',
  travel_hospitality: 'Travel & Hospitality',
  government_transport: 'Government Transportation',
  generic: 'General Operations',
};

export function getIndustryLabel(industry?: string | null): string {
  if (!industry) return 'General Operations';
  const key = industry.toLowerCase().replace(/[^a-z_]/g, '_');
  return INDUSTRY_LABELS[key] || industry;
}

export function getSimulationTemplateForIndustry(
  industry?: TwinIndustry | string | null
): SimulationTemplate {
  if (!industry) return SIMULATION_TEMPLATES.generic;

  // Normalize industry string
  const normalizedIndustry = industry.toLowerCase().replace(/[^a-z_]/g, '_');

  // Direct match
  if (normalizedIndustry in SIMULATION_TEMPLATES) {
    return SIMULATION_TEMPLATES[normalizedIndustry as TwinIndustry];
  }

  // Loose matching for common variations
  const looseMatches: Record<string, TwinIndustry> = {
    'finance': 'banking',
    'financial': 'banking',
    'financial_services': 'banking',
    'bank': 'banking',
    'fintech': 'banking',
    'ecommerce': 'retail',
    'e_commerce': 'retail',
    'commerce': 'retail',
    'logistics': 'supply_chain',
    'warehouse': 'supply_chain',
    'transportation': 'supply_chain',
    'health': 'healthcare',
    'hospital': 'healthcare',
    'medical': 'healthcare',
    'pharma': 'healthcare',
    'telecommunications': 'telecom',
    'telco': 'telecom',
    'mobile': 'telecom',
    'energy': 'energy_utilities',
    'utilities': 'energy_utilities',
    'power': 'energy_utilities',
    'government': 'public_sector',
    'gov': 'public_sector',
    'municipal': 'public_sector',
    'university': 'education',
    'school': 'education',
    'learning': 'education',
    'property': 'real_estate',
    'mortgage': 'real_estate',
    'housing': 'real_estate',
    'hotel': 'travel_hospitality',
    'travel': 'travel_hospitality',
    'hospitality': 'travel_hospitality',
    'tourism': 'travel_hospitality',
    'airline': 'travel_hospitality',
    'aviation': 'government_transport',
    'airport': 'government_transport',
    'transport_canada': 'government_transport',
    'multimodal': 'government_transport',
    'rail': 'government_transport',
    'marine': 'government_transport',
    'national_transport': 'government_transport',
    'factory': 'manufacturing',
    'production': 'manufacturing',
    'industrial': 'manufacturing',
    'underwriting': 'insurance',
    'claims': 'insurance',
  };

  // Check for loose matches
  for (const [keyword, mappedIndustry] of Object.entries(looseMatches)) {
    if (normalizedIndustry.includes(keyword)) {
      return SIMULATION_TEMPLATES[mappedIndustry];
    }
  }

  return SIMULATION_TEMPLATES.generic;
}
