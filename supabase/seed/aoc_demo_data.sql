-- ============================================================
-- AOC Demo/Seed Data - Enhanced with Compliance Digital Twin
-- Idempotent script for local testing and demos
-- ============================================================

-- Get a test user ID (use the first authenticated user or create a test user)
DO $$
DECLARE
  test_user_id UUID;
  agent1_id UUID := 'b8290e25-089d-4b7d-b1fa-019f0187947f';
  agent2_id UUID := gen_random_uuid();
  agent3_id UUID := gen_random_uuid();
  compliance_agent_id UUID := '1af78dfb-035e-4d97-bf15-55d649161058'; -- Canonical compliance twin ID
BEGIN
  -- Get first user from auth.users
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No user found in auth.users. Seed data requires at least one authenticated user.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding demo data for user: %', test_user_id;

  -- ============================================================
  -- 1. GRANT ROLES
  -- ============================================================
  
  -- Make test user a global admin
  INSERT INTO public.user_roles (user_id, role, scope, granted_by)
  VALUES (test_user_id, 'admin', 'global', test_user_id)
  ON CONFLICT (user_id, role, scope) DO NOTHING;

  -- ============================================================
  -- 2. CREATE DEMO AGENTS (if not exist)
  -- ============================================================
  
  -- Agent 1: Credit Risk Assessment
  INSERT INTO public.agents (id, name, description, owner_id, status, version, template_id)
  VALUES (
    agent1_id,
    'Credit Risk Assessment Twin',
    'AI agent for analyzing credit applications and risk scoring',
    test_user_id,
    'active',
    '1.0.0',
    'credit-risk-assessment'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Agent 2: Compliance Monitor
  INSERT INTO public.agents (id, name, description, owner_id, status, version, template_id)
  VALUES (
    agent2_id,
    'Compliance Monitoring System',
    'Real-time compliance and regulatory monitoring agent',
    test_user_id,
    'active',
    '2.1.0',
    'compliance-monitor'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Agent 3: Customer Service Bot
  INSERT INTO public.agents (id, name, description, owner_id, status, version, template_id)
  VALUES (
    agent3_id,
    'Customer Service AI Agent',
    'Automated customer support and query resolution',
    test_user_id,
    'draft',
    '0.5.0',
    'customer-service'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Agent 4: Compliance Digital Twin (Featured Demo Agent)
  INSERT INTO public.agents (id, name, description, owner_id, status, version, template_id)
  VALUES (
    compliance_agent_id,
    'Compliance Digital Twin',
    'This Digital Twin mirrors the bank''s regulatory compliance processes, continuously monitoring transactions, flagging anomalies, and ensuring adherence to financial regulations across all operational environments.',
    test_user_id,
    'active',
    'vv0',
    'compliance-digital-twin'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 3. RUNTIME STATUS
  -- ============================================================
  
  INSERT INTO public.agent_runtime_status (agent_id, environment, status, current_version, health_status, last_action, last_action_at)
  VALUES
    (agent1_id, 'dev', 'running', '1.0.0', 'healthy', 'run', now() - interval '2 hours'),
    (agent1_id, 'prod', 'running', '1.0.0', 'healthy', 'run', now() - interval '1 day'),
    (agent2_id, 'dev', 'paused', '2.1.0', 'healthy', 'pause', now() - interval '30 minutes'),
    (agent2_id, 'test', 'running', '2.1.0', 'healthy', 'run', now() - interval '4 hours'),
    (agent2_id, 'prod', 'running', '2.0.0', 'degraded', 'run', now() - interval '2 days'),
    (compliance_agent_id, 'dev', 'running', 'vv0', 'healthy', 'run', now() - interval '15 minutes'),
    (compliance_agent_id, 'test', 'running', 'vv0', 'healthy', 'run', now() - interval '3 hours'),
    (compliance_agent_id, 'staging', 'deploying', 'vv0', 'healthy', 'deploy', now() - interval '10 minutes'),
    (compliance_agent_id, 'prod', 'running', 'vv0', 'healthy', 'run', now() - interval '1 hour')
  ON CONFLICT (agent_id, environment) DO NOTHING;

  -- ============================================================
  -- 4. WORKFLOWS
  -- ============================================================
  
  INSERT INTO public.agent_workflows (agent_id, name, workflow_json, enabled, trigger_type)
  VALUES
    (agent1_id, 'Risk Assessment Pipeline', '{
      "nodes": [
        {"id": "1", "name": "Receive Application", "type": "trigger", "action": "webhook", "status": "completed"},
        {"id": "2", "name": "Extract Data", "type": "action", "action": "parse_json", "status": "completed"},
        {"id": "3", "name": "Credit Check", "type": "integration", "action": "experian_lookup", "status": "running"},
        {"id": "4", "name": "Risk Score", "type": "llm", "action": "analyze", "status": "idle"},
        {"id": "5", "name": "Send Response", "type": "action", "action": "send_email", "status": "idle"}
      ],
      "edges": [
        {"from": "1", "to": "2"},
        {"from": "2", "to": "3"},
        {"from": "3", "to": "4"},
        {"from": "4", "to": "5"}
      ]
    }', true, 'webhook'),
    
    (agent2_id, 'Compliance Monitoring', '{
      "nodes": [
        {"id": "1", "name": "Monitor Events", "type": "trigger", "action": "stream", "status": "completed"},
        {"id": "2", "name": "Check Rules", "type": "action", "action": "evaluate", "status": "completed"},
        {"id": "3", "name": "Flag Issues", "type": "action", "action": "alert", "status": "idle"}
      ],
      "edges": [
        {"from": "1", "to": "2"},
        {"from": "2", "to": "3"}
      ]
    }', true, 'scheduled'),
    
    (compliance_agent_id, 'Transaction Monitoring Pipeline', '{
      "nodes": [
        {"id": "1", "name": "Stream Transactions", "type": "trigger", "action": "webhook", "status": "completed"},
        {"id": "2", "name": "Parse Transaction Data", "type": "action", "action": "extract_fields", "status": "completed"},
        {"id": "3", "name": "Risk Scoring", "type": "llm", "action": "analyze_risk", "status": "running"},
        {"id": "4", "name": "Check Compliance Rules", "type": "integration", "action": "regulatory_check", "status": "idle"},
        {"id": "5", "name": "Flag Anomalies", "type": "action", "action": "create_alert", "status": "idle"},
        {"id": "6", "name": "Generate Report", "type": "action", "action": "send_report", "status": "idle"}
      ],
      "edges": [
        {"from": "1", "to": "2"},
        {"from": "2", "to": "3"},
        {"from": "3", "to": "4"},
        {"from": "4", "to": "5"},
        {"from": "5", "to": "6"}
      ]
    }', true, 'webhook'),
    
    (compliance_agent_id, 'KYC Periodic Review', '{
      "nodes": [
        {"id": "1", "name": "Scheduled Trigger", "type": "trigger", "action": "cron", "status": "completed"},
        {"id": "2", "name": "Fetch Customer Data", "type": "integration", "action": "db_query", "status": "completed"},
        {"id": "3", "name": "Verify Documents", "type": "action", "action": "validate_docs", "status": "idle"},
        {"id": "4", "name": "Update Status", "type": "action", "action": "update_db", "status": "idle"}
      ],
      "edges": [
        {"from": "1", "to": "2"},
        {"from": "2", "to": "3"},
        {"from": "3", "to": "4"}
      ]
    }', false, 'scheduled')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 5. ACTIVITY LOGS
  -- ============================================================
  
  INSERT INTO public.agent_activity_logs (agent_id, log_type, message, details, created_at)
  VALUES
    (agent1_id, 'info', 'Agent started successfully', '{"version": "1.0.0", "environment": "prod"}', now() - interval '1 day'),
    (agent1_id, 'action', 'Processed credit application', '{"applicant_id": "APP-001", "decision": "approved"}', now() - interval '23 hours'),
    (agent1_id, 'llm', 'Generated risk assessment report', '{"model": "gpt-5", "tokens": 1234}', now() - interval '22 hours'),
    (agent1_id, 'success', 'Application approved', '{"score": 780, "confidence": 0.92}', now() - interval '22 hours'),
    (agent1_id, 'integration', 'Called Experian API', '{"endpoint": "/credit-check", "status": 200}', now() - interval '20 hours'),
    (agent1_id, 'error', 'Rate limit exceeded', '{"service": "experian", "retry_after": 60}', now() - interval '18 hours'),
    (agent1_id, 'warning', 'High latency detected', '{"duration_ms": 3500, "threshold": 2000}', now() - interval '16 hours'),
    
    (agent2_id, 'info', 'Compliance check started', '{}', now() - interval '4 hours'),
    (agent2_id, 'workflow_event', 'Rule evaluation completed', '{"rules_checked": 45, "violations": 0}', now() - interval '3 hours'),
    (agent2_id, 'action', 'Generated compliance report', '{"period": "Q4 2024", "status": "compliant"}', now() - interval '2 hours'),
    (agent2_id, 'info', 'Agent paused by user', '{"user_id": "' || test_user_id || '"}', now() - interval '30 minutes'),
    
    -- Compliance Twin Logs (30 comprehensive entries)
    (compliance_agent_id, 'info', 'Agent initialized successfully', '{"version": "vv0", "environment": "prod"}', now() - interval '2 days'),
    (compliance_agent_id, 'workflow_event', 'Transaction Monitoring Pipeline started', '{"workflow_id": "txn-monitor", "trigger": "webhook"}', now() - interval '2 days' + interval '5 minutes'),
    (compliance_agent_id, 'action', 'Processing transaction batch', '{"batch_size": 1250, "source": "payment_gateway"}', now() - interval '1 day 23 hours'),
    (compliance_agent_id, 'llm', 'Risk analysis completed', '{"model": "gpt-5", "tokens": 3456, "latency_ms": 1234}', now() - interval '1 day 22 hours'),
    (compliance_agent_id, 'integration', 'Regulatory database query', '{"endpoint": "/sanctions-check", "status": 200, "records": 5}', now() - interval '1 day 22 hours'),
    (compliance_agent_id, 'success', 'Batch processed successfully', '{"processed": 1250, "flagged": 3, "false_positives": 0}', now() - interval '1 day 22 hours'),
    (compliance_agent_id, 'action', 'Alert generated for high-risk transaction', '{"txn_id": "TXN-45678", "risk_score": 0.87, "reason": "AML threshold exceeded"}', now() - interval '1 day 20 hours'),
    (compliance_agent_id, 'tool_call', 'Sending notification to compliance team', '{"tool": "slack_webhook", "channel": "#compliance-alerts"}', now() - interval '1 day 20 hours'),
    (compliance_agent_id, 'info', 'Daily compliance report generated', '{"date": "2024-12-01", "transactions": 12450, "alerts": 23}', now() - interval '1 day 18 hours'),
    (compliance_agent_id, 'workflow_event', 'KYC Periodic Review triggered', '{"workflow_id": "kyc-review", "trigger": "scheduled"}', now() - interval '1 day 12 hours'),
    (compliance_agent_id, 'action', 'Fetching customer records for review', '{"total_customers": 450, "flagged_for_review": 12}', now() - interval '1 day 12 hours'),
    (compliance_agent_id, 'integration', 'Document verification API called', '{"provider": "jumio", "documents_verified": 12}', now() - interval '1 day 11 hours'),
    (compliance_agent_id, 'success', 'KYC review completed', '{"reviewed": 12, "approved": 10, "requires_manual_review": 2}', now() - interval '1 day 11 hours'),
    (compliance_agent_id, 'warning', 'Rate limit approaching', '{"provider": "sanctions_api", "current": 4800, "limit": 5000}', now() - interval '1 day 8 hours'),
    (compliance_agent_id, 'error', 'Timeout on regulatory check', '{"service": "sanctions_api", "timeout_ms": 30000, "retry_scheduled": true}', now() - interval '1 day 6 hours'),
    (compliance_agent_id, 'info', 'Retry succeeded', '{"attempt": 2, "service": "sanctions_api", "latency_ms": 2300}', now() - interval '1 day 6 hours'),
    (compliance_agent_id, 'action', 'Processing real-time transaction stream', '{"batch_size": 850, "window": "5min"}', now() - interval '18 hours'),
    (compliance_agent_id, 'llm', 'Fraud pattern detection', '{"model": "gpt-5", "patterns_detected": 2, "confidence": 0.94}', now() - interval '18 hours'),
    (compliance_agent_id, 'action', 'Cross-border transaction flagged', '{"txn_id": "TXN-89012", "countries": ["US", "CN"], "amount": 250000}', now() - interval '16 hours'),
    (compliance_agent_id, 'integration', 'OFAC sanctions list checked', '{"endpoint": "/ofac/search", "hits": 0, "latency_ms": 890}', now() - interval '16 hours'),
    (compliance_agent_id, 'success', 'Transaction cleared', '{"txn_id": "TXN-89012", "cleared_by": "automated_check"}', now() - interval '16 hours'),
    (compliance_agent_id, 'workflow_event', 'Monthly audit report generation started', '{"period": "November 2024", "scope": "all_transactions"}', now() - interval '12 hours'),
    (compliance_agent_id, 'action', 'Aggregating compliance metrics', '{"total_transactions": 456789, "alerts": 1234, "false_positive_rate": 0.023}', now() - interval '12 hours'),
    (compliance_agent_id, 'tool_call', 'Generating PDF report', '{"tool": "pdf_generator", "pages": 45}', now() - interval '11 hours 30 minutes'),
    (compliance_agent_id, 'success', 'Audit report published', '{"report_id": "AUD-2024-11", "url": "s3://compliance-reports/2024-11.pdf"}', now() - interval '11 hours'),
    (compliance_agent_id, 'info', 'Model performance metrics collected', '{"accuracy": 0.987, "precision": 0.945, "recall": 0.923}', now() - interval '8 hours'),
    (compliance_agent_id, 'action', 'Processing after-hours transaction batch', '{"batch_size": 320, "time_window": "off_hours"}', now() - interval '4 hours'),
    (compliance_agent_id, 'llm', 'Anomaly detection scan', '{"model": "gpt-5", "anomalies_found": 1, "confidence": 0.78}', now() - interval '4 hours'),
    (compliance_agent_id, 'warning', 'Low-confidence anomaly detected', '{"txn_id": "TXN-99234", "confidence": 0.78, "requires_review": true}', now() - interval '3 hours 45 minutes'),
    (compliance_agent_id, 'info', 'Real-time monitoring active', '{"uptime_hours": 48, "health": "optimal"}', now() - interval '15 minutes')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 6. AGENT RUNS
  -- ============================================================
  
  INSERT INTO public.agent_runs (id, agent_id, user_id, status, input, output, duration_ms, created_at, completed_at)
  VALUES
    (gen_random_uuid(), agent1_id, test_user_id, 'completed', 
     '{"applicant": "John Doe", "amount": 50000}', 
     '{"decision": "approved", "score": 780}', 
     850, now() - interval '1 day', now() - interval '1 day' + interval '850 milliseconds'),
    
    (gen_random_uuid(), agent1_id, test_user_id, 'completed', 
     '{"applicant": "Jane Smith", "amount": 75000}', 
     '{"decision": "review", "score": 650}', 
     920, now() - interval '20 hours', now() - interval '20 hours' + interval '920 milliseconds'),
    
    (gen_random_uuid(), agent1_id, test_user_id, 'failed', 
     '{"applicant": "Bob Johnson", "amount": 100000}', 
     NULL, 
     1200, now() - interval '18 hours', now() - interval '18 hours' + interval '1200 milliseconds'),
    
    (gen_random_uuid(), agent2_id, test_user_id, 'completed', 
     '{"check_type": "regulatory", "period": "daily"}', 
     '{"violations": 0, "checks_passed": 45}', 
     450, now() - interval '4 hours', now() - interval '4 hours' + interval '450 milliseconds'),
    
    -- Compliance Twin Runs (15 entries)
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 1250}', 
     '{"processed": 1250, "flagged": 3, "cleared": 1247}', 
     1234, now() - interval '2 days', now() - interval '2 days' + interval '1234 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 890}', 
     '{"processed": 890, "flagged": 1, "cleared": 889}', 
     987, now() - interval '1 day 18 hours', now() - interval '1 day 18 hours' + interval '987 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "kyc-review", "customers": 12}', 
     '{"reviewed": 12, "approved": 10, "manual_review": 2}', 
     5432, now() - interval '1 day 12 hours', now() - interval '1 day 12 hours' + interval '5432 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'failed', 
     '{"workflow": "txn-monitor", "batch": 1100}', 
     NULL, 
     30001, now() - interval '1 day 6 hours', now() - interval '1 day 6 hours' + interval '30001 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 850}', 
     '{"processed": 850, "flagged": 2, "cleared": 848}', 
     1456, now() - interval '18 hours', now() - interval '18 hours' + interval '1456 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 720}', 
     '{"processed": 720, "flagged": 0, "cleared": 720}', 
     876, now() - interval '16 hours', now() - interval '16 hours' + interval '876 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "audit-report", "period": "2024-11"}', 
     '{"transactions": 456789, "alerts": 1234, "report_generated": true}', 
     12340, now() - interval '12 hours', now() - interval '12 hours' + interval '12340 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 320}', 
     '{"processed": 320, "flagged": 1, "cleared": 319}', 
     1098, now() - interval '4 hours', now() - interval '4 hours' + interval '1098 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 445}', 
     '{"processed": 445, "flagged": 0, "cleared": 445}', 
     945, now() - interval '3 hours', now() - interval '3 hours' + interval '945 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 512}', 
     '{"processed": 512, "flagged": 1, "cleared": 511}', 
     1123, now() - interval '2 hours', now() - interval '2 hours' + interval '1123 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'failed', 
     '{"workflow": "txn-monitor", "batch": 890}', 
     NULL, 
     2300, now() - interval '1 hour 30 minutes', now() - interval '1 hour 30 minutes' + interval '2300 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 678}', 
     '{"processed": 678, "flagged": 2, "cleared": 676}', 
     1234, now() - interval '1 hour', now() - interval '1 hour' + interval '1234 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 234}', 
     '{"processed": 234, "flagged": 0, "cleared": 234}', 
     756, now() - interval '45 minutes', now() - interval '45 minutes' + interval '756 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 156}', 
     '{"processed": 156, "flagged": 0, "cleared": 156}', 
     623, now() - interval '30 minutes', now() - interval '30 minutes' + interval '623 milliseconds'),
    (gen_random_uuid(), compliance_agent_id, test_user_id, 'completed', 
     '{"workflow": "txn-monitor", "batch": 298}', 
     '{"processed": 298, "flagged": 1, "cleared": 297}', 
     878, now() - interval '15 minutes', now() - interval '15 minutes' + interval '878 milliseconds')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 7. CLOUD DEPLOYMENTS
  -- ============================================================
  
  INSERT INTO public.cloud_deployments (agent_id, provider, region, status, instance_id, compute_tier, cost_estimate, deployed_at, resources)
  VALUES
    (agent1_id, 'aws', 'us-east-1', 'running', 'i-0abc123def456', 't3.medium', 45.00, now() - interval '2 days', 
     '{"lambda": "credit-risk-fn", "rds": "creditdb-prod", "s3": "credit-risk-data"}'),
    
    (agent2_id, 'azure', 'eastus', 'running', 'vm-compliance-prod', 'Standard_D2s_v3', 68.00, now() - interval '5 days', 
     '{"functions": "compliance-monitor", "cosmos": "compliance-db", "storage": "compliance-logs"}'),
    
    (agent2_id, 'gcp', 'us-central1', 'stopped', 'gke-compliance-test', 'n1-standard-2', 0, now() - interval '7 days', 
     '{"cloud_run": "compliance-test", "bigquery": "compliance-analytics"}'),
    
    -- Compliance Twin Deployments
    (compliance_agent_id, 'aws', 'us-east-1', 'running', 'i-comp-twin-prod', 't3.large', 85.00, now() - interval '3 days', 
     '{"lambda": "compliance-monitor-fn", "kinesis": "transaction-stream", "rds": "compliancedb-prod", "s3": "compliance-reports"}'),
    (compliance_agent_id, 'azure', 'eastus', 'running', 'vm-comp-twin-test', 'Standard_D4s_v3', 120.00, now() - interval '2 days', 
     '{"functions": "compliance-checker", "event_hubs": "txn-events", "cosmos": "compliance-docs", "storage": "audit-logs"}'),
    (compliance_agent_id, 'gcp', 'us-central1', 'deploying', 'gke-comp-twin-staging', 'n1-standard-4', 95.00, now() - interval '10 minutes', 
     '{"cloud_run": "compliance-service", "pub_sub": "transaction-topic", "bigquery": "compliance-analytics", "storage": "compliance-data"}')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 8. AGENT VERSIONS
  -- ============================================================
  
  INSERT INTO public.agent_versions (agent_id, version, commit_message, config_snapshot, published_by, published_at, deployed_to_env)
  VALUES
    (agent1_id, '0.9.0', 'Initial beta release', '{"model": "gpt-4", "temperature": 0.7}', test_user_id, now() - interval '10 days', ARRAY['dev']),
    (agent1_id, '1.0.0', 'Production release with improved accuracy', '{"model": "gpt-5", "temperature": 0.6}', test_user_id, now() - interval '2 days', ARRAY['dev', 'prod']),
    
    (agent2_id, '2.0.0', 'Major refactor for performance', '{"model": "gpt-4", "rules_engine": "v2"}', test_user_id, now() - interval '7 days', ARRAY['prod']),
    (agent2_id, '2.1.0', 'Added new compliance rules', '{"model": "gpt-5", "rules_engine": "v2.1"}', test_user_id, now() - interval '1 day', ARRAY['dev', 'test']),
    
    -- Compliance Twin Versions
    (compliance_agent_id, 'vv0.1', 'Initial compliance twin prototype', '{"model": "gpt-4", "risk_threshold": 0.75, "monitoring_enabled": true}', test_user_id, now() - interval '30 days', ARRAY['dev']),
    (compliance_agent_id, 'vv0.2', 'Enhanced transaction monitoring', '{"model": "gpt-5", "risk_threshold": 0.80, "monitoring_enabled": true, "batch_size": 1000}', test_user_id, now() - interval '15 days', ARRAY['dev', 'test']),
    (compliance_agent_id, 'vv0', 'Production release with multi-environment support', '{"model": "gpt-5", "risk_threshold": 0.85, "monitoring_enabled": true, "batch_size": 1500, "realtime_alerts": true}', test_user_id, now() - interval '3 days', ARRAY['dev', 'test', 'staging', 'prod'])
  ON CONFLICT (agent_id, version) DO NOTHING;

  -- ============================================================
  -- 9. AUDIT LOGS
  -- ============================================================
  
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES
    (test_user_id, 'agent_deployed', 'agent', agent1_id, '{"environment": "prod", "version": "1.0.0"}'),
    (test_user_id, 'agent_run', 'agent', agent1_id, '{"status": "completed", "duration_ms": 850}'),
    (test_user_id, 'agent_paused', 'agent', agent2_id, '{"environment": "dev"}'),
    (test_user_id, 'version_created', 'agent', agent2_id, '{"version": "2.1.0"}'),
    
    -- Compliance Twin Audit Logs
    (test_user_id, 'agent_deployed', 'agent', compliance_agent_id, '{"environment": "prod", "version": "vv0", "timestamp": "2024-11-28T10:00:00Z"}'),
    (test_user_id, 'version_created', 'agent', compliance_agent_id, '{"version": "vv0", "changes": "Production release", "approver": "admin"}'),
    (test_user_id, 'agent_updated', 'agent', compliance_agent_id, '{"field": "config", "changes": {"risk_threshold": {"old": 0.80, "new": 0.85}}}'),
    (test_user_id, 'workflow_updated', 'agent', compliance_agent_id, '{"workflow": "Transaction Monitoring Pipeline", "enabled": true}'),
    (test_user_id, 'deployment_created', 'agent', compliance_agent_id, '{"provider": "aws", "region": "us-east-1", "status": "running"}'),
    (test_user_id, 'role_granted', 'agent', compliance_agent_id, '{"user": "operator@example.com", "role": "operator", "scope": "agent:' || compliance_agent_id || '"}'),
    (test_user_id, 'agent_run', 'agent', compliance_agent_id, '{"status": "completed", "duration_ms": 1234, "transactions_processed": 1250}'),
    (test_user_id, 'alert_triggered', 'agent', compliance_agent_id, '{"alert_type": "high_risk_transaction", "txn_id": "TXN-45678", "risk_score": 0.87}'),
    (test_user_id, 'report_generated', 'agent', compliance_agent_id, '{"report_type": "audit", "period": "2024-11", "pages": 45}'),
    (test_user_id, 'agent_run', 'agent', compliance_agent_id, '{"status": "failed", "duration_ms": 30001, "error": "Timeout on sanctions API"}')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 10. SIMULATION RUNS (Industry-Specific Scenarios)
  -- ============================================================
  
  -- Banking/Compliance Simulations (Compliance Twin)
  INSERT INTO public.agent_runs (
    id, agent_id, user_id, run_type, input_query, output_summary,
    status, duration_ms, industry, scenario_label,
    created_at, completed_at
  )
  SELECT
    gen_random_uuid(),
    compliance_agent_id,
    test_user_id,
    'simulation',
    sim.input_query,
    sim.output_summary,
    sim.status,
    sim.duration_ms,
    'banking',
    sim.scenario_label,
    now() - (sim.hours_ago || ' hours')::interval,
    now() - (sim.hours_ago || ' hours')::interval + (sim.duration_ms || ' milliseconds')::interval
  FROM (VALUES
    (
      2,
      'High-risk wire transfer flagged for AML',
      'Simulate a suspicious $250,000 wire transfer from a high-risk jurisdiction and show how the compliance digital twin would flag and escalate it.',
      'Flagged transaction TXN-98765 ($250,000 USD → Cayman Islands). Risk score: 0.92. Matched OFAC watchlist. Escalated to L2 compliance review with full audit trail. Recommended action: HOLD pending manual review.',
      'completed',
      5200
    ),
    (
      4,
      'KYC/PEP match review',
      'Simulate onboarding a new client that partially matches a PEP/sanctions list and show the review workflow.',
      'Client onboarding simulation: Match found against PEP database (85% confidence). Triggered enhanced due diligence workflow. Generated risk assessment report. Status: PENDING manual review by compliance officer. EDD checklist: 12/15 items completed.',
      'completed',
      6100
    ),
    (
      8,
      'Regulatory breach backtest',
      'Simulate last quarter''s transactions to detect potential regulatory breaches and summarize top 3 risk findings.',
      'Analyzed 456,789 Q4 transactions. Detected 3 high-risk patterns: (1) 23 transactions exceeded single-transaction reporting threshold without CTR filing, (2) 8 customers showed structured deposit patterns, (3) 5 cross-border wires to high-risk jurisdictions without proper documentation. Generated compliance remediation plan.',
      'completed',
      7800
    ),
    (
      12,
      'Stress test - liquidity crisis',
      'Simulate a market liquidity crisis and show how the compliance twin would monitor exposure and trigger alerts.',
      'Simulated 30% market drop scenario. Monitored 1,234 client positions. Triggered 45 margin call alerts. Identified 12 clients at risk of forced liquidation. Generated exposure report for risk committee. Total at-risk exposure: $18.5M.',
      'completed',
      8900
    ),
    (
      24,
      'Real-time sanctions screening',
      'Simulate a batch of 500 transactions and show how many would be flagged for sanctions screening.',
      'Processed 500 simulated transactions. Screened against OFAC, EU, UN sanctions lists. Flagged 3 transactions for review (0.6% hit rate). Average screening time: 245ms per transaction. All flags were false positives after secondary review.',
      'completed',
      4500
    )
  ) AS sim(hours_ago, scenario_label, input_query, output_summary, status, duration_ms)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_runs r
    WHERE r.agent_id = compliance_agent_id
      AND r.run_type = 'simulation'
      AND r.scenario_label = sim.scenario_label
  );

  -- Banking/Risk Simulations (Credit Risk Agent)
  INSERT INTO public.agent_runs (
    id, agent_id, user_id, run_type, input_query, output_summary,
    status, duration_ms, industry, scenario_label,
    created_at, completed_at
  )
  SELECT
    gen_random_uuid(),
    agent1_id,
    test_user_id,
    'simulation',
    sim.input_query,
    sim.output_summary,
    sim.status,
    sim.duration_ms,
    'banking',
    sim.scenario_label,
    now() - (sim.hours_ago || ' hours')::interval,
    now() - (sim.hours_ago || ' hours')::interval + (sim.duration_ms || ' milliseconds')::interval
  FROM (VALUES
    (
      3,
      'Portfolio stress test',
      'Run a stress test on our retail portfolio and list top 5 clients at risk of non-compliance.',
      'Analyzed 2,456 retail credit accounts. Applied 3-sigma stress scenario (unemployment +15%, rates +2%). Identified 5 high-risk accounts: (1) Account #12345: 78% default probability, (2) Account #23456: 65% default probability, (3) Account #34567: 61% default probability, (4) Account #45678: 58% default probability, (5) Account #56789: 55% default probability. Recommended portfolio rebalancing.',
      'completed',
      9200
    ),
    (
      6,
      'Credit application - high risk',
      'Simulate evaluating a credit application from a high-risk applicant with inconsistent income documentation.',
      'Application #APP-9876 evaluated. Applicant: Self-employed, 2 years history. Requested: $75,000. Risk factors: Inconsistent income (3 months), high DTI ratio (48%), recent credit inquiry spike. Credit score: 640. Decision: DECLINED. Recommendation: Reapply after 6 months with consistent income proof.',
      'completed',
      1850
    ),
    (
      10,
      'Fraud pattern detection',
      'Simulate detecting fraud patterns across 1000 recent applications.',
      'Analyzed 1,000 credit applications. Detected 3 potential fraud rings: (1) Ring A: 8 applications with same IP/device, different identities (SSN mismatch), (2) Ring B: 5 applications with synthetic identities, (3) Ring C: 12 applications with document inconsistencies. Flagged 25 applications for manual review. Prevented estimated $450K in potential fraud losses.',
      'completed',
      12400
    )
  ) AS sim(hours_ago, scenario_label, input_query, output_summary, status, duration_ms)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_runs r
    WHERE r.agent_id = agent1_id
      AND r.run_type = 'simulation'
      AND r.scenario_label = sim.scenario_label
  );

  RAISE NOTICE 'Demo data seeded successfully!';
END $$;
