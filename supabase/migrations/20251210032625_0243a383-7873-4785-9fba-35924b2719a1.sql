-- Create agent_definitions table for real subsystem agents
CREATE TABLE public.agent_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'thermal_hardware', 'power_ups', 'cooling', 'network', 
    'facility_safety', 'workload_gpu', 'sovereignty', 
    'financial_carbon', 'incident_response'
  )),
  type TEXT NOT NULL DEFAULT 'monitoring' CHECK (type IN (
    'monitoring', 'control', 'optimizer', 'scheduler'
  )),
  description TEXT,
  icon TEXT DEFAULT 'Bot',
  
  -- JSONB fields for complex structures
  inputs JSONB DEFAULT '[]'::jsonb,
  outputs JSONB DEFAULT '[]'::jsonb,
  tools JSONB DEFAULT '[]'::jsonb,
  kpi_bindings JSONB DEFAULT '[]'::jsonb,
  safety_rules JSONB DEFAULT '[]'::jsonb,
  runtime_config JSONB DEFAULT '{}'::jsonb,
  
  -- Ownership & system flags
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_system_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Metrics (updated by runs)
  total_runs INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agent_definition_runs table for tracking runs
CREATE TABLE public.agent_definition_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_definition_id UUID NOT NULL REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
  twin_id UUID REFERENCES public.digital_twins(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'cancelled'
  )),
  
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create junction table for twin-agent bindings
CREATE TABLE public.twin_agent_bindings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.digital_twins(id) ON DELETE CASCADE,
  agent_definition_id UUID NOT NULL REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
  
  is_enabled BOOLEAN DEFAULT true,
  config_overrides JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(twin_id, agent_definition_id)
);

-- Enable RLS
ALTER TABLE public.agent_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_definition_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_agent_bindings ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_definitions
CREATE POLICY "Anyone can view system default agents"
  ON public.agent_definitions FOR SELECT
  USING (is_system_default = true);

CREATE POLICY "Users can view their own agents"
  ON public.agent_definitions FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create agents"
  ON public.agent_definitions FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own agents"
  ON public.agent_definitions FOR UPDATE
  USING (auth.uid() = owner_id AND is_system_default = false);

CREATE POLICY "Users can delete their own agents"
  ON public.agent_definitions FOR DELETE
  USING (auth.uid() = owner_id AND is_system_default = false);

-- RLS policies for agent_definition_runs
CREATE POLICY "Users can view their own runs"
  ON public.agent_definition_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create runs"
  ON public.agent_definition_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own runs"
  ON public.agent_definition_runs FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for twin_agent_bindings
CREATE POLICY "Users can view bindings for their twins"
  ON public.twin_agent_bindings FOR SELECT
  USING (twin_id IN (SELECT id FROM public.digital_twins WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage bindings for their twins"
  ON public.twin_agent_bindings FOR ALL
  USING (twin_id IN (SELECT id FROM public.digital_twins WHERE user_id = auth.uid()));

-- Create indexes
CREATE INDEX idx_agent_definitions_domain ON public.agent_definitions(domain);
CREATE INDEX idx_agent_definitions_owner ON public.agent_definitions(owner_id);
CREATE INDEX idx_agent_definitions_system ON public.agent_definitions(is_system_default);
CREATE INDEX idx_agent_definition_runs_agent ON public.agent_definition_runs(agent_definition_id);
CREATE INDEX idx_agent_definition_runs_user ON public.agent_definition_runs(user_id);
CREATE INDEX idx_twin_agent_bindings_twin ON public.twin_agent_bindings(twin_id);

-- Trigger for updated_at
CREATE TRIGGER update_agent_definitions_updated_at
  BEFORE UPDATE ON public.agent_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_twin_agent_bindings_updated_at
  BEFORE UPDATE ON public.twin_agent_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 9 default Data Centre agents
INSERT INTO public.agent_definitions (slug, name, domain, type, description, icon, is_system_default, inputs, outputs, tools, kpi_bindings, safety_rules, runtime_config) VALUES
(
  'thermal_agent',
  'Thermal Guardian',
  'thermal_hardware',
  'monitoring',
  'Monitors CPU/GPU temperatures, fan RPM, ECC errors, and disk health across all racks. Triggers alerts on thermal anomalies.',
  'Thermometer',
  true,
  '[{"name": "rack_ids", "type": "string[]", "required": false, "description": "Filter to specific racks"},{"name": "threshold_override", "type": "number", "required": false, "description": "Override default temp threshold"}]',
  '[{"name": "thermal_status", "type": "object", "description": "Current thermal state per rack"},{"name": "alerts", "type": "array", "description": "Active thermal alerts"},{"name": "recommendations", "type": "array", "description": "Cooling recommendations"}]',
  '[{"id": "read_rack_temps", "name": "Read Rack Temperatures", "category": "sensor"},{"id": "read_fan_rpm", "name": "Read Fan RPM", "category": "sensor"},{"id": "check_ecc_errors", "name": "Check ECC Errors", "category": "hardware"},{"id": "trigger_alert", "name": "Trigger Alert", "category": "action"}]',
  '[{"kpiId": "avg_inlet_temp", "weight": 0.3},{"kpiId": "max_delta_t", "weight": 0.3},{"kpiId": "thermal_incidents_24h", "weight": 0.4}]',
  '["Never exceed 85°C on any component", "Alert if ΔT > 15°C sustained for 5 minutes", "Escalate to facility safety if cooling fails"]',
  '{"schedule": "*/30 * * * * *", "maxSteps": 50, "modelProfile": "gemini-2.5-flash"}'
),
(
  'power_agent',
  'Power & UPS Monitor',
  'power_ups',
  'monitoring',
  'Tracks PDU outlets, battery health, generator failover readiness, and power redundancy levels. Ensures N+1 or 2N redundancy.',
  'Zap',
  true,
  '[{"name": "pdu_ids", "type": "string[]", "required": false},{"name": "include_ups", "type": "boolean", "required": false, "default": true}]',
  '[{"name": "power_status", "type": "object"},{"name": "battery_health", "type": "object"},{"name": "redundancy_level", "type": "string"}]',
  '[{"id": "read_pdu_load", "name": "Read PDU Load", "category": "sensor"},{"id": "check_ups_status", "name": "Check UPS Status", "category": "sensor"},{"id": "test_generator", "name": "Test Generator", "category": "action"}]',
  '[{"kpiId": "pue", "weight": 0.4},{"kpiId": "power_redundancy", "weight": 0.3},{"kpiId": "ups_runtime_min", "weight": 0.3}]',
  '["Maintain minimum 15 minutes UPS runtime", "Never allow single point of failure on critical loads", "Generator must be test-ready"]',
  '{"schedule": "*/60 * * * * *", "maxSteps": 30, "modelProfile": "gemini-2.5-flash"}'
),
(
  'cooling_agent',
  'Cooling Optimization Agent',
  'cooling',
  'optimizer',
  'Optimizes CRAC/CRAH units, monitors refrigerant levels, supply/return air temps, and humidity. Maximizes cooling efficiency.',
  'Wind',
  true,
  '[{"name": "zones", "type": "string[]", "required": false},{"name": "optimization_mode", "type": "string", "required": false, "default": "balanced"}]',
  '[{"name": "cooling_efficiency", "type": "number"},{"name": "recommendations", "type": "array"},{"name": "predicted_savings", "type": "object"}]',
  '[{"id": "read_crah_status", "name": "Read CRAH Status", "category": "sensor"},{"id": "adjust_setpoint", "name": "Adjust Setpoint", "category": "control"},{"id": "read_humidity", "name": "Read Humidity", "category": "sensor"}]',
  '[{"kpiId": "cooling_efficiency_pct", "weight": 0.4},{"kpiId": "humidity_compliance", "weight": 0.3},{"kpiId": "crah_load_balance", "weight": 0.3}]',
  '["Maintain humidity between 40-60%", "Never allow supply air below 15°C (condensation risk)", "Coordinate with thermal agent before major changes"]',
  '{"schedule": "0 */5 * * * *", "maxSteps": 40, "modelProfile": "gemini-2.5-flash"}'
),
(
  'network_agent',
  'Network Fabric Monitor',
  'network',
  'monitoring',
  'Monitors port utilization, packet errors, latency, and firewall throughput. Detects network anomalies and bottlenecks.',
  'Network',
  true,
  '[{"name": "switch_ids", "type": "string[]", "required": false},{"name": "include_firewall", "type": "boolean", "default": true}]',
  '[{"name": "network_health", "type": "object"},{"name": "congestion_points", "type": "array"},{"name": "latency_report", "type": "object"}]',
  '[{"id": "read_port_stats", "name": "Read Port Statistics", "category": "sensor"},{"id": "check_latency", "name": "Check Latency", "category": "sensor"},{"id": "read_firewall_throughput", "name": "Read Firewall Throughput", "category": "sensor"}]',
  '[{"kpiId": "avg_port_utilization", "weight": 0.3},{"kpiId": "packet_loss_rate", "weight": 0.4},{"kpiId": "avg_latency_ms", "weight": 0.3}]',
  '["Alert if packet loss > 0.1%", "Escalate if latency > 5ms on spine links", "Never block management VLAN traffic"]',
  '{"schedule": "*/15 * * * * *", "maxSteps": 25, "modelProfile": "gemini-2.5-flash"}'
),
(
  'facility_agent',
  'Facility Safety Agent',
  'facility_safety',
  'monitoring',
  'Monitors ambient zones, particle counts, hydrogen concentration, water/fire sensors. Ensures physical safety compliance.',
  'Shield',
  true,
  '[{"name": "zones", "type": "string[]", "required": false},{"name": "include_fire_panel", "type": "boolean", "default": true}]',
  '[{"name": "safety_status", "type": "object"},{"name": "active_alarms", "type": "array"},{"name": "compliance_score", "type": "number"}]',
  '[{"id": "read_particle_count", "name": "Read Particle Count", "category": "sensor"},{"id": "check_water_sensors", "name": "Check Water Sensors", "category": "sensor"},{"id": "read_fire_panel", "name": "Read Fire Panel", "category": "sensor"}]',
  '[{"kpiId": "safety_incidents_mtd", "weight": 0.5},{"kpiId": "fire_suppression_ready", "weight": 0.3},{"kpiId": "access_compliance", "weight": 0.2}]',
  '["Immediate evacuation protocol if H2 > 1%", "Water detection triggers automatic power isolation", "Fire suppression delay: 60 seconds for human verification"]',
  '{"schedule": "*/10 * * * * *", "maxSteps": 20, "modelProfile": "gemini-2.5-flash"}'
),
(
  'workload_agent',
  'Workload Orchestrator',
  'workload_gpu',
  'scheduler',
  'Schedules GPU training vs inference workloads, monitors queue times, detects SLA breaches, ensures GPU fairness across tenants.',
  'Cpu',
  true,
  '[{"name": "cluster_ids", "type": "string[]", "required": false},{"name": "priority_override", "type": "object", "required": false}]',
  '[{"name": "queue_status", "type": "object"},{"name": "gpu_allocation", "type": "object"},{"name": "sla_status", "type": "array"}]',
  '[{"id": "read_gpu_utilization", "name": "Read GPU Utilization", "category": "sensor"},{"id": "schedule_job", "name": "Schedule Job", "category": "control"},{"id": "preempt_job", "name": "Preempt Job", "category": "control"}]',
  '[{"kpiId": "gpu_utilization_pct", "weight": 0.3},{"kpiId": "queue_wait_p95", "weight": 0.3},{"kpiId": "sla_breach_count", "weight": 0.4}]',
  '["Never preempt jobs in final 10% of completion", "Maintain minimum 5% GPU headroom for urgent jobs", "Fair-share scheduling across tenants"]',
  '{"schedule": "*/5 * * * * *", "maxSteps": 60, "modelProfile": "gemini-2.5-flash"}'
),
(
  'sovereignty_agent',
  'Sovereignty Sentinel',
  'sovereignty',
  'monitoring',
  'Tracks data flow provenance, jurisdiction tagging, residency alerts. Ensures compliance with sovereignty requirements.',
  'Globe',
  true,
  '[{"name": "data_classes", "type": "string[]", "required": false},{"name": "jurisdictions", "type": "string[]", "required": false}]',
  '[{"name": "compliance_status", "type": "object"},{"name": "violations", "type": "array"},{"name": "data_flow_map", "type": "object"}]',
  '[{"id": "audit_data_flow", "name": "Audit Data Flow", "category": "audit"},{"id": "check_jurisdiction", "name": "Check Jurisdiction", "category": "audit"},{"id": "block_transfer", "name": "Block Transfer", "category": "control"}]',
  '[{"kpiId": "sovereignty_score", "weight": 0.4},{"kpiId": "cross_border_violations", "weight": 0.4},{"kpiId": "audit_completeness", "weight": 0.2}]',
  '["Block any cross-border transfer without explicit approval", "Audit trail required for all sovereign data access", "Immediate escalation on jurisdiction violation"]',
  '{"schedule": "0 */1 * * * *", "maxSteps": 30, "modelProfile": "gemini-2.5-pro"}'
),
(
  'carbon_agent',
  'Carbon & Cost Optimizer',
  'financial_carbon',
  'optimizer',
  'Forecasts carbon emissions, compares renewable options, calculates NPV/IRR, tracks emissions against targets.',
  'Leaf',
  true,
  '[{"name": "time_horizon_days", "type": "number", "default": 30},{"name": "carbon_price_usd", "type": "number", "required": false}]',
  '[{"name": "carbon_forecast", "type": "object"},{"name": "cost_projection", "type": "object"},{"name": "optimization_opportunities", "type": "array"}]',
  '[{"id": "calculate_emissions", "name": "Calculate Emissions", "category": "compute"},{"id": "project_costs", "name": "Project Costs", "category": "compute"},{"id": "compare_scenarios", "name": "Compare Scenarios", "category": "compute"}]',
  '[{"kpiId": "carbon_intensity", "weight": 0.3},{"kpiId": "renewable_pct", "weight": 0.3},{"kpiId": "cost_per_kwh", "weight": 0.4}]',
  '["Never exceed monthly carbon budget without executive approval", "Prefer renewable sources when cost delta < 15%", "Report material changes to finance within 24h"]',
  '{"schedule": "0 0 * * * *", "maxSteps": 50, "modelProfile": "gemini-2.5-flash"}'
),
(
  'incident_agent',
  'Incident Response Coordinator',
  'incident_response',
  'control',
  'Coordinates cross-domain incident response, triggers runbooks, escalates to human operators, tracks MTTR.',
  'AlertTriangle',
  true,
  '[{"name": "incident_id", "type": "string", "required": false},{"name": "severity_filter", "type": "string", "required": false}]',
  '[{"name": "active_incidents", "type": "array"},{"name": "runbook_status", "type": "object"},{"name": "escalation_chain", "type": "array"}]',
  '[{"id": "create_incident", "name": "Create Incident", "category": "action"},{"id": "run_playbook", "name": "Run Playbook", "category": "action"},{"id": "escalate", "name": "Escalate to Human", "category": "action"},{"id": "resolve_incident", "name": "Resolve Incident", "category": "action"}]',
  '[{"kpiId": "mttr_minutes", "weight": 0.4},{"kpiId": "incident_count_24h", "weight": 0.3},{"kpiId": "auto_resolution_rate", "weight": 0.3}]',
  '["Always escalate P1 incidents to on-call within 5 minutes", "Document all actions in incident timeline", "Post-mortem required for all P1/P2 incidents"]',
  '{"schedule": "*/5 * * * * *", "maxSteps": 100, "modelProfile": "gemini-2.5-pro"}'
);