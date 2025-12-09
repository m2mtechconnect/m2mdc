/**
 * Sovereign Green AI Data Centre Twin - Template Definition
 * Complete marketplace template configuration
 */

import type { SovereignDCTemplateConfig } from '@/types/sovereignDataCenterTwin';
import { telusSovereignFacility, prairieMegaFacility } from './mockData';

export const SOVEREIGN_DC_TEMPLATE_ID = 'sovereign-data-center-twin';

export const sovereignDataCenterTemplateConfig: SovereignDCTemplateConfig = {
  industry: 'Government / Sovereign AI / Data Centres',
  industries: ['Government', 'Technology', 'Data Centres', 'Sovereign AI', 'Sustainability'],
  departments: ['Operations', 'IT Infrastructure', 'Compliance', 'Finance', 'Sustainability'],
  difficulty: 'intermediate',
  estimatedSetupTime: '30–60 minutes',
  enabledModels: {
    energyEmissions: true,
    gpuCapacity: true,
    sovereigntyDataResidency: true,
    financialPolicy: true,
    incidentEmergency: true,
  },
  demoFacilityId: telusSovereignFacility.id,
  defaultCarbonPricePerTon: 65,
  thresholds: {
    pueWarning: 1.4,
    pueCritical: 1.6,
    sovereignRiskWarning: 25,
    sovereignRiskCritical: 50,
    carbonIntensityWarning: 100,
    carbonIntensityCritical: 200,
  },
};

/**
 * Full template definition for database insertion
 */
export const sovereignDataCenterTemplate = {
  id: 'sovereign-data-center-twin',
  name: 'Sovereign Green AI Data Centre Twin',
  description: 'Canada-ready digital twin for AI data centres, simulating energy efficiency, carbon footprint, sovereign compute posture, HPC/GPU capacity, and compliance risks. Includes scenarios such as GPU saturation, cooling failures, carbon price shocks, and cross-border data flow violations. Optimizes operations, emissions, sovereignty, and financial outcomes.',
  category: 'Government / Sovereign AI / Data Centres',
  icon: '🏭',
  
  industry: 'Government',
  department: 'Operations',
  twin_type: 'operational',
  
  certified: true,
  rating: 4.7,
  downloads: 234,
  roi_pct: 28,
  tags: ['digital twin', 'sovereign AI', 'HPC', 'data centre', 'sustainability', 'compliance', 'green energy', 'carbon', 'GPU', 'PUE'],
  difficulty: 'intermediate',
  
  default_config: {
    model: 'google/gemini-2.5-flash',
    provider: 'google',
    temperature: 0.7,
    
    system_prompt: `You are the Sovereign Green AI Data Centre Digital Twin assistant. You help operations teams monitor and optimize:
- Energy efficiency (PUE) and carbon footprint
- GPU capacity and workload management
- Data sovereignty and residency compliance
- Financial modeling for green vs gas infrastructure decisions
- Incident response and emergency procedures

Always provide specific, actionable recommendations backed by simulation data. Reference Canadian regulatory requirements (PIPEDA, provincial data laws) when relevant.`,

    industry: 'Government',
    industries: ['Government', 'Cloud Providers', 'Telco', 'Higher Education HPC', 'Financial Services', 'Healthcare', 'IT Ops', 'Sustainability', 'ESG Compliance'],
    departments: ['Operations', 'IT Infrastructure', 'Compliance', 'Finance', 'Sustainability'],
    
    summary: 'Simulate and optimize the full lifecycle of an AI data centre — from GPU workloads to energy use, emissions, sovereignty, and cost models. The twin evaluates infrastructure decisions (green vs gas), models regulatory impacts, monitors real-time operational KPIs, and provides automated responses for anomalies like PUE spikes, cooling faults, or data residency risks.',
    problem_statement: 'AI data centres face competing pressures: reducing carbon footprint while maintaining computational sovereignty for sensitive government and financial workloads. Traditional monitoring lacks predictive simulation capabilities for energy, emissions, and compliance optimization.',
    
    target_users: [
      { role: 'Data Centre Operators', description: 'Monitors real-time facility performance and responds to operational incidents' },
      { role: 'Cloud & HPC Teams', description: 'Manages GPU clusters, workload scheduling, and capacity planning' },
      { role: 'Sustainability/ESG Officers', description: 'Tracks carbon emissions, renewable mix, and ESG reporting' },
      { role: 'Compliance Teams', description: 'Ensures data sovereignty, PIPEDA compliance, and audit readiness' },
      { role: 'CIOs/CTOs', description: 'Makes strategic decisions on capacity, green investments, and infrastructure' },
      { role: 'Government Regulators', description: 'Validates compliance with Canadian data residency requirements' },
    ],
    
    key_capabilities: [
      'Model GPU clusters, HPC workloads, job queues, utilization, and scheduling',
      'Track PUE, carbon emissions per GPU-hour, and renewable energy mix in real time',
      'Detect & block data sovereignty violations (cross-border routing/storage)',
      'Run financial simulations comparing green, hybrid, and gas data centre strategies',
      'Predict cooling system failures and thermal hotspots',
      'Automate operational mitigation actions (cooling shifts, workload balancing)',
      'Provide ESG-ready reporting for compliance and audits',
    ],
    
    kpi_block: {
      kpis: [
        { key: 'sovereignComputeRatioPct', label: 'Sovereign Compute Ratio', unit: '%', direction: 'higher', target: 98, description: '% of compute executed on Canadian-owned, in-Canada infrastructure' },
        { key: 'effectiveAiPue', label: 'Effective AI PUE', unit: '', direction: 'lower', target: 1.15, description: 'Power efficiency for GPU/HPC clusters (1.0 = perfect)' },
        { key: 'gco2PerGpuHour', label: 'gCO₂e per GPU-hour', unit: 'g CO₂e', direction: 'lower', target: 20, description: 'Carbon footprint of AI training & inference' },
        { key: 'sovereignRiskScore', label: 'Sovereign Risk Score', unit: 'pts', direction: 'lower', target: 10, description: 'Aggregated measure of residency + compliance exposure (0-100)' },
        { key: 'economicEfficiencyScore', label: 'Economic Efficiency', unit: 'pts', direction: 'higher', target: 90, description: 'Combined score for cost, power, carbon, and GPU utilization' },
      ],
    },
    
    roi_block: {
      headline: 'Drive 20-35% operational cost savings and up to 85% emissions reduction through optimized energy, capacity, and sovereignty management',
      benefits: [
        'Reduce energy costs by 20–35%',
        'Cut emissions by up to 85% with renewable-optimized workload placement',
        'Improve GPU utilization by 25–40%',
        'Reduce sovereignty & compliance audit effort by 70%',
        'Enforce full Canadian data residency & sovereignty',
        'Predict cost and emissions impact of infrastructure choices',
        'Prevent HVAC and power-related outages',
        'Provide unified dashboards for Operations, ESG, and Compliance',
        'Accelerate reporting with automated audit-ready logs',
      ],
      example_impact_estimates: [
        { metric: 'energy_savings', label: 'Energy Cost Reduction', estimated_range: '20-35%', estimated_annual_roi_pct: 25 },
        { metric: 'emissions_reduction', label: 'Emissions Reduction', estimated_range: 'up to 85%', estimated_annual_roi_pct: 18 },
        { metric: 'gpu_utilization', label: 'GPU Utilization Improvement', estimated_range: '25-40%', estimated_annual_roi_pct: 15 },
        { metric: 'compliance_effort', label: 'Compliance Audit Effort Reduction', estimated_range: '70%', estimated_annual_roi_pct: 12 },
      ],
    },
    
    workflows: [
      {
        id: 'wf-gpu-anomaly',
        name: 'GPU Utilization Anomaly',
        trigger: 'GPU cluster utilization exceeds 90% for 15 minutes',
        actions: ['Alert operations team', 'Check cooling systems', 'Prepare overflow capacity'],
        integrations: ['kubernetes', 'dcim', 'pagerduty'],
      },
      {
        id: 'wf-cooling-overheat',
        name: 'Cooling Zone Overheating',
        trigger: 'Cooling zone temperature exceeds target by 3°C',
        actions: ['Activate backup cooling', 'Migrate critical workloads', 'Generate incident report'],
        integrations: ['dcim', 'cooling_api'],
      },
      {
        id: 'wf-sovereignty-violation',
        name: 'Sovereignty Violation Detection',
        trigger: 'Data flow detected to non-sovereign jurisdiction',
        actions: ['Block replication', 'Alert compliance team', 'Audit data flow rules', 'Generate compliance report'],
        integrations: ['data_classification', 'compliance_system'],
      },
      {
        id: 'wf-carbon-shock',
        name: 'Carbon Price Shock Alert',
        trigger: 'Carbon price exceeds configured threshold',
        actions: ['Update financial models', 'Alert FinOps team', 'Generate scenario comparison report'],
        integrations: ['financial_system', 'carbon_api'],
      },
    ],
    
    connectors: [
      { id: 'dcim', name: 'DCIM Integration', description: 'Data centre infrastructure management', status: 'demo' },
      { id: 'kubernetes', name: 'Kubernetes API', description: 'GPU cluster orchestration', status: 'demo' },
      { id: 'power_monitoring', name: 'Power Monitoring', description: 'Real-time energy consumption', status: 'demo' },
      { id: 'grid_api', name: 'Grid Carbon API', description: 'Real-time grid carbon intensity', status: 'demo' },
      { id: 'cooling_api', name: 'Cooling System API', description: 'HVAC and liquid cooling telemetry', status: 'demo' },
    ],
    
    simulation_preview_config: {
      baseline_metrics: {
        // Capacity & Performance
        gpuUtilization: 78,
        activeWorkloads: 142,
        queueDepth: 28,
        memoryUtilization: 72,
        networkThroughput: 340,
        // Energy & Efficiency
        effectiveAiPue: telusSovereignFacility.baseKpis.effectiveAiPue,
        dcie: 78,
        coolingEfficiency: 92,
        powerDraw: 12.4,
        renewableMix: 85,
        upsCapacity: 45,
        upsRuntimeRemaining: 45,
        redundancyLevel: 1,
        // Emissions
        gco2PerGpuHour: telusSovereignFacility.baseKpis.gco2PerGpuHour,
        dailyEmissions: 8.2,
        carbonCredits: 120,
        scope2Emissions: 6.5,
        // Sovereignty & Compliance
        sovereignComputeRatioPct: telusSovereignFacility.baseKpis.sovereignComputeRatioPct,
        sovereignRiskScore: telusSovereignFacility.baseKpis.sovereignRiskScore,
        dataFlowViolations: 0,
        auditReadiness: 94,
        policyCompliance: 98,
        // Financial
        economicEfficiencyScore: telusSovereignFacility.baseKpis.economicEfficiencyScore,
        costPerGpuHour: 0.48,
        carbonCostExposure: 2850,
        revenuePerMW: 12500,
        // Composite Scores
        overallEfficiencyScore: 84,
        sovereigntyScore: 92,
        resilienceScore: 88,
        sustainabilityScore: 86,
      },
      scenarios: [
        {
          id: 'gpu_overload',
          name: 'GPU Overload',
          description: 'H100 cluster hitting 95% utilization during peak LLM training',
          category: 'capacity',
          duration_seconds: 45,
          severity: 'high',
        },
        {
          id: 'cooling_failure',
          name: 'Cooling Stress',
          description: 'Liquid cooling degradation in HPC zone B',
          category: 'incident',
          duration_seconds: 50,
          severity: 'critical',
        },
        {
          id: 'carbon_price_shock',
          name: 'Carbon Price Shock',
          description: 'Financial impact of carbon spike to $200/tonne',
          category: 'financial',
          duration_seconds: 35,
          severity: 'medium',
        },
        {
          id: 'sovereignty_violation',
          name: 'Sovereignty Violation',
          description: 'Data flow detected to non-Canadian jurisdiction',
          category: 'compliance',
          duration_seconds: 40,
          severity: 'critical',
        },
        {
          id: 'power_grid_outage',
          name: 'Grid Instability',
          description: 'Grid fluctuation requiring UPS/generator activation',
          category: 'incident',
          duration_seconds: 55,
          severity: 'high',
        },
        {
          id: 'new_tenant_onboarding',
          name: 'Tenant Expansion',
          description: 'Onboard major Canadian bank requiring 50MW sovereign capacity',
          category: 'capacity',
          duration_seconds: 40,
          severity: 'low',
        },
        {
          id: 'emissions_vs_sovereignty',
          name: 'Renewable Drop',
          description: 'Impact when renewable energy mix drops from 85% to 45%',
          category: 'emissions',
          duration_seconds: 35,
          severity: 'medium',
        },
        {
          id: 'optimization_run',
          name: 'Optimization Run',
          description: 'AI-driven optimization cycle to improve efficiency scores',
          category: 'optimization',
          duration_seconds: 30,
          severity: 'low',
        },
      ],
      kpi_groups: [
        { id: 'capacity', name: 'Capacity & Performance', keys: ['gpuUtilization', 'activeWorkloads', 'queueDepth', 'memoryUtilization', 'networkThroughput'] },
        { id: 'energy', name: 'Energy & Efficiency', keys: ['effectiveAiPue', 'coolingEfficiency', 'powerDraw', 'renewableMix', 'upsCapacity'] },
        { id: 'emissions', name: 'Emissions', keys: ['gco2PerGpuHour', 'dailyEmissions', 'carbonCredits', 'scope2Emissions'] },
        { id: 'compliance', name: 'Sovereignty & Compliance', keys: ['sovereignComputeRatioPct', 'sovereignRiskScore', 'dataFlowViolations', 'auditReadiness', 'policyCompliance'] },
        { id: 'financial', name: 'Financial', keys: ['economicEfficiencyScore', 'costPerGpuHour', 'carbonCostExposure', 'revenuePerMW'] },
        { id: 'composite', name: 'Composite Scores', keys: ['overallEfficiencyScore', 'sovereigntyScore', 'resilienceScore', 'sustainabilityScore'] },
      ],
      enable_ai_recommendations: true,
      enable_multi_run: true,
      max_run_history: 10,
    },
    
    cloud_metadata: {
      aws: {
        enabled: true,
        region: 'ca-central-1',
        services: ['EC2', 'EKS', 'CloudWatch', 'Timestream', 'Kinesis', 'SageMaker', 'QuickSight'],
        recommended_services: [
          'AWS Graviton for energy-efficient compute',
          'EC2 Inf2 for AI inference workloads',
          'Kinesis Data Streams for GPU/DCIM telemetry',
          'SageMaker for PUE optimization models'
        ],
        twin_services: [
          'Kinesis for GPU/DCIM telemetry ingestion',
          'SageMaker for PUE & emissions optimization',
          'S3 (ca-central-1) for sovereign data storage',
          'QuickSight for KPI dashboards (PUE, gCO₂e, Sovereign Ratio)'
        ],
        deployment_notes: 'Deploy in Montreal (ca-central-1) for Canadian data sovereignty. All data remains within Canadian jurisdiction.',
        cost_estimate: '$8,500-15,000/month',
        sovereignty_certified: true,
      },
      azure: {
        enabled: true,
        region: 'canadacentral',
        services: ['AKS', 'Azure Monitor', 'Time Series Insights', 'Event Hubs', 'Azure ML', 'Power BI'],
        recommended_services: [
          'Azure NC-series for GPU workloads',
          'Azure Arc for hybrid sovereign deployments',
          'Event Hubs for real-time telemetry',
          'Azure ML for carbon intensity forecasting'
        ],
        twin_services: [
          'Event Hubs for real-time GPU & energy telemetry',
          'Azure ML for emissions optimization models',
          'Blob Storage (canadacentral) for sovereign data',
          'Power BI for operational KPI dashboards'
        ],
        deployment_notes: 'Canada Central region for PIPEDA compliance. Azure Government-grade security available.',
        cost_estimate: '$7,800-14,500/month',
        sovereignty_certified: true,
      },
      gcp: {
        enabled: true,
        region: 'northamerica-northeast1',
        services: ['GKE', 'Cloud Monitoring', 'BigQuery', 'Pub/Sub', 'Vertex AI', 'Looker Studio'],
        recommended_services: [
          'A3 VMs for H100 AI workloads',
          'Vertex AI for optimization models',
          'Pub/Sub for telemetry streaming',
          'BigQuery for emissions analytics'
        ],
        twin_services: [
          'Pub/Sub for GPU & energy telemetry ingestion',
          'Vertex AI for carbon intensity forecasting',
          'Cloud Storage (northamerica-northeast1) for sovereign data',
          'Looker Studio for KPI visualization'
        ],
        deployment_notes: 'Montreal region (northamerica-northeast1) recommended. Data never leaves Canadian jurisdiction.',
        cost_estimate: '$8,200-16,000/month',
        sovereignty_certified: true,
      },
    },
    
    preview_sections: {
      overview: {
        hero_summary: 'Sovereign Green AI Data Centre Twin',
        description: 'Canada-ready digital twin for AI data centres, simulating energy efficiency, carbon footprint, sovereign compute posture, HPC/GPU capacity, and compliance risks. Includes scenarios such as GPU saturation, cooling failures, carbon price shocks, and cross-border data flow violations. Optimizes operations, emissions, sovereignty, and financial outcomes.',
        what_you_get: [
          'Enforce full Canadian data residency & sovereignty',
          'Predict cost and emissions impact of infrastructure choices',
          'Prevent HVAC and power-related outages',
          'Provide unified dashboards for Operations, ESG, and Compliance',
          'Accelerate reporting with automated audit-ready logs',
        ],
        how_it_works: {
          connect: 'Connect Data Sources: DCIM/BMS, GPU telemetry, carbon intensity feeds, sovereignty logs, schedulers (Slurm/K8s), energy meters, financial data.',
          workflows: 'Run Agentic Workflows: Real-time monitoring, anomaly detection, emissions forecasting, sovereignty checks, financial simulations, automated responses.',
          decisions: 'Drive Operational Decisions: Optimize clusters, reduce emissions and cost, validate compliance, and guide infrastructure planning with real-time KPIs and scenario models.',
        },
      },
      blueprint: {
        architecture_summary: 'The Sovereign Green AI Data Centre Twin creates a real-time digital replica of HPC/AI data centre operations. It ingests telemetry from DCIM, GPU schedulers, energy systems, and compliance platforms to enable predictive simulation of workload, emissions, sovereignty, and financial outcomes. Five specialized agents collaborate to provide holistic operational intelligence.',
        
        agents: [
          { 
            name: 'Capacity Planning Agent', 
            role: 'GPU & compute capacity optimization',
            description: 'Monitors GPU cluster utilization, predicts capacity needs, and optimizes workload distribution across tenants.',
            data_consumed: ['GPU metrics from Slurm/K8s', 'Tenant allocation data', 'Workload queue depths', 'Historical utilization patterns'],
            outputs: ['Capacity forecasts', 'Workload migration recommendations', 'Tenant onboarding impact analysis', 'Overflow alerts'],
          },
          { 
            name: 'Energy & Emissions Agent', 
            role: 'PUE optimization & carbon tracking',
            description: 'Tracks real-time energy consumption, calculates AI-specific PUE, and monitors carbon intensity per GPU-hour.',
            data_consumed: ['Power meter readings', 'Cooling system telemetry', 'Grid carbon intensity API', 'Renewable energy mix data'],
            outputs: ['PUE trends & anomalies', 'Carbon footprint reports', 'Energy optimization recommendations', 'Green vs gas comparison analysis'],
          },
          { 
            name: 'Sovereignty & Compliance Agent', 
            role: 'Data residency & regulatory compliance',
            description: 'Validates all data flows remain within sovereign jurisdiction and monitors compliance with PIPEDA, provincial laws, and tenant SLAs.',
            data_consumed: ['Data flow logs', 'Replication events', 'Jurisdiction metadata', 'Compliance policy rules'],
            outputs: ['Sovereignty violation alerts', 'Compliance audit trails', 'Data residency reports', 'Regulatory risk scores'],
          },
          { 
            name: 'Financial & Investment Agent', 
            role: 'Cost modeling & investment analysis',
            description: 'Models operational costs, carbon pricing impacts, and compares NPV of green vs traditional infrastructure investments.',
            data_consumed: ['Energy costs', 'Carbon prices', 'CAPEX/OPEX data', 'Infrastructure quotes', 'Tenant revenue'],
            outputs: ['Cost projections', 'ROI scenarios', 'Carbon cost forecasts', 'Green investment business cases'],
          },
          { 
            name: 'Incident & Resilience Agent', 
            role: 'Anomaly detection & incident response',
            description: 'Detects operational anomalies, triggers incident workflows, and tracks MTTR for cooling, power, and workload incidents.',
            data_consumed: ['Sensor alerts', 'Temperature readings', 'Power anomalies', 'Historical incident data'],
            outputs: ['Real-time alerts', 'Incident playbooks', 'MTTR metrics', 'Resilience recommendations'],
          },
        ],
        
        data_sources: [
          {
            name: 'DCIM / BMS Telemetry',
            description: 'Data Centre Infrastructure Management and Building Management System sensors',
            data_provided: ['Rack power draw', 'Cooling zone temperatures', 'Humidity levels', 'PDU metrics', 'UPS status'],
            update_frequency: 'Real-time (1-5 second intervals)',
            usage: 'Primary input for PUE calculation, cooling optimization, and capacity planning',
          },
          {
            name: 'HPC/GPU Cluster Stats',
            description: 'Workload scheduler metrics from Slurm, Kubernetes, or proprietary HPC schedulers',
            data_provided: ['GPU utilization per node', 'Job queue depths', 'Tenant allocations', 'Training/inference split', 'Memory usage'],
            update_frequency: 'Real-time (10-30 second intervals)',
            usage: 'Capacity planning, workload distribution analysis, tenant SLA monitoring',
          },
          {
            name: 'Energy Provider Feeds',
            description: 'Grid electricity data including carbon intensity and renewable mix',
            data_provided: ['Grid carbon intensity (gCO2/kWh)', 'Renewable percentage', 'Spot pricing', 'Demand forecasts'],
            update_frequency: '5-15 minute intervals',
            usage: 'Carbon footprint calculation, green energy optimization, financial modeling',
          },
          {
            name: 'Financial / ERP Systems',
            description: 'Enterprise financial data for cost modeling and investment analysis',
            data_provided: ['Energy invoices', 'CAPEX records', 'Tenant billing', 'Carbon credit transactions'],
            update_frequency: 'Daily batch + real-time billing events',
            usage: 'Cost analysis, ROI calculations, carbon cost projections',
          },
          {
            name: 'Policy & Compliance Sources',
            description: 'Regulatory requirements and internal compliance policies',
            data_provided: ['Data residency rules', 'PIPEDA requirements', 'Provincial regulations', 'Tenant SLA terms'],
            update_frequency: 'On policy change + daily validation',
            usage: 'Sovereignty validation, compliance scoring, audit trail generation',
          },
        ],
        
        integrations: [
          {
            name: 'Kubernetes / Slurm HPC Scheduler',
            type: 'Workload Orchestration',
            description: 'Direct API integration with GPU cluster schedulers for workload visibility and management',
            capabilities: ['Read job queues', 'Monitor GPU allocation', 'Trigger workload migrations', 'Query historical utilization'],
          },
          {
            name: 'Prometheus / Datadog Monitoring',
            type: 'Observability',
            description: 'Metrics collection and alerting platform integration',
            capabilities: ['Ingest time-series metrics', 'Configure alert rules', 'Historical trend analysis', 'Custom dashboards'],
          },
          {
            name: 'Redfish / IPMI',
            type: 'Hardware Management',
            description: 'Server hardware management interface for out-of-band telemetry and control',
            capabilities: ['Read server temps', 'Monitor power draw', 'ECC error detection', 'Remote power control', 'Fan speed monitoring'],
          },
          {
            name: 'SNMP',
            type: 'Network & Infrastructure',
            description: 'Simple Network Management Protocol for PDU, UPS, and network device monitoring',
            capabilities: ['PDU power metrics', 'UPS status & battery health', 'Network device stats', 'HVAC integration', 'Trap-based alerting'],
          },
          {
            name: 'NetBox',
            type: 'Infrastructure Documentation',
            description: 'IP address management and data center infrastructure modeling',
            capabilities: ['Asset inventory', 'Rack layout tracking', 'Cable management', 'IP allocation', 'Power chain documentation'],
          },
          {
            name: 'ServiceNow / JIRA',
            type: 'Incident Management',
            description: 'IT service management for incident tracking and workflow automation',
            capabilities: ['Create incidents', 'Update ticket status', 'Link to playbooks', 'Track MTTR metrics'],
          },
          {
            name: 'SAP / NetSuite ERP',
            type: 'Financial Systems',
            description: 'Enterprise resource planning integration for financial modeling',
            capabilities: ['Pull cost data', 'Sync invoices', 'Export financial reports', 'Carbon credit tracking'],
          },
          {
            name: 'PagerDuty / Opsgenie',
            type: 'Alerting',
            description: 'On-call alerting and escalation management',
            capabilities: ['Trigger alerts', 'Manage escalations', 'Track acknowledgments', 'Integration with incident playbooks'],
          },
        ],
        
        kpis: [
          {
            name: 'GPU Utilization Efficiency',
            description: 'Average GPU utilization across all clusters weighted by GPU type',
            unit: '%',
            target: 85,
            calculation: 'Σ(GPU_util × GPU_power_weight) / Σ(GPU_power_weight)',
            direction: 'higher',
          },
          {
            name: 'AI-Specific PUE',
            description: 'Power Usage Effectiveness calculated specifically for AI/ML workload zones',
            unit: '',
            target: 1.15,
            calculation: 'Total AI Zone Power / IT Equipment Power in AI Zones',
            direction: 'lower',
          },
          {
            name: 'Carbon Intensity (gCO₂e/GPU-hr)',
            description: 'Grams of CO2 equivalent emissions per GPU-hour of compute',
            unit: 'g CO₂e',
            target: 25,
            calculation: '(Grid Carbon × Energy Consumed) / Total GPU-Hours',
            direction: 'lower',
          },
          {
            name: 'Sovereign Compute Ratio',
            description: 'Percentage of compute workloads running in Canadian sovereign jurisdiction',
            unit: '%',
            target: 98,
            calculation: '(Sovereign GPU-hours / Total GPU-hours) × 100',
            direction: 'higher',
          },
          {
            name: 'Incident MTTR',
            description: 'Mean Time to Resolve for cooling, power, and workload incidents',
            unit: 'minutes',
            target: 30,
            calculation: 'Average resolution time across incident categories',
            direction: 'lower',
          },
          {
            name: 'OPEX Efficiency Score',
            description: 'Operational cost efficiency normalized against compute output',
            unit: '$/GPU-hr',
            target: 0.45,
            calculation: 'Total OPEX / Total GPU-Hours Delivered',
            direction: 'lower',
          },
        ],
        
        human_in_the_loop: [
          {
            role: 'Data Centre Operations Manager',
            responsibilities: 'Day-to-day facility oversight and incident response',
            decisions_approved: ['Emergency cooling activation', 'Workload migration execution', 'Capacity overflow triggers'],
            reviews: ['Real-time alerts', 'Daily PUE reports', 'Incident playbook execution'],
          },
          {
            role: 'HPC Lead / Workload Manager',
            responsibilities: 'GPU cluster optimization and tenant workload management',
            decisions_approved: ['Job priority changes', 'Tenant allocation adjustments', 'Training window scheduling'],
            reviews: ['Utilization dashboards', 'Capacity forecasts', 'Tenant SLA compliance'],
          },
          {
            role: 'Sustainability Officer',
            responsibilities: 'Environmental compliance and net-zero pathway management',
            decisions_approved: ['Green energy procurement', 'Carbon offset purchases', 'Emissions reporting sign-off'],
            reviews: ['Carbon intensity trends', 'Green vs gas scenarios', 'Regulatory compliance reports'],
          },
          {
            role: 'CFO / Strategy Lead',
            responsibilities: 'Financial oversight and infrastructure investment decisions',
            decisions_approved: ['CAPEX approvals', 'Green infrastructure investments', 'Tenant pricing changes'],
            reviews: ['ROI scenarios', 'Carbon cost projections', 'NPV comparisons'],
          },
          {
            role: 'Cooling Technician',
            responsibilities: 'HVAC and liquid cooling system maintenance and optimization',
            decisions_approved: ['Coolant flow adjustments', 'Chiller setpoint changes', 'Preventive maintenance scheduling'],
            reviews: ['Cooling zone temps', 'CRAC/CRAH performance', 'Thermal anomaly alerts'],
          },
          {
            role: 'Power/UPS Engineer',
            responsibilities: 'Electrical infrastructure and UPS system management',
            decisions_approved: ['UPS maintenance windows', 'Generator test schedules', 'PDU load balancing'],
            reviews: ['UPS battery health', 'Power redundancy status', 'Transfer switch tests'],
          },
          {
            role: 'Network Engineer',
            responsibilities: 'Network fabric and connectivity management',
            decisions_approved: ['InfiniBand rerouting', 'Firewall rule changes', 'Network maintenance windows'],
            reviews: ['Link flap alerts', 'CRC error rates', 'Bandwidth utilization'],
          },
          {
            role: 'Compliance & Risk Officer',
            responsibilities: 'Data sovereignty and regulatory compliance oversight',
            decisions_approved: ['Data flow policy changes', 'Sovereignty exception handling', 'Audit response actions'],
            reviews: ['Sovereignty violation alerts', 'Compliance audit trails', 'Risk score dashboards'],
          },
        ],
        
        simulation_scenarios: [
          {
            name: 'GPU Overload + Carbon Spike',
            description: 'Simulate H100 cluster hitting 95% utilization during peak LLM training while carbon prices spike to $200/tonne',
            input_parameters: ['Peak utilization target (%)', 'Carbon price ($/tonne)', 'Duration (hours)'],
            simulation_behavior: 'Models thermal impact, energy costs, and financial exposure under combined stress',
            expected_insights: ['Cooling capacity headroom', 'Carbon cost exposure', 'Workload migration triggers', 'Financial impact projection'],
            category: 'Stress Test',
          },
          {
            name: 'Cooling Zone Failure',
            description: 'Model partial or complete failure of liquid cooling in HPC zone',
            input_parameters: ['Affected zone', 'Failure severity (%)', 'Recovery time estimate'],
            simulation_behavior: 'Simulates temperature rise, automatic workload migration, and PUE degradation',
            expected_insights: ['Time to critical temperature', 'Workload migration feasibility', 'PUE impact', 'Incident playbook activation'],
            category: 'Incident',
          },
          {
            name: 'Grid Instability / UPS Activation',
            description: 'Simulate grid power fluctuation requiring UPS and generator activation',
            input_parameters: ['Outage duration', 'Affected PDUs', 'Generator startup time'],
            simulation_behavior: 'Models UPS runtime, load shedding priorities, and recovery sequence',
            expected_insights: ['Critical workload protection', 'UPS capacity adequacy', 'Recovery time estimate', 'Data integrity validation'],
            category: 'Incident',
          },
          {
            name: 'New Sovereign Tenant Onboarding',
            description: 'Model capacity and compliance impact of onboarding a major Canadian financial institution',
            input_parameters: ['Tenant GPU requirements', 'Data sovereignty tier', 'SLA requirements'],
            simulation_behavior: 'Assesses capacity fit, sovereignty compliance, and financial projections',
            expected_insights: ['Capacity utilization change', 'Sovereignty score impact', 'Revenue projections', 'Compliance requirements'],
            category: 'Capacity',
          },
          {
            name: 'Renewable Energy Shift',
            description: 'Compare emissions and costs when shifting from gas-heavy to renewable-heavy energy mix',
            input_parameters: ['Target renewable %', 'Transition timeline', 'Capital investment'],
            simulation_behavior: 'Models phased transition impact on carbon intensity and operational costs',
            expected_insights: ['Carbon reduction pathway', 'Cost trajectory', 'Payback period', 'Green premium analysis'],
            category: 'Strategic',
          },
          {
            name: 'Capacity Expansion Comparison',
            description: 'Compare build-out scenarios: expand existing facility vs new green build',
            input_parameters: ['Expansion capacity (MW)', 'Location options', 'Timeline constraints'],
            simulation_behavior: 'Models NPV, emissions, and operational complexity for each option',
            expected_insights: ['NPV comparison', 'Emissions trajectory', 'Sovereignty implications', 'Implementation risks'],
            category: 'Strategic',
          },
        ],
        
        how_it_works: `The Sovereign Green AI Data Centre Twin operates through five coordinated agents that continuously process data from multiple sources:

1. **Data Ingestion**: Real-time telemetry flows from DCIM sensors, GPU schedulers (Slurm/K8s), power monitoring systems, and grid carbon APIs into the twin's data layer.

2. **Agent Processing**: Each specialized agent analyzes its domain - the Capacity Planning Agent monitors GPU utilization patterns, the Energy Agent tracks PUE and emissions, the Sovereignty Agent validates data flows, the Financial Agent models costs, and the Incident Agent watches for anomalies.

3. **Simulation Engine**: Users can run what-if scenarios (GPU overload, cooling failure, carbon price shocks) to predict outcomes before they occur. The engine uses historical patterns and physics-based models.

4. **Decision Support**: Insights and recommendations surface through dashboards and Co-Pilot, enabling operators to make data-driven decisions with full visibility into downstream impacts.

5. **Workflow Automation**: Predefined workflows automatically respond to threshold breaches - triggering alerts, initiating incident playbooks, or notifying relevant stakeholders.

The twin maintains a complete digital replica of the physical facility, enabling comparison of green vs traditional infrastructure strategies and supporting Canada's sovereign AI infrastructure goals.`,
      },
      day_in_the_life: {
        roles: [
          {
            title: 'Data Centre Operations Manager',
            narrative: 'Starts the day reviewing overnight PUE trends and GPU utilization. Uses the twin to simulate today\'s expected training workload and pre-position cooling resources.',
          },
          {
            title: 'Sustainability Lead',
            narrative: 'Reviews weekly carbon intensity report. Runs QC vs AB comparison scenario to prepare recommendation for board meeting on green investment.',
          },
          {
            title: 'Compliance Officer',
            narrative: 'Checks sovereignty dashboard for any flagged data flows. Reviews audit trail for upcoming SOC 2 audit.',
          },
        ],
      },
      scenarios: [
        { name: 'GPU Overload', description: 'H100 cluster hits 95% during LLM training', category: 'Workload' },
        { name: 'Cooling Failure', description: 'Zone B liquid cooling degradation', category: 'Incident' },
        { name: 'Carbon Shock', description: 'Model $200/t carbon pricing impact', category: 'Financial' },
        { name: 'New Sovereign Tenant', description: 'Onboard major Canadian bank', category: 'Capacity' },
        { name: 'Sovereignty Alert', description: 'Data flow to non-Canadian jurisdiction', category: 'Compliance' },
      ],
      // How it works together - displayed in Blueprint tab narrative
      how_it_works_together: `The Sovereign Green AI Data Centre Twin operates through five coordinated agents that continuously process data from DCIM sensors, GPU schedulers, energy providers, and compliance systems. The Capacity Agent optimizes GPU utilization, the Energy Agent tracks PUE and carbon intensity, the Sovereignty Agent validates data flows, the Financial Agent models costs and ROI, and the Incident Agent monitors for anomalies. Together they enable predictive simulations, automated workflows, and decision support for sustainable sovereign AI infrastructure.`,
      
      // Preview capabilities - displayed in Preview tab
      preview_capabilities: {
        bullets: [
          'Monitor HPC workload distribution and GPU cluster utilization in real-time',
          'Track energy efficiency (PUE) and identify optimization opportunities across cooling zones',
          'Calculate carbon intensity per GPU-hour and emissions trending for net-zero pathways',
          'Validate data sovereignty compliance and flag cross-border data flow risks',
          'Detect thermal anomalies and trigger incident response playbooks automatically',
          'Model financial scenarios comparing green vs gas infrastructure investments',
          'Simulate capacity expansion options with NPV and emissions impact projections',
          'Generate compliance audit trails for PIPEDA and provincial data residency requirements',
        ],
        best_for: 'CTO, Data Centre Ops Lead, HPC Manager, Sustainability Team, Compliance Officer',
        preview_disclaimer: 'This preview demonstrates the twin\'s logic and capabilities. In production, responses will be grounded to live data centre telemetry: GPU metrics, energy mix, PUE readings, emissions data, and sovereignty compliance rules.',
      },
    },
    
    // Blueprint JSON - exposed at config level for StandardizedTemplatePreview
    blueprint_json: {
      agents: [
        { 
          name: 'Capacity Planning Agent', 
          role: 'GPU & compute capacity optimization',
          description: 'Monitors GPU cluster utilization, predicts capacity needs, and optimizes workload distribution across tenants.',
        },
        { 
          name: 'Energy & Emissions Agent', 
          role: 'PUE optimization & carbon tracking',
          description: 'Tracks real-time energy consumption, calculates AI-specific PUE, and monitors carbon intensity per GPU-hour.',
        },
        { 
          name: 'Sovereignty & Compliance Agent', 
          role: 'Data residency & regulatory compliance',
          description: 'Validates all data flows remain within sovereign jurisdiction and monitors compliance with PIPEDA, provincial laws, and tenant SLAs.',
        },
        { 
          name: 'Financial & Investment Agent', 
          role: 'Cost modeling & investment analysis',
          description: 'Models operational costs, carbon pricing impacts, and compares NPV of green vs traditional infrastructure investments.',
        },
        { 
          name: 'Incident & Resilience Agent', 
          role: 'Anomaly detection & incident response',
          description: 'Detects operational anomalies, triggers incident workflows, and tracks MTTR for cooling, power, and workload incidents.',
        },
      ],
      data_sources: [
        { name: 'DCIM / BMS Telemetry', description: 'Rack power draw, cooling temps, humidity, PDU metrics' },
        { name: 'HPC/GPU Cluster Stats', description: 'GPU utilization, job queues, tenant allocations' },
        { name: 'Energy Provider Feeds', description: 'Grid carbon intensity, renewable %, spot pricing' },
        { name: 'Financial / ERP Systems', description: 'Energy invoices, CAPEX, tenant billing' },
        { name: 'Policy & Compliance Sources', description: 'Data residency rules, PIPEDA requirements' },
      ],
      integrations: [
        { name: 'Kubernetes / Slurm', type: 'Workload Orchestration' },
        { name: 'Prometheus / Datadog', type: 'Observability' },
        { name: 'ServiceNow / JIRA', type: 'Incident Management' },
        { name: 'SAP / NetSuite', type: 'Financial Systems' },
        { name: 'PagerDuty / Opsgenie', type: 'Alerting' },
      ],
    },
  },
  
  sample_prompts: [
    'Show current PUE across all cooling zones',
    'Which GPU clusters are above 90% utilization?',
    'Run carbon shock scenario at $200/tonne',
    'Compare QC vs AB facility emissions',
    'Any sovereignty violations in past 24 hours?',
    'Model onboarding a 50MW sovereign tenant',
    'Generate cooling failure incident playbook',
  ],
  
  recommended_models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
  
  kpi_definitions: {
    sovereignComputeRatioPct: {
      name: 'Sovereign Compute Ratio',
      description: 'Percentage of compute capacity running in sovereign Canadian jurisdiction',
      unit: '%',
      calculation: '(Sovereign GPU-hours / Total GPU-hours) × 100',
      target: 98,
      thresholds: { green: 95, yellow: 85, red: 75 },
    },
    effectiveAiPue: {
      name: 'Effective AI PUE',
      description: 'Power Usage Effectiveness specific to AI/ML workloads',
      unit: '',
      calculation: 'Total facility power / IT equipment power',
      target: 1.15,
      thresholds: { green: 1.25, yellow: 1.4, red: 1.6 },
    },
    gco2PerGpuHour: {
      name: 'Carbon Intensity',
      description: 'Grams of CO2 equivalent emitted per GPU-hour',
      unit: 'g CO2/GPU-hr',
      calculation: '(Total emissions × 1000) / Total GPU-hours',
      target: 25,
      thresholds: { green: 50, yellow: 100, red: 200 },
    },
  },
};

/**
 * CoPilot context chip suggestions for this template
 */
export const coPilotChipSuggestions = [
  'Explain sovereign compute ratio',
  'QC vs AB emissions',
  'Optimize cooling',
  'Carbon price risk',
  'Summarize incident playbook',
  'GPU utilization trends',
  'Data sovereignty risks',
  'Green vs gas NPV',
];
