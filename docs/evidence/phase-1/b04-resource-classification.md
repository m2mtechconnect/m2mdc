# AURA DC — B-04 Tenant Resource Classification

Status: **PLANNED**. Classification is complete; enforcement is NOT applied.
Generated from live schema introspection on 2026-08-07 UTC.

Total tables in `public`: 113

## tenant_owned (11)

- `agents`
- `documents`
- `dsx_asset_mappings`
- `dsx_connections`
- `dsx_events`
- `dsx_events_quarantine`
- `dsx_gateway_heartbeats`
- `integrations`
- `integrations_connections`
- `profiles`
- `team_invites`

## tenant_owned_MISSING_tenant_id (52)

- `agent_action_logs`
- `agent_activity_logs`
- `agent_conversations`
- `agent_custom_questions`
- `agent_definition_runs`
- `agent_definitions`
- `agent_drafts`
- `agent_exports`
- `agent_integrations`
- `agent_memory`
- `agent_messages`
- `agent_runs`
- `agent_runtime_status`
- `agent_versions`
- `agent_workflows`
- `cloud_deployments`
- `content_embeddings`
- `copilot_events`
- `data_centre_twins`
- `dc_scan_sessions`
- `deployment_tracking`
- `deployments`
- `digital_twin_runs`
- `intelligence_settings`
- `organizations`
- `page_classifications`
- `page_summaries`
- `policies`
- `policy_bindings`
- `rag_chunks`
- `recommendations`
- `roi_assumptions`
- `roi_snapshots`
- `simulation_runs`
- `site_crawls`
- `site_pages`
- `sites`
- `sovereign_dc_facilities`
- `system_builder_state`
- `system_integrations`
- `twin_agent_bindings`
- `twin_carbon_emissions`
- `twin_financial_records`
- `twin_kpi_snapshots`
- `twin_simulation_runs`
- `twin_sovereignty_events`
- `twin_telemetry`
- `workflow_edges`
- `workflow_nodes`
- `workflow_run_events`
- `workflow_runs`
- `workflows`

## user_private (20)

- `captured_pages`
- `contact_expert_logs`
- `copilot_memory`
- `copilot_sessions`
- `digital_twins`
- `document_analysis_jobs`
- `indexed_content`
- `integration_logs`
- `integration_sync_logs`
- `integrations_tokens`
- `knowledge_sources`
- `mcp_credentials`
- `mcp_tokens`
- `rag_documents`
- `rag_items`
- `rag_tokens`
- `search_history`
- `sovereign_dc_simulation_runs`
- `user_preferences`
- `user_roles`

## platform_global (12)

- `agent_environments`
- `agent_templates`
- `data_centre_locations`
- `dc_blueprint_templates`
- `departments`
- `environments`
- `funding_programs`
- `industry_agents`
- `industry_templates`
- `m2m_templates`
- `mcp_servers_catalog`
- `zapier_apps`

## deliberately_public (1)

- `onboarding_submissions`

## system_internal (17)

- `agent_suggestions_cache`
- `ai_recommendations_cache`
- `audit_logs`
- `capture_cache`
- `copilot_sessions_cache`
- `crawl_jobs`
- `dsx_ingestion_audit`
- `heartbeats`
- `mcp_sync_runs`
- `oauth_states`
- `policy_audit`
- `role_change_audit`
- `scraper_logs`
- `search_analytics`
- `system_events`
- `system_health`
- `website_content_cache`

## Consequence

Only the tables in `tenant_owned` carry an authoritative `org_id`. Every table in
`tenant_owned_MISSING_tenant_id` is reachable today via ownership or twin/agent
lineage alone, so cross-tenant containment cannot be enforced for them. Closing
B-04 requires, per table: a NOT NULL `tenant_id`, a membership-validating RLS
policy, an immutability trigger on `tenant_id`, and a composite foreign key that
makes cross-tenant parent-child rows unrepresentable.

## Not yet classified

Storage buckets, realtime publications and the 156 Edge Functions are NOT included
above and remain UNVERIFIED.
