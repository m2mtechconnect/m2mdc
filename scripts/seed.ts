import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Seeding database...');

  // Create test user
  const testUserId = '00000000-0000-0000-0000-000000000001';

  // Seed templates
  const templates = [
    {
      id: 'finance-compliance',
      name: 'Finance Compliance AI',
      category: 'Finance',
      description: 'Automated compliance reporting and risk detection',
      icon: 'FileText',
      default_config: {
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
        topK: 15,
        topN: 8
      },
      recommended_models: ['google/gemini-2.5-flash', 'openai/gpt-5-mini'],
      kpi_definitions: [
        { key: 'reports_processed', label: 'Reports Processed', unit: 'count' },
        { key: 'compliance_score', label: 'Compliance Score', unit: 'percent' }
      ],
      sample_prompts: [
        'Analyze this financial report for GAAP compliance',
        'Check for SEC disclosure violations'
      ]
    },
    {
      id: 'healthcare-hipaa',
      name: 'Healthcare HIPAA Guardian',
      category: 'Healthcare',
      description: 'Real-time PII detection and HIPAA compliance monitoring',
      icon: 'Shield',
      default_config: {
        model: 'google/gemini-2.5-flash',
        temperature: 0.2,
        topK: 20,
        topN: 10,
        residency: 'us-central1'
      },
      recommended_models: ['google/gemini-2.5-flash'],
      kpi_definitions: [
        { key: 'pii_detected', label: 'PII Detected', unit: 'count' },
        { key: 'hipaa_violations', label: 'HIPAA Violations', unit: 'count' }
      ],
      sample_prompts: [
        'Scan this document for PHI/PII',
        'Check HIPAA compliance of this record'
      ]
    },
    {
      id: 'energy-maintenance',
      name: 'Predictive Maintenance AI',
      category: 'Energy',
      description: 'Predict equipment failures before they happen',
      icon: 'Zap',
      default_config: {
        model: 'google/gemini-2.5-flash',
        temperature: 0.4,
        topK: 15,
        topN: 8
      },
      recommended_models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
      kpi_definitions: [
        { key: 'failures_predicted', label: 'Failures Predicted', unit: 'count' },
        { key: 'downtime_saved', label: 'Downtime Saved', unit: 'hours' }
      ],
      sample_prompts: [
        'Analyze turbine sensor data for anomalies',
        'Predict next maintenance window'
      ]
    }
  ];

  for (const template of templates) {
    const { error } = await supabase
      .from('agent_templates')
      .upsert(template, { onConflict: 'id' });
    if (error) console.error(`Error seeding template ${template.id}:`, error);
    else console.log(`✓ Seeded template: ${template.name}`);
  }

  // Seed environments
  const environments = [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Development' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Staging' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Production' }
  ];

  for (const env of environments) {
    const { error } = await supabase
      .from('environments')
      .upsert(env, { onConflict: 'id' });
    if (error) console.error(`Error seeding environment ${env.name}:`, error);
    else console.log(`✓ Seeded environment: ${env.name}`);
  }

  // Seed a demo system (if test user exists)
  const demoSystem = {
    id: '00000000-0000-0000-0000-000000000100',
    owner_id: testUserId,
    name: 'Demo Finance System',
    description: 'Automated compliance reporting',
    status: 'draft',
    version: 'v1',
    template_id: 'finance-compliance',
    config: {
      department: 'Finance',
      outcome: 'Automation',
      successMetric: 'cycle_time',
      geminiEnabled: true,
      vertexGrounding: true,
      temperature: 0.3,
      topK: 15,
      topN: 8,
      systemPrompt: 'You are a finance compliance AI assistant.'
    }
  };

  const { error: systemError } = await supabase
    .from('agents')
    .upsert(demoSystem, { onConflict: 'id' });
  
  if (systemError) console.error('Error seeding demo system:', systemError);
  else console.log('✓ Seeded demo system');

  console.log('✅ Seeding complete!');
}

seed().catch(console.error);
