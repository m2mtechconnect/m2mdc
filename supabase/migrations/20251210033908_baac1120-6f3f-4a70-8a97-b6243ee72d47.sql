
-- Create dc_scan_sessions table for storing URL scans and blueprint recommendations
CREATE TABLE public.dc_scan_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Derived from scan
  detected_industry TEXT NOT NULL DEFAULT 'other',
  traffic_scale TEXT NOT NULL DEFAULT 'medium',
  sustainability_priority TEXT NOT NULL DEFAULT 'medium',
  
  -- Blueprint choice
  blueprint_profile TEXT NOT NULL,
  blueprint_id UUID NULL,
  
  -- Cached recommendation JSON
  recommendation_json JSONB NULL,
  
  -- Raw scan data
  raw_signals JSONB NULL,
  
  -- Constraints
  CONSTRAINT dc_scan_sessions_detected_industry_check CHECK (detected_industry IN ('finance', 'government', 'retail', 'telecom', 'cloud_saas', 'manufacturing', 'healthcare', 'energy', 'ai_compute', 'other')),
  CONSTRAINT dc_scan_sessions_traffic_scale_check CHECK (traffic_scale IN ('small', 'medium', 'large', 'hyperscale')),
  CONSTRAINT dc_scan_sessions_sustainability_priority_check CHECK (sustainability_priority IN ('low', 'medium', 'high'))
);

-- Create index for fetching latest scan per user
CREATE INDEX idx_dc_scan_sessions_user_created ON public.dc_scan_sessions (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.dc_scan_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own scan sessions"
ON public.dc_scan_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scan sessions"
ON public.dc_scan_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan sessions"
ON public.dc_scan_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create dc_blueprint_templates table for the blueprint registry
CREATE TABLE public.dc_blueprint_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  default_capacity_kw INTEGER NOT NULL DEFAULT 5000,
  default_tier TEXT NOT NULL DEFAULT 'Tier III',
  default_agents TEXT[] NOT NULL DEFAULT '{}',
  sustainability_focus TEXT[] NOT NULL DEFAULT '{}',
  compliance_focus TEXT[] NOT NULL DEFAULT '{}',
  target_pue NUMERIC(3,2) NOT NULL DEFAULT 1.30,
  renewable_target_pct INTEGER NOT NULL DEFAULT 80,
  sovereign_compute_pct INTEGER NOT NULL DEFAULT 100,
  annual_carbon_target_tonnes INTEGER NOT NULL DEFAULT 500,
  cost_focus TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT dc_blueprint_templates_tier_check CHECK (default_tier IN ('Tier II', 'Tier III', 'Tier IV'))
);

-- Enable RLS
ALTER TABLE public.dc_blueprint_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view templates
CREATE POLICY "Anyone can view blueprint templates"
ON public.dc_blueprint_templates
FOR SELECT
USING (true);

-- Seed the blueprint templates
INSERT INTO public.dc_blueprint_templates (slug, name, description, default_capacity_kw, default_tier, default_agents, sustainability_focus, compliance_focus, target_pue, renewable_target_pct, sovereign_compute_pct, annual_carbon_target_tonnes, cost_focus) VALUES
('finance_green_dc', 'Finance Green Data Centre Twin', 'Optimized for financial services with strong sovereignty, compliance, and low-latency trading workloads.', 8000, 'Tier IV', ARRAY['thermal_guardian', 'power_monitor', 'cooling_optimizer', 'sovereignty_sentinel', 'financial_carbon_agent', 'incident_response', 'workload_orchestrator'], ARRAY['PUE < 1.25', '90% renewable energy', 'Carbon neutral by 2030'], ARRAY['SOC2 Type II', 'PCI-DSS', 'GDPR', 'DORA'], 1.25, 90, 100, 400, 'Minimize $/transaction for high-frequency trading and core banking workloads'),

('gov_sovereign_dc', 'Government Sovereign Data Centre Twin', 'Maximum sovereignty and compliance for government and public sector workloads with strict data residency.', 6000, 'Tier IV', ARRAY['sovereignty_sentinel', 'thermal_guardian', 'power_monitor', 'incident_response', 'facility_safety', 'network_monitor', 'financial_carbon_agent'], ARRAY['PUE < 1.30', '85% renewable energy', 'Net-zero emissions target'], ARRAY['FedRAMP', 'ITAR', 'CJIS', 'StateRAMP', 'CMMC'], 1.30, 85, 100, 500, 'Optimize total cost of ownership while maintaining 100% sovereign compute'),

('retail_edge_dc', 'Retail Edge Data Centre Twin', 'Distributed edge computing optimized for retail, e-commerce, and customer-facing applications.', 3000, 'Tier III', ARRAY['thermal_guardian', 'cooling_optimizer', 'workload_orchestrator', 'network_monitor', 'financial_carbon_agent', 'power_monitor'], ARRAY['PUE < 1.35', '75% renewable energy', 'Seasonal load optimization'], ARRAY['PCI-DSS', 'SOC2', 'GDPR'], 1.35, 75, 80, 300, 'Minimize $/order during peak shopping seasons'),

('telco_regional_dc', 'Telecom Regional Data Centre Twin', 'Network-optimized regional data centre for telecommunications and 5G edge workloads.', 10000, 'Tier III', ARRAY['network_monitor', 'thermal_guardian', 'power_monitor', 'cooling_optimizer', 'workload_orchestrator', 'incident_response', 'financial_carbon_agent'], ARRAY['PUE < 1.30', '80% renewable energy', 'Heat reuse programs'], ARRAY['SOC2', 'ISO 27001', 'GDPR'], 1.30, 80, 90, 600, 'Optimize $/Gbps for 5G and edge compute workloads'),

('saas_multi_tenant_dc', 'SaaS Multi-Tenant Data Centre Twin', 'Flexible multi-tenant infrastructure for B2B SaaS and cloud platform workloads.', 5000, 'Tier III', ARRAY['workload_orchestrator', 'thermal_guardian', 'cooling_optimizer', 'power_monitor', 'financial_carbon_agent', 'sovereignty_sentinel', 'incident_response'], ARRAY['PUE < 1.30', '80% renewable energy', 'Carbon footprint reporting'], ARRAY['SOC2 Type II', 'ISO 27001', 'GDPR', 'HIPAA'], 1.30, 80, 85, 450, 'Optimize $/user/month while maintaining SLA guarantees'),

('industrial_ai_dc', 'Industrial AI Data Centre Twin', 'Heavy industrial and manufacturing AI workloads with OT integration and edge compute.', 7000, 'Tier III', ARRAY['thermal_guardian', 'power_monitor', 'cooling_optimizer', 'gpu_scheduler', 'workload_orchestrator', 'facility_safety', 'financial_carbon_agent'], ARRAY['PUE < 1.35', '70% renewable energy', 'Industrial heat recovery'], ARRAY['IEC 62443', 'ISO 27001', 'NERC CIP'], 1.35, 70, 75, 550, 'Optimize $/inference for industrial AI and predictive maintenance'),

('healthcare_compliant_dc', 'Healthcare Compliant Data Centre Twin', 'HIPAA-compliant infrastructure for healthcare, life sciences, and medical imaging workloads.', 4000, 'Tier IV', ARRAY['sovereignty_sentinel', 'thermal_guardian', 'power_monitor', 'incident_response', 'workload_orchestrator', 'financial_carbon_agent', 'facility_safety'], ARRAY['PUE < 1.30', '85% renewable energy', 'Medical-grade uptime'], ARRAY['HIPAA', 'HITRUST', 'SOC2', 'FDA 21 CFR Part 11'], 1.30, 85, 100, 350, 'Optimize $/study for medical imaging and clinical trial workloads'),

('energy_low_carbon_dc', 'Energy Low-Carbon Data Centre Twin', 'Ultra-low carbon footprint for energy, utilities, and grid management workloads.', 6000, 'Tier III', ARRAY['financial_carbon_agent', 'power_monitor', 'thermal_guardian', 'cooling_optimizer', 'workload_orchestrator', 'facility_safety', 'incident_response'], ARRAY['PUE < 1.20', '95% renewable energy', 'Grid-interactive operations'], ARRAY['NERC CIP', 'ISO 27001', 'SOC2'], 1.20, 95, 90, 200, 'Minimize carbon intensity while supporting grid stability'),

('sovereign_ai_factory_dc', 'Sovereign AI Factory Data Centre Twin', 'GPU-dense sovereign AI infrastructure for foundation models, training, and inference at scale.', 15000, 'Tier IV', ARRAY['gpu_scheduler', 'thermal_guardian', 'cooling_optimizer', 'power_monitor', 'sovereignty_sentinel', 'workload_orchestrator', 'financial_carbon_agent', 'incident_response'], ARRAY['PUE < 1.20', '100% renewable energy', 'Liquid cooling optimized'], ARRAY['SOC2', 'ISO 27001', 'AI Act', 'C5'], 1.20, 100, 100, 800, 'Optimize $/GPU-hour for large-scale AI training and inference');
