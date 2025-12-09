import type { SimulationScenario } from '@/types/playbook';

/**
 * Industry-specific simulation scenario generators
 * Each function returns 10-15 realistic, testable scenarios
 */

export function generateFinanceScenarios(context: string): SimulationScenario[] {
  return [
    {
      id: 'fin-001',
      title: 'Suspicious Wire Transfer Pattern',
      description: 'Multiple high-value wire transfers to new beneficiaries within 24 hours',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Flag for manual review, freeze transactions pending investigation',
      testQuery: 'Check wire transfer to offshore account $250k',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'fin-002',
      title: 'High-Frequency Micro-Transactions',
      description: 'Account executing 100+ transactions under $10 in rapid succession',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Structuring detection alert, AML review triggered',
      testQuery: 'Analyze account with 150 transactions of $9.99 in one hour',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'fin-003',
      title: 'Stale KYC Record Check',
      description: 'Customer KYC documentation over 12 months old attempting large transaction',
      industry: 'finance',
      category: 'normal',
      expectedOutcome: 'Block transaction, trigger KYC renewal workflow',
      testQuery: 'Process $50k transaction for customer with expired KYC',
      expectedDuration: '1 second'
    },
    {
      id: 'fin-004',
      title: 'Cross-Border Payment Anomaly',
      description: 'First-time international transfer to high-risk jurisdiction',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Enhanced due diligence, sanctions screening, compliance review',
      testQuery: 'Verify payment to newly added Iran-based supplier',
      expectedDuration: '3-4 seconds'
    },
    {
      id: 'fin-005',
      title: 'Dormant Account Reactivation',
      description: 'Account inactive for 18 months suddenly receiving large deposit',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Identity verification required, source of funds investigation',
      testQuery: 'Check $100k deposit into dormant account',
      expectedDuration: '2 seconds'
    },
    {
      id: 'fin-006',
      title: 'Rapid Account Opening Velocity',
      description: 'Same applicant opening 5+ accounts in different branches within a week',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Fraud alert, centralized review, potential account freeze',
      testQuery: 'Analyze customer opening multiple accounts rapidly',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'fin-007',
      title: 'ATM Withdrawal Pattern Deviation',
      description: 'Customer usually withdraws $200 weekly, now withdrawing max limit daily',
      industry: 'finance',
      category: 'normal',
      expectedOutcome: 'Behavioral alert, potential compromise check, customer contact',
      testQuery: 'Review unusual ATM activity pattern',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'fin-008',
      title: 'Large Cash Deposit Series',
      description: 'Business making cash deposits just under reporting threshold repeatedly',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'CTR filing, structuring investigation, audit trail',
      testQuery: 'Analyze business with 5 deposits of $9,500 in 10 days',
      expectedDuration: '2 seconds'
    },
    {
      id: 'fin-009',
      title: 'Credit Application Inconsistencies',
      description: 'Loan application with mismatched employment and income verification',
      industry: 'finance',
      category: 'normal',
      expectedOutcome: 'Decline application, request additional documentation',
      testQuery: 'Verify loan application with conflicting data',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'fin-010',
      title: 'PEP (Politically Exposed Person) Match',
      description: 'New customer matches name on PEP watchlist',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Enhanced due diligence, senior management approval, ongoing monitoring',
      testQuery: 'Screen new account holder against PEP database',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'fin-011',
      title: 'Trade Finance Document Mismatch',
      description: 'Letter of credit with inconsistent shipping and invoice dates',
      industry: 'finance',
      category: 'normal',
      expectedOutcome: 'Hold payment, request clarification from parties',
      testQuery: 'Review LC with document discrepancies',
      expectedDuration: '1 second'
    },
    {
      id: 'fin-012',
      title: 'Sudden Credit Limit Increase Request',
      description: 'Customer requesting 5x credit limit increase after 2 months',
      industry: 'finance',
      category: 'edge-case',
      expectedOutcome: 'Financial review, employment verification, fraud check',
      testQuery: 'Process credit increase from $5k to $25k',
      expectedDuration: '2 seconds'
    },
    {
      id: 'fin-013',
      title: 'Merchant Chargeback Spike',
      description: 'Merchant experiencing 20% chargeback rate in past month',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Account review, potential termination, reserve requirement',
      testQuery: 'Analyze merchant with high chargeback volume',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'fin-014',
      title: 'Foreign Exchange Rate Arbitrage',
      description: 'Customer repeatedly converting currency back and forth',
      industry: 'finance',
      category: 'edge-case',
      expectedOutcome: 'Pattern analysis, potential fee adjustment or restriction',
      testQuery: 'Review FX conversion patterns',
      expectedDuration: '1 second'
    },
    {
      id: 'fin-015',
      title: 'Mobile Banking Geolocation Anomaly',
      description: 'Login from New York 10 minutes after login from London',
      industry: 'finance',
      category: 'high-risk',
      expectedOutcome: 'Account lock, security verification, password reset required',
      testQuery: 'Check impossible travel login pattern',
      expectedDuration: '1 second'
    }
  ];
}

export function generateRetailScenarios(context: string): SimulationScenario[] {
  return [
    {
      id: 'ret-001',
      title: 'Sudden Cart Abandonment Spike',
      description: 'Cart abandonment rate jumps from 30% to 75% in one day',
      industry: 'retail',
      category: 'high-risk',
      expectedOutcome: 'Investigate checkout flow, check payment gateway, review pricing',
      testQuery: 'Analyze spike in cart abandonments',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'ret-002',
      title: 'Inventory Supplier Delay',
      description: 'Key supplier notifies of 3-week delay on popular product line',
      industry: 'retail',
      category: 'normal',
      expectedOutcome: 'Alternative supplier sourcing, customer pre-order notifications',
      testQuery: 'Handle inventory shortage for high-demand item',
      expectedDuration: '2 seconds'
    },
    {
      id: 'ret-003',
      title: 'Flash Sale Demand Surge',
      description: 'Product page traffic increases 10x during promotional period',
      industry: 'retail',
      category: 'normal',
      expectedOutcome: 'Scale infrastructure, queue management, stock allocation',
      testQuery: 'Process flash sale traffic spike',
      expectedDuration: '1 second'
    },
    {
      id: 'ret-004',
      title: 'Return Fraud Pattern Detection',
      description: 'Customer returning worn items after 25 days repeatedly',
      industry: 'retail',
      category: 'high-risk',
      expectedOutcome: 'Flag account, tighten return policy enforcement, ban consideration',
      testQuery: 'Review customer with suspicious return pattern',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'ret-005',
      title: 'Product Review Manipulation',
      description: 'Multiple 5-star reviews posted within minutes from new accounts',
      industry: 'retail',
      category: 'normal',
      expectedOutcome: 'Flag reviews, verification required, potential removal',
      testQuery: 'Detect fake product reviews',
      expectedDuration: '2 seconds'
    },
    {
      id: 'ret-006',
      title: 'Competitor Price Undercut',
      description: 'Competitor drops price 20% below your price on key SKUs',
      industry: 'retail',
      category: 'high-risk',
      expectedOutcome: 'Dynamic repricing, margin analysis, promotional strategy',
      testQuery: 'Respond to competitor pricing change',
      expectedDuration: '1 second'
    },
    {
      id: 'ret-007',
      title: 'Seasonal Demand Forecast Miss',
      description: 'Winter apparel demand 40% lower than projected',
      industry: 'retail',
      category: 'normal',
      expectedOutcome: 'Markdown strategy, marketing push, clearance planning',
      testQuery: 'Adjust strategy for demand shortfall',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'ret-008',
      title: 'Marketplace Seller Violation',
      description: 'Third-party seller shipping counterfeit goods',
      industry: 'retail',
      category: 'high-risk',
      expectedOutcome: 'Immediate suspension, customer refunds, legal review',
      testQuery: 'Handle counterfeit product report',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'ret-009',
      title: 'Loyalty Points Redemption Surge',
      description: 'Unusual spike in points redemption concentrated in one hour',
      industry: 'retail',
      category: 'edge-case',
      expectedOutcome: 'Fraud check, account verification, investigate breach',
      testQuery: 'Verify bulk loyalty points redemption',
      expectedDuration: '2 seconds'
    },
    {
      id: 'ret-010',
      title: 'Out-of-Stock Bestseller',
      description: 'Top-selling item stock depletes to zero during peak hours',
      industry: 'retail',
      category: 'normal',
      expectedOutcome: 'Backorder system, notify customers, expedite restocking',
      testQuery: 'Manage stockout of popular item',
      expectedDuration: '1 second'
    },
    {
      id: 'ret-011',
      title: 'Gift Card Balance Inquiry Storm',
      description: 'Thousands of gift card checks in short period',
      industry: 'retail',
      category: 'high-risk',
      expectedOutcome: 'Rate limiting, CAPTCHA enforcement, fraud investigation',
      testQuery: 'Detect gift card scraping attempt',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'ret-012',
      title: 'Shipping Cost Calculation Error',
      description: 'System undercharging shipping by 50% for international orders',
      industry: 'retail',
      category: 'high-risk',
      expectedOutcome: 'Immediate fix, refund policy decision, loss calculation',
      testQuery: 'Correct shipping calculation bug',
      expectedDuration: '1 second'
    }
  ];
}

export function generateManufacturingScenarios(context: string): SimulationScenario[] {
  return [
    {
      id: 'mfg-001',
      title: 'Equipment Downtime Alert',
      description: 'CNC machine temperature exceeds threshold during production',
      industry: 'manufacturing',
      category: 'high-risk',
      expectedOutcome: 'Emergency stop, maintenance call, production rescheduling',
      testQuery: 'Handle overheating equipment alert',
      expectedDuration: '1 second'
    },
    {
      id: 'mfg-002',
      title: 'Quality Control Defect Spike',
      description: 'Defect rate jumps from 2% to 12% in one shift',
      industry: 'manufacturing',
      category: 'high-risk',
      expectedOutcome: 'Halt production, root cause analysis, batch inspection',
      testQuery: 'Investigate quality control failure',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'mfg-003',
      title: 'Raw Material Shortage',
      description: 'Critical component stock drops below safety threshold',
      industry: 'manufacturing',
      category: 'normal',
      expectedOutcome: 'Emergency procurement, production slowdown, notify stakeholders',
      testQuery: 'Manage material shortage scenario',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'mfg-004',
      title: 'Production Line Bottleneck',
      description: 'Assembly station #3 running 40% slower than design speed',
      industry: 'manufacturing',
      category: 'normal',
      expectedOutcome: 'Rebalance workflow, add temp staff, diagnose cause',
      testQuery: 'Optimize bottleneck in production line',
      expectedDuration: '2 seconds'
    },
    {
      id: 'mfg-005',
      title: 'Predictive Maintenance Trigger',
      description: 'Vibration sensor shows bearing wear pattern on conveyor',
      industry: 'manufacturing',
      category: 'normal',
      expectedOutcome: 'Schedule maintenance, order parts, minimize downtime',
      testQuery: 'Process predictive maintenance alert',
      expectedDuration: '1 second'
    },
    {
      id: 'mfg-006',
      title: 'Safety Incident Near-Miss',
      description: 'Forklift proximity sensor triggered 3 times in one hour',
      industry: 'manufacturing',
      category: 'high-risk',
      expectedOutcome: 'Safety review, operator retraining, workflow adjustment',
      testQuery: 'Handle safety near-miss report',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'mfg-007',
      title: 'Energy Consumption Spike',
      description: 'Facility power usage 30% above baseline during off-peak',
      industry: 'manufacturing',
      category: 'edge-case',
      expectedOutcome: 'Equipment audit, identify inefficiencies, cost analysis',
      testQuery: 'Investigate energy usage anomaly',
      expectedDuration: '2 seconds'
    },
    {
      id: 'mfg-008',
      title: 'Supply Chain Disruption',
      description: 'Key supplier factory closure due to weather event',
      industry: 'manufacturing',
      category: 'high-risk',
      expectedOutcome: 'Alternative sourcing, production plan revision, customer notices',
      testQuery: 'Handle supplier disruption event',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'mfg-009',
      title: 'Workforce Absence Surge',
      description: '25% of shift workers call in sick on same day',
      industry: 'manufacturing',
      category: 'normal',
      expectedOutcome: 'Temp staffing, production priority adjustment, overtime authorization',
      testQuery: 'Manage unexpected staffing shortage',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'mfg-010',
      title: 'Inventory Accuracy Mismatch',
      description: 'Physical count differs from system by 15% for key SKU',
      industry: 'manufacturing',
      category: 'normal',
      expectedOutcome: 'Cycle count, investigate discrepancy, system reconciliation',
      testQuery: 'Resolve inventory tracking error',
      expectedDuration: '1 second'
    },
    {
      id: 'mfg-011',
      title: 'Product Recall Trigger',
      description: 'Customer report of potential safety defect in shipped batch',
      industry: 'manufacturing',
      category: 'high-risk',
      expectedOutcome: 'Trace affected units, customer notification, logistics coordination',
      testQuery: 'Execute product recall procedure',
      expectedDuration: '3-4 seconds'
    },
    {
      id: 'mfg-012',
      title: 'Compliance Audit Preparation',
      description: 'ISO certification audit scheduled in 2 weeks',
      industry: 'manufacturing',
      category: 'normal',
      expectedOutcome: 'Document review, process verification, corrective action closure',
      testQuery: 'Prepare for compliance audit',
      expectedDuration: '2 seconds'
    }
  ];
}

export function generateHealthcareScenarios(context: string): SimulationScenario[] {
  return [
    {
      id: 'hc-001',
      title: 'Abnormal Vital Signs Alert',
      description: 'Patient blood pressure 190/110, heart rate 135 bpm',
      industry: 'healthcare',
      category: 'high-risk',
      expectedOutcome: 'Immediate physician notification, escalation protocol, monitoring',
      testQuery: 'Handle critical vital signs alert',
      expectedDuration: '1 second'
    },
    {
      id: 'hc-002',
      title: 'Drug Interaction Conflict',
      description: 'New prescription conflicts with existing medication',
      industry: 'healthcare',
      category: 'high-risk',
      expectedOutcome: 'Block order, alert prescriber, pharmacist review required',
      testQuery: 'Check for drug-drug interaction',
      expectedDuration: '2 seconds'
    },
    {
      id: 'hc-003',
      title: 'Emergency Department Surge',
      description: 'ED visits up 60% due to flu outbreak',
      industry: 'healthcare',
      category: 'normal',
      expectedOutcome: 'Activate surge protocol, call in additional staff, triage adjustment',
      testQuery: 'Manage emergency department capacity crisis',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'hc-004',
      title: 'Missed Appointment Pattern',
      description: 'Patient with chronic condition misses 3 consecutive follow-ups',
      industry: 'healthcare',
      category: 'normal',
      expectedOutcome: 'Care team outreach, social work referral, address barriers',
      testQuery: 'Identify patient engagement risk',
      expectedDuration: '1 second'
    },
    {
      id: 'hc-005',
      title: 'Lab Result Critical Value',
      description: 'Potassium level 6.2 mmol/L (critical high)',
      industry: 'healthcare',
      category: 'high-risk',
      expectedOutcome: 'Immediate call to provider, recheck order, treatment protocol',
      testQuery: 'Process critical lab value alert',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'hc-006',
      title: 'Readmission Risk Prediction',
      description: 'Post-discharge patient scores 85% readmission risk',
      industry: 'healthcare',
      category: 'normal',
      expectedOutcome: 'Home health referral, follow-up scheduling, care coordination',
      testQuery: 'Prevent high-risk readmission',
      expectedDuration: '2 seconds'
    },
    {
      id: 'hc-007',
      title: 'Medical Equipment Malfunction',
      description: 'Infusion pump error code during medication delivery',
      industry: 'healthcare',
      category: 'high-risk',
      expectedOutcome: 'Stop infusion, clinical engineering call, incident report',
      testQuery: 'Handle equipment failure during treatment',
      expectedDuration: '1 second'
    },
    {
      id: 'hc-008',
      title: 'Sepsis Early Warning',
      description: 'Patient SIRS criteria met: fever, tachycardia, elevated WBC',
      industry: 'healthcare',
      category: 'high-risk',
      expectedOutcome: 'Activate sepsis bundle, blood cultures, broad-spectrum antibiotics',
      testQuery: 'Detect early sepsis indicators',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'hc-009',
      title: 'Insurance Authorization Delay',
      description: 'Prior auth required for time-sensitive procedure',
      industry: 'healthcare',
      category: 'normal',
      expectedOutcome: 'Expedite review, peer-to-peer if needed, patient communication',
      testQuery: 'Navigate insurance approval bottleneck',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'hc-010',
      title: 'Fall Risk Assessment',
      description: 'Elderly patient with confusion, recent fall history',
      industry: 'healthcare',
      category: 'normal',
      expectedOutcome: 'Implement fall precautions, bed alarm, frequent rounding',
      testQuery: 'Identify and manage fall risk',
      expectedDuration: '1 second'
    },
    {
      id: 'hc-011',
      title: 'Allergy Mismatch Alert',
      description: 'Order placed for drug listed in allergy history',
      industry: 'healthcare',
      category: 'high-risk',
      expectedOutcome: 'Block order, alert provider, document override if intentional',
      testQuery: 'Prevent allergic reaction from order',
      expectedDuration: '1 second'
    },
    {
      id: 'hc-012',
      title: 'Pandemic Screening Positive',
      description: 'Patient screens positive for infectious disease at entry',
      industry: 'healthcare',
      category: 'high-risk',
      expectedOutcome: 'Isolation protocol, PPE requirement, infection control notification',
      testQuery: 'Activate isolation precautions',
      expectedDuration: '1-2 seconds'
    }
  ];
}

export function generateLogisticsScenarios(context: string): SimulationScenario[] {
  return [
    {
      id: 'log-001',
      title: 'Delivery Route Optimization Failure',
      description: 'Traffic congestion causing 2-hour delays on primary route',
      industry: 'logistics',
      category: 'normal',
      expectedOutcome: 'Dynamic rerouting, customer notifications, ETA updates',
      testQuery: 'Optimize delivery route around traffic',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'log-002',
      title: 'Package Damage During Transit',
      description: 'Fragile shipment shows shock sensor activation',
      industry: 'logistics',
      category: 'high-risk',
      expectedOutcome: 'Inspect package, notify customer, file insurance claim',
      testQuery: 'Handle damaged shipment report',
      expectedDuration: '1 second'
    },
    {
      id: 'log-003',
      title: 'Warehouse Capacity Exceeded',
      description: 'Storage utilization reaches 98% during peak season',
      industry: 'logistics',
      category: 'high-risk',
      expectedOutcome: 'Overflow storage arrangement, expedite outbound, delay inbound',
      testQuery: 'Manage warehouse space shortage',
      expectedDuration: '2 seconds'
    },
    {
      id: 'log-004',
      title: 'Customs Clearance Delay',
      description: 'International shipment held for documentation review',
      industry: 'logistics',
      category: 'normal',
      expectedOutcome: 'Provide missing docs, broker coordination, customer update',
      testQuery: 'Resolve customs hold situation',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'log-005',
      title: 'Driver Shortage During Peak',
      description: '20% of scheduled drivers unavailable on high-volume day',
      industry: 'logistics',
      category: 'high-risk',
      expectedOutcome: 'Contract carrier sourcing, route consolidation, delivery delays',
      testQuery: 'Manage driver capacity crisis',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'log-006',
      title: 'Cold Chain Temperature Breach',
      description: 'Refrigerated truck temperature rises above threshold',
      industry: 'logistics',
      category: 'high-risk',
      expectedOutcome: 'Product quarantine, quality assessment, potential disposal',
      testQuery: 'Handle temperature excursion event',
      expectedDuration: '1 second'
    },
    {
      id: 'log-007',
      title: 'Last-Mile Delivery Failure',
      description: 'Customer not home for 3rd delivery attempt',
      industry: 'logistics',
      category: 'normal',
      expectedOutcome: 'Hold at facility, customer pickup option, reschedule delivery',
      testQuery: 'Resolve multiple failed delivery attempts',
      expectedDuration: '1 second'
    },
    {
      id: 'log-008',
      title: 'Hazmat Handling Violation',
      description: 'Dangerous goods improperly labeled on manifest',
      industry: 'logistics',
      category: 'high-risk',
      expectedOutcome: 'Immediate correction, compliance report, training review',
      testQuery: 'Correct hazmat documentation error',
      expectedDuration: '2 seconds'
    },
    {
      id: 'log-009',
      title: 'Cross-Dock Sorting Error',
      description: 'Packages routed to wrong destination hub',
      industry: 'logistics',
      category: 'normal',
      expectedOutcome: 'Redirect shipments, update tracking, minimize delay',
      testQuery: 'Fix sorting misroute incident',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'log-010',
      title: 'Fleet Vehicle Breakdown',
      description: 'Truck mechanical failure mid-route with time-sensitive cargo',
      industry: 'logistics',
      category: 'high-risk',
      expectedOutcome: 'Dispatch replacement vehicle, transfer cargo, customer communication',
      testQuery: 'Handle vehicle breakdown emergency',
      expectedDuration: '2 seconds'
    }
  ];
}

export function generateConstructionScenarios(context: string): SimulationScenario[] {
  return [
    {
      id: 'con-001',
      title: 'Permit Check Failure',
      description: 'Required electrical permit expired before inspection',
      industry: 'construction',
      category: 'high-risk',
      expectedOutcome: 'Stop work order, permit renewal, reschedule inspection',
      testQuery: 'Verify permit compliance before work',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'con-002',
      title: 'Budget Overrun Alert',
      description: 'Project 25% over budget at 40% completion',
      industry: 'construction',
      category: 'high-risk',
      expectedOutcome: 'Cost analysis, scope revision, stakeholder meeting',
      testQuery: 'Analyze project budget variance',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'con-003',
      title: 'Material Delivery Delay',
      description: 'Steel shipment delayed 2 weeks due to supplier issue',
      industry: 'construction',
      category: 'normal',
      expectedOutcome: 'Schedule adjustment, alternative tasks, client notification',
      testQuery: 'Handle critical path material delay',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'con-004',
      title: 'Safety Violation Observed',
      description: 'Worker without proper PPE on active site',
      industry: 'construction',
      category: 'high-risk',
      expectedOutcome: 'Immediate correction, safety training, incident report',
      testQuery: 'Document and resolve safety violation',
      expectedDuration: '1 second'
    },
    {
      id: 'con-005',
      title: 'Weather Delay Impact',
      description: 'Heavy rain forecast for next 5 days during concrete pour phase',
      industry: 'construction',
      category: 'normal',
      expectedOutcome: 'Accelerate prep work, reschedule pour, update timeline',
      testQuery: 'Adjust schedule for weather delay',
      expectedDuration: '2 seconds'
    },
    {
      id: 'con-006',
      title: 'Quality Inspection Failure',
      description: 'Foundation inspection reveals non-compliant rebar spacing',
      industry: 'construction',
      category: 'high-risk',
      expectedOutcome: 'Rework required, engineer review, delay assessment',
      testQuery: 'Manage inspection failure remediation',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'con-007',
      title: 'Subcontractor No-Show',
      description: 'Plumbing subcontractor fails to arrive on scheduled day',
      industry: 'construction',
      category: 'normal',
      expectedOutcome: 'Contact sub, reschedule, adjust dependent tasks',
      testQuery: 'Handle subcontractor scheduling issue',
      expectedDuration: '1 second'
    },
    {
      id: 'con-008',
      title: 'Design Change Request',
      description: 'Client requests major layout modification mid-project',
      industry: 'construction',
      category: 'high-risk',
      expectedOutcome: 'Impact assessment, change order, timeline/budget revision',
      testQuery: 'Process client change order',
      expectedDuration: '2-3 seconds'
    },
    {
      id: 'con-009',
      title: 'Equipment Breakdown',
      description: 'Primary excavator hydraulic failure during site prep',
      industry: 'construction',
      category: 'normal',
      expectedOutcome: 'Rent replacement equipment, repair scheduling, cost tracking',
      testQuery: 'Resolve equipment downtime',
      expectedDuration: '1-2 seconds'
    },
    {
      id: 'con-010',
      title: 'Utility Strike Near-Miss',
      description: 'Crew digs within 2 feet of unmarked gas line',
      industry: 'construction',
      category: 'high-risk',
      expectedOutcome: 'Stop work, utility company notification, site survey re-check',
      testQuery: 'Handle utility location incident',
      expectedDuration: '1 second'
    }
  ];
}

// Main scenario generator that routes to industry-specific generators
export function generateSimulationScenarios(
  industry: string,
  context: string
): SimulationScenario[] {
  const normalizedIndustry = industry.toLowerCase();
  
  if (normalizedIndustry.includes('financ') || normalizedIndustry.includes('bank')) {
    return generateFinanceScenarios(context);
  }
  if (normalizedIndustry.includes('retail') || normalizedIndustry.includes('ecommerce')) {
    return generateRetailScenarios(context);
  }
  if (normalizedIndustry.includes('manufact') || normalizedIndustry.includes('production')) {
    return generateManufacturingScenarios(context);
  }
  if (normalizedIndustry.includes('health') || normalizedIndustry.includes('medical')) {
    return generateHealthcareScenarios(context);
  }
  if (normalizedIndustry.includes('logistic') || normalizedIndustry.includes('supply') || normalizedIndustry.includes('transport')) {
    return generateLogisticsScenarios(context);
  }
  if (normalizedIndustry.includes('construction') || normalizedIndustry.includes('building')) {
    return generateConstructionScenarios(context);
  }
  
  // Default fallback: return generic scenarios
  return generateFinanceScenarios(context).slice(0, 10);
}
