export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_action_logs: {
        Row: {
          action_key: string
          action_params: Json | null
          connection_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          response: Json | null
          run_id: string | null
          status: string
          system_id: string | null
          trace_id: string | null
        }
        Insert: {
          action_key: string
          action_params?: Json | null
          connection_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          response?: Json | null
          run_id?: string | null
          status: string
          system_id?: string | null
          trace_id?: string | null
        }
        Update: {
          action_key?: string
          action_params?: Json | null
          connection_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          response?: Json | null
          run_id?: string | null
          status?: string
          system_id?: string | null
          trace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_action_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integrations_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_logs_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_activity_logs: {
        Row: {
          agent_id: string
          created_at: string | null
          details: Json | null
          id: string
          log_type: string
          message: string
          run_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          log_type: string
          message: string
          run_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          log_type?: string
          message?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activity_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_custom_questions: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          question_text: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          question_text: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          question_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_custom_questions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_definition_runs: {
        Row: {
          agent_definition_id: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          logs: Json | null
          metrics: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          twin_id: string | null
          user_id: string | null
        }
        Insert: {
          agent_definition_id: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          logs?: Json | null
          metrics?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          twin_id?: string | null
          user_id?: string | null
        }
        Update: {
          agent_definition_id?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          logs?: Json | null
          metrics?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          twin_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_definition_runs_agent_definition_id_fkey"
            columns: ["agent_definition_id"]
            isOneToOne: false
            referencedRelation: "agent_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_definition_runs_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_definitions: {
        Row: {
          avg_duration_ms: number | null
          created_at: string | null
          description: string | null
          domain: string
          icon: string | null
          id: string
          inputs: Json | null
          is_active: boolean | null
          is_system_default: boolean | null
          kpi_bindings: Json | null
          last_run_at: string | null
          name: string
          outputs: Json | null
          owner_id: string | null
          runtime_config: Json | null
          safety_rules: Json | null
          slug: string
          success_rate: number | null
          tools: Json | null
          total_runs: number | null
          twin_id: string | null
          type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          avg_duration_ms?: number | null
          created_at?: string | null
          description?: string | null
          domain: string
          icon?: string | null
          id?: string
          inputs?: Json | null
          is_active?: boolean | null
          is_system_default?: boolean | null
          kpi_bindings?: Json | null
          last_run_at?: string | null
          name: string
          outputs?: Json | null
          owner_id?: string | null
          runtime_config?: Json | null
          safety_rules?: Json | null
          slug: string
          success_rate?: number | null
          tools?: Json | null
          total_runs?: number | null
          twin_id?: string | null
          type?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          avg_duration_ms?: number | null
          created_at?: string | null
          description?: string | null
          domain?: string
          icon?: string | null
          id?: string
          inputs?: Json | null
          is_active?: boolean | null
          is_system_default?: boolean | null
          kpi_bindings?: Json | null
          last_run_at?: string | null
          name?: string
          outputs?: Json | null
          owner_id?: string | null
          runtime_config?: Json | null
          safety_rules?: Json | null
          slug?: string
          success_rate?: number | null
          tools?: Json | null
          total_runs?: number | null
          twin_id?: string | null
          type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_definitions_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_drafts: {
        Row: {
          config: Json | null
          created_at: string | null
          goal: Json | null
          id: string
          idempotency_key: string | null
          meta: Json | null
          owner_id: string
          site_id: string | null
          status: string | null
          step_completed: number | null
          template_ref: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          goal?: Json | null
          id?: string
          idempotency_key?: string | null
          meta?: Json | null
          owner_id: string
          site_id?: string | null
          status?: string | null
          step_completed?: number | null
          template_ref?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          goal?: Json | null
          id?: string
          idempotency_key?: string | null
          meta?: Json | null
          owner_id?: string
          site_id?: string | null
          status?: string | null
          step_completed?: number | null
          template_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_drafts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_environments: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      agent_exports: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          export_type: string
          file_path: string | null
          id: string
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          export_type: string
          file_path?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          export_type?: string
          file_path?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_exports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_integrations: {
        Row: {
          capabilities: Json | null
          connection_id: string | null
          created_at: string | null
          id: string
          provider: string
          status: string
          system_id: string
          updated_at: string | null
          version_id: string | null
        }
        Insert: {
          capabilities?: Json | null
          connection_id?: string | null
          created_at?: string | null
          id?: string
          provider?: string
          status?: string
          system_id: string
          updated_at?: string | null
          version_id?: string | null
        }
        Update: {
          capabilities?: Json | null
          connection_id?: string | null
          created_at?: string | null
          id?: string
          provider?: string
          status?: string
          system_id?: string
          updated_at?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_integrations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integrations_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_integrations_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          agent_id: string
          state: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          state?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          state?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          citations: Json | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          status: string
          twin_id: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          citations?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          status?: string
          twin_id?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          citations?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          status?: string
          twin_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runtime_status: {
        Row: {
          agent_id: string
          created_at: string | null
          current_version: string
          environment: string
          error_message: string | null
          health_status: string | null
          id: string
          last_action: string | null
          last_action_at: string | null
          metadata: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          current_version?: string
          environment?: string
          error_message?: string | null
          health_status?: string | null
          id?: string
          last_action?: string | null
          last_action_at?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          current_version?: string
          environment?: string
          error_message?: string | null
          health_status?: string | null
          id?: string
          last_action?: string | null
          last_action_at?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runtime_status_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_suggestions_cache: {
        Row: {
          chips: string[] | null
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          query: string
          query_hash: string
          suggestions: Json
        }
        Insert: {
          chips?: string[] | null
          created_at?: string
          expires_at: string
          hit_count?: number | null
          id?: string
          query: string
          query_hash: string
          suggestions: Json
        }
        Update: {
          chips?: string[] | null
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          query?: string
          query_hash?: string
          suggestions?: Json
        }
        Relationships: []
      }
      agent_templates: {
        Row: {
          category: string
          created_at: string | null
          default_config: Json
          description: string
          icon: string
          id: string
          kpi_definitions: Json | null
          name: string
          recommended_models: Json | null
          sample_prompts: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_config?: Json
          description: string
          icon: string
          id: string
          kpi_definitions?: Json | null
          name: string
          recommended_models?: Json | null
          sample_prompts?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_config?: Json
          description?: string
          icon?: string
          id?: string
          kpi_definitions?: Json | null
          name?: string
          recommended_models?: Json | null
          sample_prompts?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_versions: {
        Row: {
          agent_id: string
          commit_message: string | null
          config_snapshot: Json
          deployed_to_env: string[] | null
          id: string
          is_rollback: boolean | null
          metadata: Json | null
          parent_version_id: string | null
          published_at: string | null
          published_by: string
          version: string
        }
        Insert: {
          agent_id: string
          commit_message?: string | null
          config_snapshot: Json
          deployed_to_env?: string[] | null
          id?: string
          is_rollback?: boolean | null
          metadata?: Json | null
          parent_version_id?: string | null
          published_at?: string | null
          published_by: string
          version: string
        }
        Update: {
          agent_id?: string
          commit_message?: string | null
          config_snapshot?: Json
          deployed_to_env?: string[] | null
          id?: string
          is_rollback?: boolean | null
          metadata?: Json | null
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "agent_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflows: {
        Row: {
          agent_id: string
          created_at: string | null
          enabled: boolean | null
          id: string
          name: string
          trigger_type: string | null
          twin_id: string | null
          updated_at: string | null
          workflow_json: Json
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          trigger_type?: string | null
          twin_id?: string | null
          updated_at?: string | null
          workflow_json: Json
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          trigger_type?: string | null
          twin_id?: string | null
          updated_at?: string | null
          workflow_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflows_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_workflows_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          config: Json | null
          connector_ids: string[] | null
          created_at: string | null
          deployed_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          last_heartbeat: string | null
          model_id: string | null
          name: string
          org_id: string | null
          owner_id: string
          status: string
          success_rate: number | null
          template_id: string | null
          total_runs: number | null
          twin_id: string | null
          updated_at: string | null
          version: string
          workflow_graph_id: string | null
        }
        Insert: {
          config?: Json | null
          connector_ids?: string[] | null
          created_at?: string | null
          deployed_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          last_heartbeat?: string | null
          model_id?: string | null
          name: string
          org_id?: string | null
          owner_id: string
          status?: string
          success_rate?: number | null
          template_id?: string | null
          total_runs?: number | null
          twin_id?: string | null
          updated_at?: string | null
          version?: string
          workflow_graph_id?: string | null
        }
        Update: {
          config?: Json | null
          connector_ids?: string[] | null
          created_at?: string | null
          deployed_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          last_heartbeat?: string | null
          model_id?: string | null
          name?: string
          org_id?: string | null
          owner_id?: string
          status?: string
          success_rate?: number | null
          template_id?: string | null
          total_runs?: number | null
          twin_id?: string | null
          updated_at?: string | null
          version?: string
          workflow_graph_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations_cache: {
        Row: {
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          model_version: string | null
          recommendations: Json
          site_hash: string | null
          site_url: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          model_version?: string | null
          recommendations: Json
          site_hash?: string | null
          site_url?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          model_version?: string | null
          recommendations?: Json
          site_hash?: string | null
          site_url?: string | null
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_canary_events: {
        Row: {
          action: string
          actor_id: string | null
          asset_id: string
          asset_version: string
          created_at: string
          glb_checksum: string | null
          id: string
          reason: string | null
          scope: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          asset_id: string
          asset_version: string
          created_at?: string
          glb_checksum?: string | null
          id?: string
          reason?: string | null
          scope: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          asset_id?: string
          asset_version?: string
          created_at?: string
          glb_checksum?: string | null
          id?: string
          reason?: string | null
          scope?: string
        }
        Relationships: []
      }
      asset_gpu_validation_runs: {
        Row: {
          acceptance_result: string
          app_version: string | null
          asset_checksum: string
          asset_id: string
          benchmark_config: Json
          created_at: string
          delivery: Json
          findings: Json
          id: string
          manifest_version: number | null
          performance: Json
          renderer: Json
          scenario_id: string
          screenshot_references: Json
          validated_at: string
          validated_by: string
          verdict: string
        }
        Insert: {
          acceptance_result: string
          app_version?: string | null
          asset_checksum: string
          asset_id: string
          benchmark_config?: Json
          created_at?: string
          delivery?: Json
          findings?: Json
          id?: string
          manifest_version?: number | null
          performance?: Json
          renderer?: Json
          scenario_id: string
          screenshot_references?: Json
          validated_at?: string
          validated_by: string
          verdict: string
        }
        Update: {
          acceptance_result?: string
          app_version?: string | null
          asset_checksum?: string
          asset_id?: string
          benchmark_config?: Json
          created_at?: string
          delivery?: Json
          findings?: Json
          id?: string
          manifest_version?: number | null
          performance?: Json
          renderer?: Json
          scenario_id?: string
          screenshot_references?: Json
          validated_at?: string
          validated_by?: string
          verdict?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          org_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          org_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          org_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      capture_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          domain: string
          expires_at: string
          id: string
          result: Json
          url: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          domain: string
          expires_at: string
          id?: string
          result: Json
          url: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          domain?: string
          expires_at?: string
          id?: string
          result?: Json
          url?: string
        }
        Relationships: []
      }
      captured_pages: {
        Row: {
          content: string | null
          content_hash: string
          created_at: string | null
          id: string
          metadata: Json | null
          title: string | null
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          content_hash: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          content_hash?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cloud_deployments: {
        Row: {
          agent_id: string
          compute_tier: string | null
          cost_estimate: number | null
          created_at: string | null
          deployed_at: string | null
          endpoints: Json | null
          environment_id: string | null
          id: string
          instance_id: string | null
          provider: string
          region: string
          resources: Json | null
          status: string
          stopped_at: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          compute_tier?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          deployed_at?: string | null
          endpoints?: Json | null
          environment_id?: string | null
          id?: string
          instance_id?: string | null
          provider: string
          region: string
          resources?: Json | null
          status?: string
          stopped_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          compute_tier?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          deployed_at?: string | null
          endpoints?: Json | null
          environment_id?: string | null
          id?: string
          instance_id?: string | null
          provider?: string
          region?: string
          resources?: Json | null
          status?: string
          stopped_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloud_deployments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_deployments_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "agent_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          approval_reference: string | null
          connection_id: string | null
          correlation_id: string | null
          created_at: string
          evidence: Json
          facility_id: string | null
          id: string
          new_state: string | null
          previous_state: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          approval_reference?: string | null
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string
          evidence?: Json
          facility_id?: string | null
          id?: string
          new_state?: string | null
          previous_state?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          approval_reference?: string | null
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string
          evidence?: Json
          facility_id?: string | null
          id?: string
          new_state?: string | null
          previous_state?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_audit_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_credential_events: {
        Row: {
          action: string
          actor_id: string | null
          connection_id: string
          correlation_id: string | null
          created_at: string
          fingerprint: string | null
          id: string
          tenant_id: string | null
          version: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          connection_id: string
          correlation_id?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          tenant_id?: string | null
          version: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          connection_id?: string
          correlation_id?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          tenant_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "connection_credential_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_credentials: {
        Row: {
          auth_method: string
          ciphertext: string
          connection_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          fingerprint: string
          id: string
          last_rotated_at: string
          rotated_by: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          auth_method: string
          ciphertext: string
          connection_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          fingerprint: string
          id?: string
          last_rotated_at?: string
          rotated_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          auth_method?: string
          ciphertext?: string
          connection_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          fingerprint?: string
          id?: string
          last_rotated_at?: string
          rotated_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "connection_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_data_contracts: {
        Row: {
          checksum: string | null
          compatibility: string | null
          connector_id: string
          created_at: string
          data_classification: string
          direction: string
          id: string
          official_source: string | null
          schema_type: string
          schema_version: string
          tenant_id: string | null
          timestamp_rules: Json
          unit_rules: Json
          validation_status: string
        }
        Insert: {
          checksum?: string | null
          compatibility?: string | null
          connector_id: string
          created_at?: string
          data_classification?: string
          direction?: string
          id?: string
          official_source?: string | null
          schema_type: string
          schema_version: string
          tenant_id?: string | null
          timestamp_rules?: Json
          unit_rules?: Json
          validation_status?: string
        }
        Update: {
          checksum?: string | null
          compatibility?: string | null
          connector_id?: string
          created_at?: string
          data_classification?: string
          direction?: string
          id?: string
          official_source?: string | null
          schema_type?: string
          schema_version?: string
          tenant_id?: string | null
          timestamp_rules?: Json
          unit_rules?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_data_contracts_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "connector_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_health_checks: {
        Row: {
          auth_result: string | null
          check_type: string
          completed_at: string | null
          connection_id: string
          correlation_id: string | null
          data_availability: string | null
          dns_result: string | null
          error_code: string | null
          evidence_reference: string | null
          id: string
          latency_ms: number | null
          mapping_result: string | null
          network_result: string | null
          requested_by: string | null
          safe_message: string | null
          schema_result: string | null
          started_at: string
          status: string
          tls_result: string | null
        }
        Insert: {
          auth_result?: string | null
          check_type: string
          completed_at?: string | null
          connection_id: string
          correlation_id?: string | null
          data_availability?: string | null
          dns_result?: string | null
          error_code?: string | null
          evidence_reference?: string | null
          id?: string
          latency_ms?: number | null
          mapping_result?: string | null
          network_result?: string | null
          requested_by?: string | null
          safe_message?: string | null
          schema_result?: string | null
          started_at?: string
          status?: string
          tls_result?: string | null
        }
        Update: {
          auth_result?: string | null
          check_type?: string
          completed_at?: string | null
          connection_id?: string
          correlation_id?: string | null
          data_availability?: string | null
          dns_result?: string | null
          error_code?: string | null
          evidence_reference?: string | null
          id?: string
          latency_ms?: number | null
          mapping_result?: string | null
          network_result?: string | null
          requested_by?: string | null
          safe_message?: string | null
          schema_result?: string | null
          started_at?: string
          status?: string
          tls_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_health_checks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_ingest_messages: {
        Row: {
          connection_id: string
          contract_id: string | null
          correlation_id: string
          created_at: string
          detail: string | null
          event_id: string | null
          evidence_class: string
          id: string
          ingest_run_id: string | null
          mapping_id: string | null
          observed_at: string | null
          outcome: string
          payload_bytes: number
          payload_hash: string
          processing_latency_ms: number | null
          qos: number | null
          received_at: string
          rejection_reason: string | null
          tenant_id: string | null
          topic: string
          transport_latency_ms: number | null
          worker_id: string | null
        }
        Insert: {
          connection_id: string
          contract_id?: string | null
          correlation_id: string
          created_at?: string
          detail?: string | null
          event_id?: string | null
          evidence_class?: string
          id?: string
          ingest_run_id?: string | null
          mapping_id?: string | null
          observed_at?: string | null
          outcome: string
          payload_bytes?: number
          payload_hash: string
          processing_latency_ms?: number | null
          qos?: number | null
          received_at?: string
          rejection_reason?: string | null
          tenant_id?: string | null
          topic: string
          transport_latency_ms?: number | null
          worker_id?: string | null
        }
        Update: {
          connection_id?: string
          contract_id?: string | null
          correlation_id?: string
          created_at?: string
          detail?: string | null
          event_id?: string | null
          evidence_class?: string
          id?: string
          ingest_run_id?: string | null
          mapping_id?: string | null
          observed_at?: string | null
          outcome?: string
          payload_bytes?: number
          payload_hash?: string
          processing_latency_ms?: number | null
          qos?: number | null
          received_at?: string
          rejection_reason?: string | null
          tenant_id?: string | null
          topic?: string
          transport_latency_ms?: number | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_ingest_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_ingest_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "connection_data_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_ingest_messages_ingest_run_id_fkey"
            columns: ["ingest_run_id"]
            isOneToOne: false
            referencedRelation: "connection_ingest_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_ingest_messages_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "connection_twin_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_ingest_runs: {
        Row: {
          completed_at: string | null
          connection_id: string
          correlation_id: string | null
          dead_letter_count: number
          duplicate_events: number
          evidence_class: string
          final_status: string
          id: string
          mapped_properties: number
          mapping_failures: number
          max_latency_ms: number | null
          records_accepted: number
          records_received: number
          records_rejected: number
          retries: number
          source_endpoint: string | null
          started_at: string
          tenant_id: string | null
          worker_id: string | null
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          correlation_id?: string | null
          dead_letter_count?: number
          duplicate_events?: number
          evidence_class?: string
          final_status?: string
          id?: string
          mapped_properties?: number
          mapping_failures?: number
          max_latency_ms?: number | null
          records_accepted?: number
          records_received?: number
          records_rejected?: number
          retries?: number
          source_endpoint?: string | null
          started_at?: string
          tenant_id?: string | null
          worker_id?: string | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          correlation_id?: string | null
          dead_letter_count?: number
          duplicate_events?: number
          evidence_class?: string
          final_status?: string
          id?: string
          mapped_properties?: number
          mapping_failures?: number
          max_latency_ms?: number | null
          records_accepted?: number
          records_received?: number
          records_rejected?: number
          retries?: number
          source_endpoint?: string | null
          started_at?: string
          tenant_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_ingest_runs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_instances: {
        Row: {
          binding_class: string
          configuration: Json
          connector_id: string
          created_at: string
          created_by: string | null
          credential_reference: string | null
          data_direction: string
          disclosure_limitations: string[]
          display_name: string
          enabled: boolean
          endpoint_reference: string | null
          environment: string
          facility_id: string | null
          id: string
          is_system: boolean
          last_error: string | null
          last_ingest_at: string | null
          last_success_at: string | null
          last_tested_at: string | null
          last_verification_at: string | null
          last_verified_at: string | null
          owner_id: string | null
          platform_binding_state: string
          status: string
          status_reason: string | null
          tenant_id: string | null
          updated_at: string
          verification_evidence: Json | null
          verification_reason: string | null
          verification_state: string
          verified_by: string | null
        }
        Insert: {
          binding_class?: string
          configuration?: Json
          connector_id: string
          created_at?: string
          created_by?: string | null
          credential_reference?: string | null
          data_direction?: string
          disclosure_limitations?: string[]
          display_name: string
          enabled?: boolean
          endpoint_reference?: string | null
          environment?: string
          facility_id?: string | null
          id?: string
          is_system?: boolean
          last_error?: string | null
          last_ingest_at?: string | null
          last_success_at?: string | null
          last_tested_at?: string | null
          last_verification_at?: string | null
          last_verified_at?: string | null
          owner_id?: string | null
          platform_binding_state?: string
          status?: string
          status_reason?: string | null
          tenant_id?: string | null
          updated_at?: string
          verification_evidence?: Json | null
          verification_reason?: string | null
          verification_state?: string
          verified_by?: string | null
        }
        Update: {
          binding_class?: string
          configuration?: Json
          connector_id?: string
          created_at?: string
          created_by?: string | null
          credential_reference?: string | null
          data_direction?: string
          disclosure_limitations?: string[]
          display_name?: string
          enabled?: boolean
          endpoint_reference?: string | null
          environment?: string
          facility_id?: string | null
          id?: string
          is_system?: boolean
          last_error?: string | null
          last_ingest_at?: string | null
          last_success_at?: string | null
          last_tested_at?: string | null
          last_verification_at?: string | null
          last_verified_at?: string | null
          owner_id?: string | null
          platform_binding_state?: string
          status?: string
          status_reason?: string | null
          tenant_id?: string | null
          updated_at?: string
          verification_evidence?: Json | null
          verification_reason?: string | null
          verification_state?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_instances_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "connector_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_runtime_workers: {
        Row: {
          broker_url: string | null
          connect_count: number
          connection_id: string
          created_at: string
          evidence_class: string
          id: string
          last_error: string | null
          last_heartbeat_at: string
          protocol: string | null
          reconnect_count: number
          runtime: string
          started_at: string
          state: string
          stopped_at: string | null
          subscribed_topics: string[]
          tenant_id: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          broker_url?: string | null
          connect_count?: number
          connection_id: string
          created_at?: string
          evidence_class?: string
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string
          protocol?: string | null
          reconnect_count?: number
          runtime: string
          started_at?: string
          state?: string
          stopped_at?: string | null
          subscribed_topics?: string[]
          tenant_id?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          broker_url?: string | null
          connect_count?: number
          connection_id?: string
          created_at?: string
          evidence_class?: string
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string
          protocol?: string | null
          reconnect_count?: number
          runtime?: string
          started_at?: string
          state?: string
          stopped_at?: string | null
          subscribed_topics?: string[]
          tenant_id?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_runtime_workers_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_twin_mappings: {
        Row: {
          active: boolean
          connection_id: string
          conversion_rule: string | null
          created_at: string
          data_type: string
          direction: string
          id: string
          last_mapped_at: string | null
          last_mapped_value: Json | null
          mapping_owner: string | null
          quality_rule: string | null
          sample_value: Json | null
          source_identifier: string
          source_unit: string | null
          target_entity: string | null
          target_facility_id: string | null
          target_prim_path: string | null
          target_property: string | null
          target_unit: string | null
          timestamp_rule: string | null
          updated_at: string
          validation_status: string
        }
        Insert: {
          active?: boolean
          connection_id: string
          conversion_rule?: string | null
          created_at?: string
          data_type?: string
          direction?: string
          id?: string
          last_mapped_at?: string | null
          last_mapped_value?: Json | null
          mapping_owner?: string | null
          quality_rule?: string | null
          sample_value?: Json | null
          source_identifier: string
          source_unit?: string | null
          target_entity?: string | null
          target_facility_id?: string | null
          target_prim_path?: string | null
          target_property?: string | null
          target_unit?: string | null
          timestamp_rule?: string | null
          updated_at?: string
          validation_status?: string
        }
        Update: {
          active?: boolean
          connection_id?: string
          conversion_rule?: string | null
          created_at?: string
          data_type?: string
          direction?: string
          id?: string
          last_mapped_at?: string | null
          last_mapped_value?: Json | null
          mapping_owner?: string | null
          quality_rule?: string | null
          sample_value?: Json | null
          source_identifier?: string
          source_unit?: string | null
          target_entity?: string | null
          target_facility_id?: string | null
          target_prim_path?: string | null
          target_property?: string | null
          target_unit?: string | null
          timestamp_rule?: string | null
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_twin_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_definitions: {
        Row: {
          availability: string
          capability_evidence: Json
          category: string
          configuration_schema: Json
          created_at: string
          documentation_url: string | null
          id: string
          implementation_status: string
          mapping_required: boolean
          name: string
          provider: string
          publication_status: string
          runtime_adapter: string | null
          supported_auth_methods: string[]
          supported_data_classes: string[]
          supported_directions: string[]
          supported_protocols: string[]
          updated_at: string
          validation_status: string
          version: string
        }
        Insert: {
          availability?: string
          capability_evidence?: Json
          category: string
          configuration_schema?: Json
          created_at?: string
          documentation_url?: string | null
          id: string
          implementation_status?: string
          mapping_required?: boolean
          name: string
          provider: string
          publication_status?: string
          runtime_adapter?: string | null
          supported_auth_methods?: string[]
          supported_data_classes?: string[]
          supported_directions?: string[]
          supported_protocols?: string[]
          updated_at?: string
          validation_status?: string
          version?: string
        }
        Update: {
          availability?: string
          capability_evidence?: Json
          category?: string
          configuration_schema?: Json
          created_at?: string
          documentation_url?: string | null
          id?: string
          implementation_status?: string
          mapping_required?: boolean
          name?: string
          provider?: string
          publication_status?: string
          runtime_adapter?: string | null
          supported_auth_methods?: string[]
          supported_data_classes?: string[]
          supported_directions?: string[]
          supported_protocols?: string[]
          updated_at?: string
          validation_status?: string
          version?: string
        }
        Relationships: []
      }
      contact_expert_logs: {
        Row: {
          correlation_id: string
          created_at: string
          email: string
          id: string
          intake_source: string
          is_anonymous: boolean
          message: string | null
          name: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          correlation_id?: string
          created_at?: string
          email: string
          id?: string
          intake_source?: string
          is_anonymous?: boolean
          message?: string | null
          name: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          correlation_id?: string
          created_at?: string
          email?: string
          id?: string
          intake_source?: string
          is_anonymous?: boolean
          message?: string | null
          name?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          content_id: string | null
          created_at: string | null
          embedding: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          content_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          content_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_embeddings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "indexed_content"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_events: {
        Row: {
          action_clicked: string | null
          agent_id: string | null
          context: Json
          created_at: string
          id: string
          latency_ms: number | null
          model: string | null
          prompt: string
          response_summary: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          action_clicked?: string | null
          agent_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt: string
          response_summary?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          action_clicked?: string | null
          agent_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt?: string
          response_summary?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_memory: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      copilot_sessions: {
        Row: {
          context: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          last_query: string | null
          response_count: number | null
          session_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_query?: string | null
          response_count?: number | null
          session_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_query?: string | null
          response_count?: number | null
          session_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      copilot_sessions_cache: {
        Row: {
          citations: Json | null
          confidence: number | null
          created_at: string
          hit_count: number | null
          id: string
          last_accessed: string
          query: string
          response: string
          source: string
          user_id: string
        }
        Insert: {
          citations?: Json | null
          confidence?: number | null
          created_at?: string
          hit_count?: number | null
          id?: string
          last_accessed?: string
          query: string
          response: string
          source: string
          user_id: string
        }
        Update: {
          citations?: Json | null
          confidence?: number | null
          created_at?: string
          hit_count?: number | null
          id?: string
          last_accessed?: string
          query?: string
          response?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      crawl_jobs: {
        Row: {
          bytes_fetched: number | null
          completed_at: string | null
          created_at: string | null
          depth: number | null
          error_message: string | null
          id: string
          max_depth: number | null
          max_retries: number | null
          metadata: Json | null
          pages_crawled: number | null
          retries: number | null
          robots_allowed: boolean | null
          started_at: string | null
          status: string
          url: string
        }
        Insert: {
          bytes_fetched?: number | null
          completed_at?: string | null
          created_at?: string | null
          depth?: number | null
          error_message?: string | null
          id?: string
          max_depth?: number | null
          max_retries?: number | null
          metadata?: Json | null
          pages_crawled?: number | null
          retries?: number | null
          robots_allowed?: boolean | null
          started_at?: string | null
          status?: string
          url: string
        }
        Update: {
          bytes_fetched?: number | null
          completed_at?: string | null
          created_at?: string | null
          depth?: number | null
          error_message?: string | null
          id?: string
          max_depth?: number | null
          max_retries?: number | null
          metadata?: Json | null
          pages_crawled?: number | null
          retries?: number | null
          robots_allowed?: boolean | null
          started_at?: string | null
          status?: string
          url?: string
        }
        Relationships: []
      }
      data_centre_locations: {
        Row: {
          capacity_kw: number
          city: string
          cloud_region: string | null
          country: string
          created_at: string
          created_by: string
          id: string
          industry: string
          name: string
          provider_type: string
          province: string | null
          tags: Json | null
          tier: string
          updated_at: string
        }
        Insert: {
          capacity_kw?: number
          city: string
          cloud_region?: string | null
          country?: string
          created_at?: string
          created_by: string
          id?: string
          industry?: string
          name: string
          provider_type?: string
          province?: string | null
          tags?: Json | null
          tier?: string
          updated_at?: string
        }
        Update: {
          capacity_kw?: number
          city?: string
          cloud_region?: string | null
          country?: string
          created_at?: string
          created_by?: string
          id?: string
          industry?: string
          name?: string
          provider_type?: string
          province?: string | null
          tags?: Json | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_centre_twins: {
        Row: {
          blueprint_id: string | null
          capacity_kw: number
          carbon_intensity: number | null
          city: string
          created_at: string
          created_by_user: string
          deployed_at: string | null
          id: string
          industry: string | null
          location_id: string | null
          metadata: Json | null
          name: string
          pue_target: number | null
          region_code: string
          renewable_target_pct: number | null
          sovereignty_level: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          blueprint_id?: string | null
          capacity_kw?: number
          carbon_intensity?: number | null
          city: string
          created_at?: string
          created_by_user: string
          deployed_at?: string | null
          id?: string
          industry?: string | null
          location_id?: string | null
          metadata?: Json | null
          name: string
          pue_target?: number | null
          region_code: string
          renewable_target_pct?: number | null
          sovereignty_level?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          blueprint_id?: string | null
          capacity_kw?: number
          carbon_intensity?: number | null
          city?: string
          created_at?: string
          created_by_user?: string
          deployed_at?: string | null
          id?: string
          industry?: string | null
          location_id?: string | null
          metadata?: Json | null
          name?: string
          pue_target?: number | null
          region_code?: string
          renewable_target_pct?: number | null
          sovereignty_level?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_centre_twins_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "digital_twins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_centre_twins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "data_centre_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_blueprint_templates: {
        Row: {
          annual_carbon_target_tonnes: number
          compliance_focus: string[]
          cost_focus: string | null
          created_at: string
          default_agents: string[]
          default_capacity_kw: number
          default_tier: string
          description: string | null
          id: string
          name: string
          renewable_target_pct: number
          slug: string
          sovereign_compute_pct: number
          sustainability_focus: string[]
          target_pue: number
          updated_at: string
        }
        Insert: {
          annual_carbon_target_tonnes?: number
          compliance_focus?: string[]
          cost_focus?: string | null
          created_at?: string
          default_agents?: string[]
          default_capacity_kw?: number
          default_tier?: string
          description?: string | null
          id?: string
          name: string
          renewable_target_pct?: number
          slug: string
          sovereign_compute_pct?: number
          sustainability_focus?: string[]
          target_pue?: number
          updated_at?: string
        }
        Update: {
          annual_carbon_target_tonnes?: number
          compliance_focus?: string[]
          cost_focus?: string | null
          created_at?: string
          default_agents?: string[]
          default_capacity_kw?: number
          default_tier?: string
          description?: string | null
          id?: string
          name?: string
          renewable_target_pct?: number
          slug?: string
          sovereign_compute_pct?: number
          sustainability_focus?: string[]
          target_pue?: number
          updated_at?: string
        }
        Relationships: []
      }
      dc_scan_sessions: {
        Row: {
          blueprint_id: string | null
          blueprint_profile: string
          created_at: string
          detected_industry: string
          id: string
          raw_signals: Json | null
          recommendation_json: Json | null
          sustainability_priority: string
          traffic_scale: string
          twin_id: string | null
          url: string
          user_id: string
        }
        Insert: {
          blueprint_id?: string | null
          blueprint_profile: string
          created_at?: string
          detected_industry?: string
          id?: string
          raw_signals?: Json | null
          recommendation_json?: Json | null
          sustainability_priority?: string
          traffic_scale?: string
          twin_id?: string | null
          url: string
          user_id: string
        }
        Update: {
          blueprint_id?: string | null
          blueprint_profile?: string
          created_at?: string
          detected_industry?: string
          id?: string
          raw_signals?: Json | null
          recommendation_json?: Json | null
          sustainability_priority?: string
          traffic_scale?: string
          twin_id?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dc_scan_sessions_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      deployment_tracking: {
        Row: {
          accuracy_estimate: number | null
          connector_count: number | null
          created_at: string
          deployed_at: string
          deployed_by: string
          id: string
          metadata: Json | null
          model_id: string | null
          roi_estimate: Json | null
          status: string
          system_id: string
          tool_count: number | null
          updated_at: string
        }
        Insert: {
          accuracy_estimate?: number | null
          connector_count?: number | null
          created_at?: string
          deployed_at?: string
          deployed_by: string
          id?: string
          metadata?: Json | null
          model_id?: string | null
          roi_estimate?: Json | null
          status?: string
          system_id: string
          tool_count?: number | null
          updated_at?: string
        }
        Update: {
          accuracy_estimate?: number | null
          connector_count?: number | null
          created_at?: string
          deployed_at?: string
          deployed_by?: string
          id?: string
          metadata?: Json | null
          model_id?: string | null
          roi_estimate?: Json | null
          status?: string
          system_id?: string
          tool_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_tracking_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          created_at: string | null
          deployed_by: string | null
          error_message: string | null
          grounding: boolean | null
          health: string | null
          id: string
          model: string | null
          region: string
          runtime_url: string | null
          status: string
          system_id: string
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          deployed_by?: string | null
          error_message?: string | null
          grounding?: boolean | null
          health?: string | null
          id?: string
          model?: string | null
          region?: string
          runtime_url?: string | null
          status?: string
          system_id: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          created_at?: string | null
          deployed_by?: string | null
          error_message?: string | null
          grounding?: boolean | null
          health?: string | null
          id?: string
          model?: string | null
          region?: string
          runtime_url?: string | null
          status?: string
          system_id?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      digital_twin_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          event_id: string | null
          id: string
          logs: Json | null
          run_id: string | null
          state_changes: Json | null
          status: string
          twin_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          logs?: Json | null
          run_id?: string | null
          state_changes?: Json | null
          status?: string
          twin_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          logs?: Json | null
          run_id?: string | null
          state_changes?: Json | null
          status?: string
          twin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_runs_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "digital_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twins: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_analysis_jobs: {
        Row: {
          char_count: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          extraction_method: string | null
          file_name: string
          file_type: string | null
          id: string
          model_used: string | null
          page_count: number | null
          progress: number | null
          progress_message: string | null
          raw_text: string | null
          result: Json | null
          stage: string | null
          started_at: string | null
          status: string
          truncated: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          char_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          extraction_method?: string | null
          file_name: string
          file_type?: string | null
          id?: string
          model_used?: string | null
          page_count?: number | null
          progress?: number | null
          progress_message?: string | null
          raw_text?: string | null
          result?: Json | null
          stage?: string | null
          started_at?: string | null
          status?: string
          truncated?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          char_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          extraction_method?: string | null
          file_name?: string
          file_type?: string | null
          id?: string
          model_used?: string | null
          page_count?: number | null
          progress?: number | null
          progress_message?: string | null
          raw_text?: string | null
          result?: Json | null
          stage?: string | null
          started_at?: string | null
          status?: string
          truncated?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          source_type: string
          source_url: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string | null
          user_id: string
          vector_indexed: boolean | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          source_type: string
          source_url?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          vector_indexed?: boolean | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          vector_indexed?: boolean | null
        }
        Relationships: []
      }
      dsx_asset_mappings: {
        Row: {
          active: boolean
          connection_id: string
          created_at: string
          external_asset_ref: string
          id: string
          internal_asset_ref: string
          metadata: Json
          metric_kind: string
          org_id: string
          twin_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          connection_id: string
          created_at?: string
          external_asset_ref: string
          id?: string
          internal_asset_ref: string
          metadata?: Json
          metric_kind: string
          org_id: string
          twin_id: string
          unit: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          connection_id?: string
          created_at?: string
          external_asset_ref?: string
          id?: string
          internal_asset_ref?: string
          metadata?: Json
          metric_kind?: string
          org_id?: string
          twin_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsx_asset_mappings_connection_fk"
            columns: ["connection_id", "org_id", "twin_id"]
            isOneToOne: false
            referencedRelation: "dsx_connections"
            referencedColumns: ["id", "org_id", "twin_id"]
          },
        ]
      }
      dsx_connections: {
        Row: {
          allowed_source_subjects: string[]
          created_at: string
          created_by: string | null
          freshness_budget_ms: number
          gateway_jwt_audience: string | null
          gateway_jwt_issuer: string | null
          gateway_jwt_key_ref: string | null
          gateway_version: string | null
          id: string
          metadata: Json
          name: string
          org_id: string
          status: string
          twin_id: string
          updated_at: string
        }
        Insert: {
          allowed_source_subjects?: string[]
          created_at?: string
          created_by?: string | null
          freshness_budget_ms?: number
          gateway_jwt_audience?: string | null
          gateway_jwt_issuer?: string | null
          gateway_jwt_key_ref?: string | null
          gateway_version?: string | null
          id?: string
          metadata?: Json
          name: string
          org_id: string
          status?: string
          twin_id: string
          updated_at?: string
        }
        Update: {
          allowed_source_subjects?: string[]
          created_at?: string
          created_by?: string | null
          freshness_budget_ms?: number
          gateway_jwt_audience?: string | null
          gateway_jwt_issuer?: string | null
          gateway_jwt_key_ref?: string | null
          gateway_version?: string | null
          id?: string
          metadata?: Json
          name?: string
          org_id?: string
          status?: string
          twin_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsx_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsx_connections_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      dsx_events: {
        Row: {
          asset_mapping_id: string
          connection_id: string
          envelope: Json
          event_id: string
          gateway_id: string | null
          id: string
          ingested_at: string
          ingestion_version: number
          numeric_value: number | null
          observed_at: string
          org_id: string
          quality: string
          received_at: string
          schema_version: number
          source_subject: string | null
          twin_id: string
          unit: string | null
        }
        Insert: {
          asset_mapping_id: string
          connection_id: string
          envelope: Json
          event_id: string
          gateway_id?: string | null
          id?: string
          ingested_at?: string
          ingestion_version?: number
          numeric_value?: number | null
          observed_at: string
          org_id: string
          quality: string
          received_at: string
          schema_version: number
          source_subject?: string | null
          twin_id: string
          unit?: string | null
        }
        Update: {
          asset_mapping_id?: string
          connection_id?: string
          envelope?: Json
          event_id?: string
          gateway_id?: string | null
          id?: string
          ingested_at?: string
          ingestion_version?: number
          numeric_value?: number | null
          observed_at?: string
          org_id?: string
          quality?: string
          received_at?: string
          schema_version?: number
          source_subject?: string | null
          twin_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsx_events_connection_fk"
            columns: ["connection_id", "org_id", "twin_id"]
            isOneToOne: false
            referencedRelation: "dsx_connections"
            referencedColumns: ["id", "org_id", "twin_id"]
          },
          {
            foreignKeyName: "dsx_events_mapping_fk"
            columns: ["asset_mapping_id", "connection_id", "org_id", "twin_id"]
            isOneToOne: false
            referencedRelation: "dsx_asset_mappings"
            referencedColumns: ["id", "connection_id", "org_id", "twin_id"]
          },
        ]
      }
      dsx_events_quarantine: {
        Row: {
          connection_id: string | null
          envelope_snippet: Json | null
          id: string
          metadata_retain_until: string
          org_id: string | null
          raw_payload_purge_after: string
          reason_code: string
          received_at: string
          restricted_payload: Json | null
          sanitized_reason: string
          source_subject_hash: string | null
          twin_id: string | null
        }
        Insert: {
          connection_id?: string | null
          envelope_snippet?: Json | null
          id?: string
          metadata_retain_until?: string
          org_id?: string | null
          raw_payload_purge_after?: string
          reason_code: string
          received_at?: string
          restricted_payload?: Json | null
          sanitized_reason: string
          source_subject_hash?: string | null
          twin_id?: string | null
        }
        Update: {
          connection_id?: string | null
          envelope_snippet?: Json | null
          id?: string
          metadata_retain_until?: string
          org_id?: string | null
          raw_payload_purge_after?: string
          reason_code?: string
          received_at?: string
          restricted_payload?: Json | null
          sanitized_reason?: string
          source_subject_hash?: string | null
          twin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsx_events_quarantine_connection_fk"
            columns: ["connection_id", "org_id", "twin_id"]
            isOneToOne: false
            referencedRelation: "dsx_connections"
            referencedColumns: ["id", "org_id", "twin_id"]
          },
        ]
      }
      dsx_gateway_heartbeats: {
        Row: {
          connection_id: string
          gateway_id: string
          gateway_version: string | null
          id: string
          metrics: Json
          org_id: string
          received_at: string
          status: string
          twin_id: string
        }
        Insert: {
          connection_id: string
          gateway_id: string
          gateway_version?: string | null
          id?: string
          metrics?: Json
          org_id: string
          received_at?: string
          status: string
          twin_id: string
        }
        Update: {
          connection_id?: string
          gateway_id?: string
          gateway_version?: string | null
          id?: string
          metrics?: Json
          org_id?: string
          received_at?: string
          status?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsx_gateway_heartbeats_connection_fk"
            columns: ["connection_id", "org_id", "twin_id"]
            isOneToOne: false
            referencedRelation: "dsx_connections"
            referencedColumns: ["id", "org_id", "twin_id"]
          },
        ]
      }
      dsx_ingestion_audit: {
        Row: {
          connection_id: string | null
          decision: string
          event_id: string | null
          id: string
          latency_ms: number | null
          metadata: Json
          occurred_at: string
          org_id: string | null
          reason_code: string | null
          request_id: string | null
          source_subject_hash: string | null
        }
        Insert: {
          connection_id?: string | null
          decision: string
          event_id?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          org_id?: string | null
          reason_code?: string | null
          request_id?: string | null
          source_subject_hash?: string | null
        }
        Update: {
          connection_id?: string | null
          decision?: string
          event_id?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          org_id?: string | null
          reason_code?: string | null
          request_id?: string | null
          source_subject_hash?: string | null
        }
        Relationships: []
      }
      environments: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      funding_programs: {
        Row: {
          agency: string
          created_at: string | null
          description: string | null
          eligibility_summary: string | null
          focus_areas: string[] | null
          funding_amount_max: number | null
          funding_amount_min: number | null
          funding_type: string[] | null
          id: string
          jurisdiction: string
          last_scraped_at: string | null
          last_updated: string | null
          metadata: Json | null
          program_name: string
          province: string | null
          status: string | null
          url: string
        }
        Insert: {
          agency: string
          created_at?: string | null
          description?: string | null
          eligibility_summary?: string | null
          focus_areas?: string[] | null
          funding_amount_max?: number | null
          funding_amount_min?: number | null
          funding_type?: string[] | null
          id?: string
          jurisdiction: string
          last_scraped_at?: string | null
          last_updated?: string | null
          metadata?: Json | null
          program_name: string
          province?: string | null
          status?: string | null
          url: string
        }
        Update: {
          agency?: string
          created_at?: string | null
          description?: string | null
          eligibility_summary?: string | null
          focus_areas?: string[] | null
          funding_amount_max?: number | null
          funding_amount_min?: number | null
          funding_type?: string[] | null
          id?: string
          jurisdiction?: string
          last_scraped_at?: string | null
          last_updated?: string | null
          metadata?: Json | null
          program_name?: string
          province?: string | null
          status?: string | null
          url?: string
        }
        Relationships: []
      }
      heartbeats: {
        Row: {
          beat_at: string
          id: number
          system_id: string | null
        }
        Insert: {
          beat_at?: string
          id?: never
          system_id?: string | null
        }
        Update: {
          beat_at?: string
          id?: never
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heartbeats_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      indexed_content: {
        Row: {
          content: string
          id: string
          indexed_at: string | null
          last_updated: string | null
          metadata: Json | null
          source_name: string
          source_type: string
          title: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          id?: string
          indexed_at?: string | null
          last_updated?: string | null
          metadata?: Json | null
          source_name: string
          source_type: string
          title: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          id?: string
          indexed_at?: string | null
          last_updated?: string | null
          metadata?: Json | null
          source_name?: string
          source_type?: string
          title?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      industry_agents: {
        Row: {
          agent_type: string | null
          build_steps: Json | null
          category: string | null
          changelog: Json | null
          compliance_notes: string | null
          created_at: string | null
          dependencies: string[] | null
          evaluations: Json | null
          features: Json | null
          id: string
          industry: string
          integration_type: string
          io_schema: Json | null
          last_run_at: string | null
          logo_url: string | null
          model_stack: Json | null
          name: string
          performance: Json | null
          required_secrets: string[] | null
          short_description: string | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string | null
          version: string | null
          workflow_diagram_url: string | null
        }
        Insert: {
          agent_type?: string | null
          build_steps?: Json | null
          category?: string | null
          changelog?: Json | null
          compliance_notes?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          evaluations?: Json | null
          features?: Json | null
          id?: string
          industry: string
          integration_type: string
          io_schema?: Json | null
          last_run_at?: string | null
          logo_url?: string | null
          model_stack?: Json | null
          name: string
          performance?: Json | null
          required_secrets?: string[] | null
          short_description?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          version?: string | null
          workflow_diagram_url?: string | null
        }
        Update: {
          agent_type?: string | null
          build_steps?: Json | null
          category?: string | null
          changelog?: Json | null
          compliance_notes?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          evaluations?: Json | null
          features?: Json | null
          id?: string
          industry?: string
          integration_type?: string
          io_schema?: Json | null
          last_run_at?: string | null
          logo_url?: string | null
          model_stack?: Json | null
          name?: string
          performance?: Json | null
          required_secrets?: string[] | null
          short_description?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          version?: string | null
          workflow_diagram_url?: string | null
        }
        Relationships: []
      }
      industry_templates: {
        Row: {
          certified: boolean | null
          created_at: string | null
          default_config: Json | null
          description: string | null
          downloads: number | null
          hero_icon: string | null
          id: string
          industry: string
          is_active: boolean | null
          kpi_definitions: Json | null
          name: string
          rating: number | null
          roi_pct: number | null
          sample_prompts: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string
          industry: string
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name: string
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string
          industry?: string
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name?: string
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          integration_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          app_id: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          records_synced: number | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_synced?: number | null
          status: string
          sync_type: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_synced?: number | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          category: string | null
          config: Json | null
          connect_method: string | null
          created_at: string | null
          created_by: string | null
          credentials: Json | null
          credentials_encrypted: string | null
          error_message: string | null
          id: string
          last_run: string | null
          last_sync: string | null
          last_test_result: Json | null
          name: string
          org_id: string | null
          provider: string
          state: string | null
          status: string
          updated_at: string | null
          user_id: string
          vault_credentials_id: string | null
        }
        Insert: {
          category?: string | null
          config?: Json | null
          connect_method?: string | null
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          credentials_encrypted?: string | null
          error_message?: string | null
          id?: string
          last_run?: string | null
          last_sync?: string | null
          last_test_result?: Json | null
          name: string
          org_id?: string | null
          provider: string
          state?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          vault_credentials_id?: string | null
        }
        Update: {
          category?: string | null
          config?: Json | null
          connect_method?: string | null
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          credentials_encrypted?: string | null
          error_message?: string | null
          id?: string
          last_run?: string | null
          last_sync?: string | null
          last_test_result?: Json | null
          name?: string
          org_id?: string | null
          provider?: string
          state?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          vault_credentials_id?: string | null
        }
        Relationships: []
      }
      integrations_connections: {
        Row: {
          access_token: string
          created_at: string | null
          display_name: string | null
          expires_at: string | null
          id: string
          last_error: string | null
          org_id: string | null
          provider: string
          refresh_token: string | null
          scopes: string | null
          status: string
          updated_at: string | null
          user_id: string
          vault_access_token_id: string | null
          vault_refresh_token_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          display_name?: string | null
          expires_at?: string | null
          id?: string
          last_error?: string | null
          org_id?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          vault_access_token_id?: string | null
          vault_refresh_token_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          display_name?: string | null
          expires_at?: string | null
          id?: string
          last_error?: string | null
          org_id?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          vault_access_token_id?: string | null
          vault_refresh_token_id?: string | null
        }
        Relationships: []
      }
      integrations_tokens: {
        Row: {
          access_token: string
          app_id: string
          created_at: string | null
          error_count: number | null
          expires_at: string | null
          id: string
          last_sync_at: string | null
          metadata: Json | null
          refresh_token: string | null
          scope: string | null
          status: string | null
          sync_count: number | null
          token_type: string | null
          updated_at: string | null
          user_id: string
          vault_access_token_id: string | null
          vault_refresh_token_id: string | null
        }
        Insert: {
          access_token: string
          app_id: string
          created_at?: string | null
          error_count?: number | null
          expires_at?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          refresh_token?: string | null
          scope?: string | null
          status?: string | null
          sync_count?: number | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
          vault_access_token_id?: string | null
          vault_refresh_token_id?: string | null
        }
        Update: {
          access_token?: string
          app_id?: string
          created_at?: string | null
          error_count?: number | null
          expires_at?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          refresh_token?: string | null
          scope?: string | null
          status?: string | null
          sync_count?: number | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
          vault_access_token_id?: string | null
          vault_refresh_token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "zapier_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_settings: {
        Row: {
          arcade_registry: boolean | null
          arcade_server_id: string | null
          created_at: string
          id: string
          mcp_servers: Json | null
          model_id: string | null
          rag_config: Json | null
          system_id: string
          tool_allowlist: string[] | null
          updated_at: string
          version: string | null
        }
        Insert: {
          arcade_registry?: boolean | null
          arcade_server_id?: string | null
          created_at?: string
          id?: string
          mcp_servers?: Json | null
          model_id?: string | null
          rag_config?: Json | null
          system_id: string
          tool_allowlist?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          arcade_registry?: boolean | null
          arcade_server_id?: string | null
          created_at?: string
          id?: string
          mcp_servers?: Json | null
          model_id?: string | null
          rag_config?: Json | null
          system_id?: string
          tool_allowlist?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_settings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string | null
          description: string | null
          embedding_model: string | null
          id: string
          indexed_at: string | null
          name: string
          page_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          embedding_model?: string | null
          id?: string
          indexed_at?: string | null
          name: string
          page_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          embedding_model?: string | null
          id?: string
          indexed_at?: string | null
          name?: string
          page_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "captured_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      m2m_templates: {
        Row: {
          certified: boolean | null
          created_at: string | null
          default_config: Json | null
          description: string | null
          downloads: number | null
          hero_icon: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          kpi_definitions: Json | null
          name: string
          quick_actions: Json | null
          rating: number | null
          roi_pct: number | null
          sample_prompts: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name: string
          quick_actions?: Json | null
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name?: string
          quick_actions?: Json | null
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      managed_connector_invocations: {
        Row: {
          actor_id: string | null
          connection_id: string | null
          correlation_id: string | null
          created_at: string
          decision: string
          id: string
          latency_ms: number | null
          operation_id: string
          reason_code: string | null
          tenant_id: string | null
        }
        Insert: {
          actor_id?: string | null
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string
          decision: string
          id?: string
          latency_ms?: number | null
          operation_id: string
          reason_code?: string | null
          tenant_id?: string | null
        }
        Update: {
          actor_id?: string | null
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string
          decision?: string
          id?: string
          latency_ms?: number | null
          operation_id?: string
          reason_code?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managed_connector_invocations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_connector_write_approvals: {
        Row: {
          approved_by: string | null
          connection_id: string
          correlation_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          operation_id: string
          requested_by: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          approved_by?: string | null
          connection_id: string
          correlation_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          operation_id: string
          requested_by?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          approved_by?: string | null
          connection_id?: string
          correlation_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          operation_id?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managed_connector_write_approvals_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_user_connections: {
        Row: {
          binding_class: string
          connector_definition_id: string
          consented_at: string | null
          correlation_id: string | null
          created_at: string
          granted_scopes: string[]
          id: string
          last_success_at: string | null
          provider_account_label: string | null
          revoked_at: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          binding_class?: string
          connector_definition_id: string
          consented_at?: string | null
          correlation_id?: string | null
          created_at?: string
          granted_scopes?: string[]
          id?: string
          last_success_at?: string | null
          provider_account_label?: string | null
          revoked_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          binding_class?: string
          connector_definition_id?: string
          consented_at?: string | null
          correlation_id?: string | null
          created_at?: string
          granted_scopes?: string[]
          id?: string
          last_success_at?: string | null
          provider_account_label?: string | null
          revoked_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_credentials: {
        Row: {
          access_token: string | null
          api_key: string | null
          auth_type: string
          created_at: string
          id: string
          metadata: Json | null
          refresh_token: string | null
          server_id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          vault_access_token_id: string | null
          vault_api_key_id: string | null
          vault_refresh_token_id: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          auth_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          refresh_token?: string | null
          server_id: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          vault_access_token_id?: string | null
          vault_api_key_id?: string | null
          vault_refresh_token_id?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          auth_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          refresh_token?: string | null
          server_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          vault_access_token_id?: string | null
          vault_api_key_id?: string | null
          vault_refresh_token_id?: string | null
        }
        Relationships: []
      }
      mcp_servers_catalog: {
        Row: {
          auth_type: string
          category: string
          created_at: string | null
          description: string | null
          endpoint: string | null
          id: string
          is_active: boolean | null
          last_remote_update: string | null
          logo_cdn_url: string | null
          logo_url: string | null
          name: string
          optimized: boolean | null
          prompts_count: number | null
          provider: string
          raw: Json | null
          resources_count: number | null
          status: string | null
          tools_count: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          auth_type: string
          category: string
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          last_remote_update?: string | null
          logo_cdn_url?: string | null
          logo_url?: string | null
          name: string
          optimized?: boolean | null
          prompts_count?: number | null
          provider: string
          raw?: Json | null
          resources_count?: number | null
          status?: string | null
          tools_count?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          auth_type?: string
          category?: string
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          last_remote_update?: string | null
          logo_cdn_url?: string | null
          logo_url?: string | null
          name?: string
          optimized?: boolean | null
          prompts_count?: number | null
          provider?: string
          raw?: Json | null
          resources_count?: number | null
          status?: string | null
          tools_count?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      mcp_sync_runs: {
        Row: {
          added: number
          error: string | null
          finished_at: string | null
          id: number
          metadata: Json | null
          removed: number
          started_at: string
          status: string
          updated: number
        }
        Insert: {
          added?: number
          error?: string | null
          finished_at?: string | null
          id?: number
          metadata?: Json | null
          removed?: number
          started_at?: string
          status?: string
          updated?: number
        }
        Update: {
          added?: number
          error?: string | null
          finished_at?: string | null
          id?: number
          metadata?: Json | null
          removed?: number
          started_at?: string
          status?: string
          updated?: number
        }
        Relationships: []
      }
      mcp_tokens: {
        Row: {
          created_at: string
          id: string
          server_name: string
          system_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          server_name: string
          system_id: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          server_name?: string
          system_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tokens_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          app_id: string
          created_at: string
          expires_at: string
          id: string
          metadata: Json | null
          provider: string
          state_token: string
          system_id: string | null
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          expires_at: string
          id?: string
          metadata?: Json | null
          provider?: string
          state_token: string
          system_id?: string | null
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          provider?: string
          state_token?: string
          system_id?: string | null
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      onboarding_submissions: {
        Row: {
          challenge: string | null
          company_name: string
          company_size: string
          correlation_id: string
          created_at: string
          current_pue: string | null
          email: string
          full_name: string
          goals: Json
          id: string
          intake_source: string
          job_title: string
          num_data_centres: string
          rack_count: string
          timeline: string
          workload_types: Json
        }
        Insert: {
          challenge?: string | null
          company_name: string
          company_size: string
          correlation_id?: string
          created_at?: string
          current_pue?: string | null
          email: string
          full_name: string
          goals?: Json
          id?: string
          intake_source?: string
          job_title: string
          num_data_centres: string
          rack_count: string
          timeline: string
          workload_types?: Json
        }
        Update: {
          challenge?: string | null
          company_name?: string
          company_size?: string
          correlation_id?: string
          created_at?: string
          current_pue?: string | null
          email?: string
          full_name?: string
          goals?: Json
          id?: string
          intake_source?: string
          job_title?: string
          num_data_centres?: string
          rack_count?: string
          timeline?: string
          workload_types?: Json
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          default_role: string | null
          domain: string | null
          id: string
          industry: string | null
          mfa_enabled: boolean | null
          name: string
          sso_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_role?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          mfa_enabled?: boolean | null
          name: string
          sso_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_role?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          mfa_enabled?: boolean | null
          name?: string
          sso_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      page_classifications: {
        Row: {
          candidate_use_cases: string[] | null
          confidence: number | null
          content_type: string
          created_at: string | null
          data_signals: string[] | null
          department: string
          id: string
          industry: string
          page_id: string
          pii_risk: string
        }
        Insert: {
          candidate_use_cases?: string[] | null
          confidence?: number | null
          content_type: string
          created_at?: string | null
          data_signals?: string[] | null
          department: string
          id?: string
          industry: string
          page_id: string
          pii_risk: string
        }
        Update: {
          candidate_use_cases?: string[] | null
          confidence?: number | null
          content_type?: string
          created_at?: string | null
          data_signals?: string[] | null
          department?: string
          id?: string
          industry?: string
          page_id?: string
          pii_risk?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_classifications_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "captured_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_summaries: {
        Row: {
          bullets: string[] | null
          created_at: string | null
          grounding_metadata: Json | null
          id: string
          page_id: string
          source: string
          summary: string
        }
        Insert: {
          bullets?: string[] | null
          created_at?: string | null
          grounding_metadata?: Json | null
          id?: string
          page_id: string
          source: string
          summary: string
        }
        Update: {
          bullets?: string[] | null
          created_at?: string | null
          grounding_metadata?: Json | null
          id?: string
          page_id?: string
          source?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_summaries_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "captured_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          rules: Json
          scope: Database["public"]["Enums"]["policy_scope"]
          system_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          rules?: Json
          scope: Database["public"]["Enums"]["policy_scope"]
          system_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          rules?: Json
          scope?: Database["public"]["Enums"]["policy_scope"]
          system_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_audit: {
        Row: {
          action: string
          decision: Database["public"]["Enums"]["policy_decision"]
          id: string
          latency_ms: number | null
          metadata: Json | null
          policy_id: string | null
          reason: string | null
          system_id: string
          target: string | null
          ts: string | null
        }
        Insert: {
          action: string
          decision: Database["public"]["Enums"]["policy_decision"]
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          policy_id?: string | null
          reason?: string | null
          system_id: string
          target?: string | null
          ts?: string | null
        }
        Update: {
          action?: string
          decision?: Database["public"]["Enums"]["policy_decision"]
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          policy_id?: string | null
          reason?: string | null
          system_id?: string
          target?: string | null
          ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_audit_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_audit_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_bindings: {
        Row: {
          created_at: string | null
          id: string
          policy_id: string | null
          priority: number | null
          target_id: string
          target_type: Database["public"]["Enums"]["policy_target_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          policy_id?: string | null
          priority?: number | null
          target_id: string
          target_type: Database["public"]["Enums"]["policy_target_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          policy_id?: string | null
          priority?: number | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["policy_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "policy_bindings_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_bg_color: string | null
          avatar_initials: string | null
          avatar_url: string | null
          created_at: string | null
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          is_approved: boolean
          job_title: string | null
          locale: string | null
          org_id: string | null
          phone: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_bg_color?: string | null
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          job_title?: string | null
          locale?: string | null
          org_id?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_bg_color?: string | null
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          job_title?: string | null
          locale?: string | null
          org_id?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      public_intake_rate_limits: {
        Row: {
          bucket_key: string
          created_at: string
          id: string
          intake_kind: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          created_at?: string
          id?: string
          intake_kind: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          created_at?: string
          id?: string
          intake_kind?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      rag_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string | null
          hash: string | null
          id: string
          item_id: string
          metadata: Json | null
          page_number: number | null
          system_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          embedding?: string | null
          hash?: string | null
          id?: string
          item_id: string
          metadata?: Json | null
          page_number?: number | null
          system_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          hash?: string | null
          id?: string
          item_id?: string
          metadata?: Json | null
          page_number?: number | null
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "rag_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      rag_items: {
        Row: {
          created_at: string
          error: string | null
          id: string
          last_indexed: string | null
          name: string
          options: Json | null
          pages: number | null
          residency: string
          size_bytes: number | null
          source: string
          status: string
          system_id: string
          updated_at: string
          uri: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          last_indexed?: string | null
          name: string
          options?: Json | null
          pages?: number | null
          residency?: string
          size_bytes?: number | null
          source: string
          status?: string
          system_id: string
          updated_at?: string
          uri?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          last_indexed?: string | null
          name?: string
          options?: Json | null
          pages?: number | null
          residency?: string
          size_bytes?: number | null
          source?: string
          status?: string
          system_id?: string
          updated_at?: string
          uri?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_items_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          system_id: string
          token_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          system_id: string
          token_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          system_id?: string
          token_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_tokens_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          created_at: string | null
          departments_covered: Json | null
          id: string
          model: string | null
          payload: Json
          site_id: string | null
          topn: number | null
        }
        Insert: {
          created_at?: string | null
          departments_covered?: Json | null
          id?: string
          model?: string | null
          payload: Json
          site_id?: string | null
          topn?: number | null
        }
        Update: {
          created_at?: string | null
          departments_covered?: Json | null
          id?: string
          model?: string | null
          payload?: Json
          site_id?: string | null
          topn?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_assumptions: {
        Row: {
          accuracy_improvement_pct: number
          cost_per_error: number
          created_at: string | null
          id: string
          loaded_cost_per_hour: number
          runs_per_week: number
          system_id: string
          time_saved_per_run_min: number
          updated_at: string | null
        }
        Insert: {
          accuracy_improvement_pct?: number
          cost_per_error?: number
          created_at?: string | null
          id?: string
          loaded_cost_per_hour?: number
          runs_per_week?: number
          system_id: string
          time_saved_per_run_min?: number
          updated_at?: string | null
        }
        Update: {
          accuracy_improvement_pct?: number
          cost_per_error?: number
          created_at?: string | null
          id?: string
          loaded_cost_per_hour?: number
          runs_per_week?: number
          system_id?: string
          time_saved_per_run_min?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      roi_snapshots: {
        Row: {
          annual_savings: number
          assumptions_json: Json
          created_at: string | null
          error_savings_year: number
          id: string
          roi_pct: number
          system_id: string
          time_saved_week: number
        }
        Insert: {
          annual_savings: number
          assumptions_json: Json
          created_at?: string | null
          error_savings_year?: number
          id?: string
          roi_pct: number
          system_id: string
          time_saved_week: number
        }
        Update: {
          annual_savings?: number
          assumptions_json?: Json
          created_at?: string | null
          error_savings_year?: number
          id?: string
          roi_pct?: number
          system_id?: string
          time_saved_week?: number
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          target_user_id?: string
        }
        Relationships: []
      }
      scraper_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          programs_found: number | null
          programs_inserted: number | null
          programs_skipped: number | null
          programs_updated: number | null
          source_name: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          programs_found?: number | null
          programs_inserted?: number | null
          programs_skipped?: number | null
          programs_updated?: number | null
          source_name: string
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          programs_found?: number | null
          programs_inserted?: number | null
          programs_skipped?: number | null
          programs_updated?: number | null
          source_name?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          avg_latency_ms: number | null
          created_at: string | null
          date: string
          grounding_coverage_pct: number | null
          id: string
          query_answers: number | null
          robots_blocked_count: number | null
          total_searches: number | null
          url_captures: number | null
        }
        Insert: {
          avg_latency_ms?: number | null
          created_at?: string | null
          date: string
          grounding_coverage_pct?: number | null
          id?: string
          query_answers?: number | null
          robots_blocked_count?: number | null
          total_searches?: number | null
          url_captures?: number | null
        }
        Update: {
          avg_latency_ms?: number | null
          created_at?: string | null
          date?: string
          grounding_coverage_pct?: number | null
          id?: string
          query_answers?: number | null
          robots_blocked_count?: number | null
          total_searches?: number | null
          url_captures?: number | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          id: string
          intent: string | null
          latency_ms: number | null
          normalized_url: string | null
          query: string
          result_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          normalized_url?: string | null
          query: string
          result_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          normalized_url?: string | null
          query?: string
          result_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      simulation_runs: {
        Row: {
          baseline_kpis: Json | null
          blueprint_id: string | null
          blueprint_version: string | null
          checksum: string | null
          created_at: string
          duration_ms: number | null
          engine_version: string
          error_detail: string | null
          events: Json | null
          execution_origin: string
          final_kpis: Json | null
          finished_at: string | null
          id: string
          idempotency_key: string | null
          input_snapshot: Json
          kpi_snapshots: Json | null
          metadata: Json | null
          metric_provenance: Json
          output_snapshot: Json
          run_key: string | null
          run_label: string | null
          scenario_key: string
          scenario_name: string | null
          scenario_type: string
          started_at: string
          status: string
          twin_id: string
          updated_at: string
          user_id: string
          validation_status: string
        }
        Insert: {
          baseline_kpis?: Json | null
          blueprint_id?: string | null
          blueprint_version?: string | null
          checksum?: string | null
          created_at?: string
          duration_ms?: number | null
          engine_version?: string
          error_detail?: string | null
          events?: Json | null
          execution_origin?: string
          final_kpis?: Json | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          input_snapshot?: Json
          kpi_snapshots?: Json | null
          metadata?: Json | null
          metric_provenance?: Json
          output_snapshot?: Json
          run_key?: string | null
          run_label?: string | null
          scenario_key: string
          scenario_name?: string | null
          scenario_type?: string
          started_at?: string
          status?: string
          twin_id: string
          updated_at?: string
          user_id: string
          validation_status?: string
        }
        Update: {
          baseline_kpis?: Json | null
          blueprint_id?: string | null
          blueprint_version?: string | null
          checksum?: string | null
          created_at?: string
          duration_ms?: number | null
          engine_version?: string
          error_detail?: string | null
          events?: Json | null
          execution_origin?: string
          final_kpis?: Json | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          input_snapshot?: Json
          kpi_snapshots?: Json | null
          metadata?: Json | null
          metric_provenance?: Json
          output_snapshot?: Json
          run_key?: string | null
          run_label?: string | null
          scenario_key?: string
          scenario_name?: string | null
          scenario_type?: string
          started_at?: string
          status?: string
          twin_id?: string
          updated_at?: string
          user_id?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_runs_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      site_crawls: {
        Row: {
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string
          page_count: number | null
          site_id: string | null
          sitemap_used: boolean | null
          started_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          page_count?: number | null
          site_id?: string | null
          sitemap_used?: boolean | null
          started_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          page_count?: number | null
          site_id?: string | null
          sitemap_used?: boolean | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_crawls_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          content_html: string | null
          content_text: string | null
          crawled_at: string | null
          id: string
          lang: string | null
          site_id: string | null
          status_code: number | null
          url: string
          word_count: number | null
        }
        Insert: {
          content_html?: string | null
          content_text?: string | null
          crawled_at?: string | null
          id?: string
          lang?: string | null
          site_id?: string | null
          status_code?: number | null
          url: string
          word_count?: number | null
        }
        Update: {
          content_html?: string | null
          content_text?: string | null
          crawled_at?: string | null
          id?: string
          lang?: string | null
          site_id?: string | null
          status_code?: number | null
          url?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          company_name: string | null
          created_at: string | null
          domain: string
          id: string
          industry_guess: string | null
          last_crawled_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          domain: string
          id?: string
          industry_guess?: string | null
          last_crawled_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          domain?: string
          id?: string
          industry_guess?: string | null
          last_crawled_at?: string | null
        }
        Relationships: []
      }
      sovereign_dc_facilities: {
        Row: {
          base_kpis: Json
          carbon_scenarios: Json | null
          cooling_zones: Json | null
          created_at: string | null
          data_flows: Json | null
          description: string | null
          energy_mix: Json
          financial_profile: Json
          gpu_clusters: Json | null
          id: string
          incident_scenarios: Json | null
          name: string
          owner_id: string
          region: string
          updated_at: string | null
        }
        Insert: {
          base_kpis?: Json
          carbon_scenarios?: Json | null
          cooling_zones?: Json | null
          created_at?: string | null
          data_flows?: Json | null
          description?: string | null
          energy_mix?: Json
          financial_profile?: Json
          gpu_clusters?: Json | null
          id?: string
          incident_scenarios?: Json | null
          name: string
          owner_id: string
          region: string
          updated_at?: string | null
        }
        Update: {
          base_kpis?: Json
          carbon_scenarios?: Json | null
          cooling_zones?: Json | null
          created_at?: string | null
          data_flows?: Json | null
          description?: string | null
          energy_mix?: Json
          financial_profile?: Json
          gpu_clusters?: Json | null
          id?: string
          incident_scenarios?: Json | null
          name?: string
          owner_id?: string
          region?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sovereign_dc_simulation_runs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          facility_id: string
          id: string
          input_params: Json
          kpi_deltas: Json
          name: string | null
          results_summary: string
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          facility_id: string
          id?: string
          input_params?: Json
          kpi_deltas?: Json
          name?: string | null
          results_summary: string
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          facility_id?: string
          id?: string
          input_params?: Json
          kpi_deltas?: Json
          name?: string | null
          results_summary?: string
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sovereign_dc_simulation_runs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "sovereign_dc_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      system_builder_state: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          state: Json
          step: number
          system_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          state?: Json
          step: number
          system_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          state?: Json
          step?: number
          system_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_builder_state_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          id: number
          message: string | null
          occurred_at: string
          severity: string | null
          system_id: string | null
        }
        Insert: {
          id?: never
          message?: string | null
          occurred_at?: string
          severity?: string | null
          system_id?: string | null
        }
        Update: {
          id?: never
          message?: string | null
          occurred_at?: string
          severity?: string | null
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          cpu_load_pct: number | null
          errors_24h: number | null
          id: number
          latency_ms: number | null
          mem_load_pct: number | null
          observed_at: string
          system_id: string | null
          throughput_rpm: number | null
          uptime_pct: number | null
        }
        Insert: {
          cpu_load_pct?: number | null
          errors_24h?: number | null
          id?: never
          latency_ms?: number | null
          mem_load_pct?: number | null
          observed_at?: string
          system_id?: string | null
          throughput_rpm?: number | null
          uptime_pct?: number | null
        }
        Update: {
          cpu_load_pct?: number | null
          errors_24h?: number | null
          id?: never
          latency_ms?: number | null
          mem_load_pct?: number | null
          observed_at?: string
          system_id?: string | null
          throughput_rpm?: number | null
          uptime_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_health_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      system_integrations: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          integration_id: string
          role: string
          system_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_id: string
          role: string
          system_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_id?: string
          role?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_integrations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_integrations_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          org_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      twin_agent_bindings: {
        Row: {
          agent_definition_id: string
          config_overrides: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          twin_id: string
          updated_at: string | null
        }
        Insert: {
          agent_definition_id: string
          config_overrides?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          twin_id: string
          updated_at?: string | null
        }
        Update: {
          agent_definition_id?: string
          config_overrides?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          twin_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twin_agent_bindings_agent_definition_id_fkey"
            columns: ["agent_definition_id"]
            isOneToOne: false
            referencedRelation: "agent_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twin_agent_bindings_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "digital_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_carbon_emissions: {
        Row: {
          created_at: string
          emissions_kg: number
          grid_carbon_intensity: number | null
          id: string
          period_end: string
          period_start: string
          power_consumption_kwh: number | null
          renewable_pct: number | null
          twin_id: string
        }
        Insert: {
          created_at?: string
          emissions_kg: number
          grid_carbon_intensity?: number | null
          id?: string
          period_end: string
          period_start: string
          power_consumption_kwh?: number | null
          renewable_pct?: number | null
          twin_id: string
        }
        Update: {
          created_at?: string
          emissions_kg?: number
          grid_carbon_intensity?: number | null
          id?: string
          period_end?: string
          period_start?: string
          power_consumption_kwh?: number | null
          renewable_pct?: number | null
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_carbon_emissions_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_financial_records: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          record_type: string
          twin_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          record_type: string
          twin_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          record_type?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_financial_records_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_kpi_snapshots: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          kpi_key: string
          kpi_unit: string | null
          kpi_value: number | null
          snapshot_at: string
          twin_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          kpi_key: string
          kpi_unit?: string | null
          kpi_value?: number | null
          snapshot_at?: string
          twin_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          kpi_key?: string
          kpi_unit?: string | null
          kpi_value?: number | null
          snapshot_at?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_kpi_snapshots_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_property_values: {
        Row: {
          applied_at: string
          correlation_id: string | null
          created_at: string
          facility_id: string | null
          id: string
          observed_at: string
          provenance_class: string
          provenance_reason: string | null
          received_at: string
          source_connection_id: string | null
          source_contract_id: string | null
          source_mapping_id: string | null
          source_message_id: string | null
          target_entity: string
          target_prim_path: string | null
          target_property: string
          tenant_id: string | null
          unit: string | null
          updated_at: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          applied_at?: string
          correlation_id?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          observed_at: string
          provenance_class?: string
          provenance_reason?: string | null
          received_at?: string
          source_connection_id?: string | null
          source_contract_id?: string | null
          source_mapping_id?: string | null
          source_message_id?: string | null
          target_entity: string
          target_prim_path?: string | null
          target_property: string
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          applied_at?: string
          correlation_id?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          observed_at?: string
          provenance_class?: string
          provenance_reason?: string | null
          received_at?: string
          source_connection_id?: string | null
          source_contract_id?: string | null
          source_mapping_id?: string | null
          source_message_id?: string | null
          target_entity?: string
          target_prim_path?: string | null
          target_property?: string
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twin_property_values_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "connection_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twin_property_values_source_contract_id_fkey"
            columns: ["source_contract_id"]
            isOneToOne: false
            referencedRelation: "connection_data_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twin_property_values_source_mapping_id_fkey"
            columns: ["source_mapping_id"]
            isOneToOne: false
            referencedRelation: "connection_twin_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twin_property_values_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "connection_ingest_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_simulation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          events: Json | null
          id: string
          kpi_deltas: Json | null
          result_summary: Json | null
          scenario_id: string
          scenario_name: string | null
          started_at: string | null
          status: string
          twin_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          events?: Json | null
          id?: string
          kpi_deltas?: Json | null
          result_summary?: Json | null
          scenario_id: string
          scenario_name?: string | null
          started_at?: string | null
          status?: string
          twin_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          events?: Json | null
          id?: string
          kpi_deltas?: Json | null
          result_summary?: Json | null
          scenario_id?: string
          scenario_name?: string | null
          started_at?: string | null
          status?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_simulation_runs_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_sovereignty_events: {
        Row: {
          compliance_status: string | null
          created_at: string
          data_classification: string | null
          destination_region: string | null
          details: Json | null
          event_type: string
          id: string
          occurred_at: string
          resolved_at: string | null
          severity: string
          source_region: string | null
          twin_id: string
        }
        Insert: {
          compliance_status?: string | null
          created_at?: string
          data_classification?: string | null
          destination_region?: string | null
          details?: Json | null
          event_type: string
          id?: string
          occurred_at?: string
          resolved_at?: string | null
          severity?: string
          source_region?: string | null
          twin_id: string
        }
        Update: {
          compliance_status?: string | null
          created_at?: string
          data_classification?: string | null
          destination_region?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          occurred_at?: string
          resolved_at?: string | null
          severity?: string
          source_region?: string | null
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_sovereignty_events_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_telemetry: {
        Row: {
          created_at: string
          domain: string
          id: string
          metadata: Json | null
          metric_key: string
          metric_value: number | null
          recorded_at: string
          twin_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          metadata?: Json | null
          metric_key: string
          metric_value?: number | null
          recorded_at?: string
          twin_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          metadata?: Json | null
          metric_key?: string
          metric_value?: number | null
          recorded_at?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_telemetry_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "data_centre_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          tour_state: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          tour_state?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          tour_state?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          scope?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      website_content_cache: {
        Row: {
          chunk_hash: string
          content: string | null
          created_at: string | null
          domain: string
          extracted_at: string | null
          id: string
          metadata: Json | null
          summary: Json | null
          updated_at: string | null
          url: string
          version: number | null
          word_count: number | null
        }
        Insert: {
          chunk_hash: string
          content?: string | null
          created_at?: string | null
          domain: string
          extracted_at?: string | null
          id?: string
          metadata?: Json | null
          summary?: Json | null
          updated_at?: string | null
          url: string
          version?: number | null
          word_count?: number | null
        }
        Update: {
          chunk_hash?: string
          content?: string | null
          created_at?: string | null
          domain?: string
          extracted_at?: string | null
          id?: string
          metadata?: Json | null
          summary?: Json | null
          updated_at?: string | null
          url?: string
          version?: number | null
          word_count?: number | null
        }
        Relationships: []
      }
      workflow_edges: {
        Row: {
          created_at: string
          from_node_id: string
          from_port: string
          id: string
          to_node_id: string
          to_port: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          from_node_id: string
          from_port?: string
          id?: string
          to_node_id: string
          to_port?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          from_node_id?: string
          from_port?: string
          id?: string
          to_node_id?: string
          to_port?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          config: Json
          created_at: string
          id: string
          type: string
          updated_at: string
          version: number
          workflow_id: string
          x: number
          y: number
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          type: string
          updated_at?: string
          version?: number
          workflow_id: string
          x?: number
          y?: number
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          type?: string
          updated_at?: string
          version?: number
          workflow_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_events: {
        Row: {
          created_at: string
          error: Json | null
          id: string
          latency_ms: number | null
          node_id: string | null
          ok: boolean
          payload: Json | null
          run_id: string
          stage: string
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          created_at?: string
          error?: Json | null
          id?: string
          latency_ms?: number | null
          node_id?: string | null
          ok?: boolean
          payload?: Json | null
          run_id: string
          stage: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          created_at?: string
          error?: Json | null
          id?: string
          latency_ms?: number | null
          node_id?: string | null
          ok?: boolean
          payload?: Json | null
          run_id?: string
          stage?: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_events_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_by: string
          id: string
          metrics: Json
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_by: string
          id?: string
          metrics?: Json
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string
          id?: string
          metrics?: Json
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          status: string
          system_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          status?: string
          system_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          status?: string
          system_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      zapier_apps: {
        Row: {
          auth_type: string | null
          category: string[] | null
          connections_count: number | null
          created_at: string | null
          description: string | null
          id: string
          last_synced_at: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          premium: boolean | null
          pricing_tier: string | null
          status: string | null
          supports_actions: boolean | null
          supports_triggers: boolean | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          auth_type?: string | null
          category?: string[] | null
          connections_count?: number | null
          created_at?: string | null
          description?: string | null
          id: string
          last_synced_at?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          premium?: boolean | null
          pricing_tier?: string | null
          status?: string | null
          supports_actions?: boolean | null
          supports_triggers?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          auth_type?: string | null
          category?: string[] | null
          connections_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_synced_at?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          premium?: boolean | null
          pricing_tier?: string | null
          status?: string | null
          supports_actions?: boolean | null
          supports_triggers?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      dsx_current_state: {
        Row: {
          asset_mapping_id: string | null
          connection_id: string | null
          event_id: string | null
          ingested_at: string | null
          numeric_value: number | null
          observed_at: string | null
          org_id: string | null
          quality: string | null
          received_at: string | null
          schema_version: number | null
          twin_id: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsx_events_connection_fk"
            columns: ["connection_id", "org_id", "twin_id"]
            isOneToOne: false
            referencedRelation: "dsx_connections"
            referencedColumns: ["id", "org_id", "twin_id"]
          },
          {
            foreignKeyName: "dsx_events_mapping_fk"
            columns: ["asset_mapping_id", "connection_id", "org_id", "twin_id"]
            isOneToOne: false
            referencedRelation: "dsx_asset_mappings"
            referencedColumns: ["id", "connection_id", "org_id", "twin_id"]
          },
        ]
      }
      mv_ops_overview: {
        Row: {
          active_systems: number | null
          as_of: string | null
          avg_latency_ms: number | null
          errors_24h: number | null
          total_rpm: number | null
          uptime_pct: number | null
        }
        Relationships: []
      }
      vw_mcp_servers: {
        Row: {
          auth_type: string | null
          category: string | null
          created_at: string | null
          description: string | null
          endpoint: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          optimized: boolean | null
          prompts_count: number | null
          provider: string | null
          resources_count: number | null
          tools_count: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          auth_type?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          optimized?: boolean | null
          prompts_count?: number | null
          provider?: string | null
          resources_count?: number | null
          tools_count?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          auth_type?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          optimized?: boolean | null
          prompts_count?: number | null
          provider?: string | null
          resources_count?: number | null
          tools_count?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      vw_templates_industry: {
        Row: {
          certified: boolean | null
          created_at: string | null
          default_config: Json | null
          description: string | null
          downloads: number | null
          hero_icon: string | null
          id: string | null
          industry: string | null
          is_active: boolean | null
          kpi_definitions: Json | null
          name: string | null
          rating: number | null
          roi_pct: number | null
          sample_prompts: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name?: string | null
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name?: string | null
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vw_templates_m2m: {
        Row: {
          certified: boolean | null
          created_at: string | null
          default_config: Json | null
          description: string | null
          downloads: number | null
          hero_icon: string | null
          id: string | null
          industry: string | null
          is_active: boolean | null
          kpi_definitions: Json | null
          name: string | null
          quick_actions: Json | null
          rating: number | null
          roi_pct: number | null
          sample_prompts: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name?: string | null
          quick_actions?: Json | null
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          certified?: boolean | null
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          downloads?: number | null
          hero_icon?: string | null
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          kpi_definitions?: Json | null
          name?: string | null
          quick_actions?: Json | null
          rating?: number | null
          roi_pct?: number | null
          sample_prompts?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_role: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_clear_user_roles: {
        Args: { _reason?: string; _target_user_id: string }
        Returns: undefined
      }
      admin_grant_role: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _scope?: string
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_revoke_role_grant: {
        Args: { _reason?: string; _role_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      assert_role_admin: { Args: never; Returns: string }
      check_user_has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      cleanup_agent_suggestions_cache: { Args: never; Returns: undefined }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      cleanup_old_copilot_cache: { Args: never; Returns: undefined }
      cleanup_old_copilot_events: { Args: never; Returns: undefined }
      cleanup_old_copilot_memory: { Args: never; Returns: undefined }
      connection_tenant_visible: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      connection_visible: { Args: { _connection_id: string }; Returns: boolean }
      consume_public_intake_quota: {
        Args: { _bucket_key: string; _intake_kind: string; _limit: number }
        Returns: boolean
      }
      current_tenant_id: { Args: never; Returns: string }
      delete_secret_from_vault: {
        Args: { vault_id: string }
        Returns: undefined
      }
      dsx_current_user_in_org: { Args: { p_org_id: string }; Returns: boolean }
      dsx_current_user_is_operator_in_org: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      dsx_ingest_event: {
        Args: {
          p_connection_id: string
          p_envelope: Json
          p_event_id: string
          p_external_asset_ref: string
          p_gateway_id: string
          p_numeric_value: number
          p_observed_at: string
          p_quality: string
          p_received_at: string
          p_request_id: string
          p_schema_version: number
          p_source_subject: string
          p_unit: string
        }
        Returns: Json
      }
      generate_avatar_color: {
        Args: { user_id_input: string }
        Returns: string
      }
      generate_initials: {
        Args: { email_input: string; full_name_input: string }
        Returns: string
      }
      get_secret_from_vault: { Args: { vault_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
      link_system_integration: {
        Args: {
          p_integration_id: string
          p_metadata?: Json
          p_status?: string
          p_system_id: string
        }
        Returns: undefined
      }
      match_documents: {
        Args: {
          filter_user_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      provision_default_twin: { Args: { _user_id: string }; Returns: string }
      rpc_kpi_agents_deployed: {
        Args: { p_from: string; p_org_id?: string; p_to: string }
        Returns: {
          active_count: number
          delta_count: number
        }[]
      }
      rpc_kpi_compliance_accuracy: {
        Args: { p_from: string; p_org_id?: string; p_to: string }
        Returns: {
          accuracy_pct: number
          delta_pct: number
        }[]
      }
      rpc_kpi_roi_growth: {
        Args: { p_from: string; p_org_id?: string; p_to: string }
        Returns: {
          delta_pct: number
          roi_pct: number
        }[]
      }
      rpc_kpi_time_saved: {
        Args: { p_from: string; p_org_id?: string; p_to: string }
        Returns: {
          delta_hours: number
          hours: number
        }[]
      }
      store_secret_in_vault: {
        Args: { secret_name: string; secret_value: string }
        Returns: string
      }
      unlink_system_integration: {
        Args: { p_integration_id: string; p_system_id: string }
        Returns: undefined
      }
      update_secret_in_vault: {
        Args: { new_secret_value: string; vault_id: string }
        Returns: undefined
      }
      user_can_access_agent: {
        Args: {
          check_agent_id: string
          check_user_id: string
          required_permission?: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          check_role: string
          check_scope?: string
          check_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "executive"
        | "manager"
        | "engineer"
        | "security_admin"
        | "admin"
        | "operator"
        | "viewer"
        | "owner"
        | "compliance"
        | "data_analyst"
        | "marketing"
        | "sales"
        | "support"
        | "finance"
      policy_decision: "allow" | "deny" | "warn"
      policy_scope: "model" | "rag" | "mcp" | "workflow" | "global"
      policy_target_type:
        | "model"
        | "rag_source"
        | "mcp_server"
        | "workflow_node"
        | "deployment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "executive",
        "manager",
        "engineer",
        "security_admin",
        "admin",
        "operator",
        "viewer",
        "owner",
        "compliance",
        "data_analyst",
        "marketing",
        "sales",
        "support",
        "finance",
      ],
      policy_decision: ["allow", "deny", "warn"],
      policy_scope: ["model", "rag", "mcp", "workflow", "global"],
      policy_target_type: [
        "model",
        "rag_source",
        "mcp_server",
        "workflow_node",
        "deployment",
      ],
    },
  },
} as const
