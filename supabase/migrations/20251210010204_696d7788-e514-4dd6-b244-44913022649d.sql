-- Delete all non-Data Centre templates from agent_templates
DELETE FROM public.agent_templates 
WHERE id NOT IN ('datacentre-master-twin-v1', 'DATA_CENTRE_DIGITAL_TWIN')
  AND name NOT ILIKE '%data centre%'
  AND name NOT ILIKE '%data center%';

-- Insert the Data Centre Master Template if it doesn't exist
INSERT INTO public.agent_templates (id, name, category, description, icon, kpi_definitions, sample_prompts, recommended_models, default_config)
VALUES (
  'datacentre-master-twin-v1',
  'Data Centre Digital Twin',
  'Technology',
  'Production-grade Data Centre Digital Twin with 9 domain twins (Thermal, Power, Cooling, Network, Facility, Workload, Sovereignty, Carbon, Financial), 50+ KPIs, 15+ simulation scenarios, and comprehensive synthetic telemetry for sovereign AI infrastructure.',
  '🏢',
  '[{"name": "PUE", "target": 1.2}, {"name": "GPU Utilization", "target": 85}, {"name": "Thermal Stability", "target": 95}]'::jsonb,
  '["Explain current PUE", "Simulate GPU spike", "Check sovereignty compliance"]'::jsonb,
  '["google/gemini-2.5-pro", "google/gemini-2.5-flash"]'::jsonb,
  '{"model": "gemini-2.5-pro", "temperature": 0.3, "system_prompt": "You are the Data Centre Digital Twin CoPilot, an expert AI assistant for sovereign data centre operations. You monitor 9 domain twins: Thermal, Power, Cooling, Network, Facility, Workload, Sovereignty, Carbon, and Financial. Provide actionable insights based on real-time telemetry and simulation results."}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_config = EXCLUDED.default_config,
  updated_at = now();
