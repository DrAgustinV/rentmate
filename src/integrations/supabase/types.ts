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
      analytics_events: {
        Row: {
          event_category: string | null
          event_metadata: Json | null
          event_name: string
          id: string
          page_path: string | null
          session_id: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          event_category?: string | null
          event_metadata?: Json | null
          event_name: string
          id?: string
          page_path?: string | null
          session_id: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          event_category?: string | null
          event_metadata?: Json | null
          event_name?: string
          id?: string
          page_path?: string | null
          session_id?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_navigation_paths: {
        Row: {
          breadcrumb_trail: Json | null
          from_path: string | null
          id: string
          session_id: string
          timestamp: string
          to_path: string
          user_id: string | null
        }
        Insert: {
          breadcrumb_trail?: Json | null
          from_path?: string | null
          id?: string
          session_id: string
          timestamp?: string
          to_path: string
          user_id?: string | null
        }
        Update: {
          breadcrumb_trail?: Json | null
          from_path?: string | null
          id?: string
          session_id?: string
          timestamp?: string
          to_path?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_page_views: {
        Row: {
          city: string | null
          country: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          page_path: string
          page_title: string | null
          referrer: string | null
          region: string | null
          session_id: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          page_path: string
          page_title?: string | null
          referrer?: string | null
          region?: string | null
          session_id: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          events_count: number | null
          id: string
          is_authenticated: boolean | null
          page_views_count: number | null
          session_id: string
          started_at: string
          subscription_tier: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          is_authenticated?: boolean | null
          page_views_count?: number | null
          session_id: string
          started_at?: string
          subscription_tier?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          is_authenticated?: boolean | null
          page_views_count?: number | null
          session_id?: string
          started_at?: string
          subscription_tier?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          accent_color: string
          brand_name: string
          carousel_items: Json | null
          custom_domain: string | null
          header_background_color: string
          header_background_opacity: number
          id: string
          logo_url: string | null
          primary_color: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          brand_name?: string
          carousel_items?: Json | null
          custom_domain?: string | null
          header_background_color?: string
          header_background_opacity?: number
          id?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          brand_name?: string
          carousel_items?: Json | null
          custom_domain?: string | null
          header_background_color?: string
          header_background_opacity?: number
          id?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          completed_at: string | null
          contract_document_hash: string | null
          contract_pdf_url: string | null
          created_at: string
          docuseal_audit_log_url: string | null
          docuseal_manager_document_url: string | null
          docuseal_submission_id: string | null
          docuseal_submission_slug: string | null
          docuseal_template_id: string | null
          docuseal_tenant_document_url: string | null
          expires_at: string | null
          id: string
          initiated_at: string
          initiated_by: string
          kyc_enforced: boolean | null
          last_reminder_sent_at: string | null
          manager_embed_slug: string | null
          manager_signature_data: Json | null
          manager_signature_ip: string | null
          manager_signature_method: string | null
          manager_signed_at: string | null
          property_id: string
          qualified_signature_callback_url: string | null
          qualified_signature_metadata: Json | null
          qualified_signature_provider: string | null
          qualified_signature_session_id: string | null
          reminder_count: number | null
          signature_method: string | null
          signed_document_url: string | null
          signing_method_provider: string | null
          source_document_id: string | null
          tenancy_id: string
          tenant_embed_slug: string | null
          tenant_signature_data: Json | null
          tenant_signature_ip: string | null
          tenant_signature_method: string | null
          tenant_signed_at: string | null
          tenant_signer_id: string | null
          updated_at: string
          workflow_id: string | null
          workflow_status: string
        }
        Insert: {
          completed_at?: string | null
          contract_document_hash?: string | null
          contract_pdf_url?: string | null
          created_at?: string
          docuseal_audit_log_url?: string | null
          docuseal_manager_document_url?: string | null
          docuseal_submission_id?: string | null
          docuseal_submission_slug?: string | null
          docuseal_template_id?: string | null
          docuseal_tenant_document_url?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by: string
          kyc_enforced?: boolean | null
          last_reminder_sent_at?: string | null
          manager_embed_slug?: string | null
          manager_signature_data?: Json | null
          manager_signature_ip?: string | null
          manager_signature_method?: string | null
          manager_signed_at?: string | null
          property_id: string
          qualified_signature_callback_url?: string | null
          qualified_signature_metadata?: Json | null
          qualified_signature_provider?: string | null
          qualified_signature_session_id?: string | null
          reminder_count?: number | null
          signature_method?: string | null
          signed_document_url?: string | null
          signing_method_provider?: string | null
          source_document_id?: string | null
          tenancy_id: string
          tenant_embed_slug?: string | null
          tenant_signature_data?: Json | null
          tenant_signature_ip?: string | null
          tenant_signature_method?: string | null
          tenant_signed_at?: string | null
          tenant_signer_id?: string | null
          updated_at?: string
          workflow_id?: string | null
          workflow_status?: string
        }
        Update: {
          completed_at?: string | null
          contract_document_hash?: string | null
          contract_pdf_url?: string | null
          created_at?: string
          docuseal_audit_log_url?: string | null
          docuseal_manager_document_url?: string | null
          docuseal_submission_id?: string | null
          docuseal_submission_slug?: string | null
          docuseal_template_id?: string | null
          docuseal_tenant_document_url?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string
          kyc_enforced?: boolean | null
          last_reminder_sent_at?: string | null
          manager_embed_slug?: string | null
          manager_signature_data?: Json | null
          manager_signature_ip?: string | null
          manager_signature_method?: string | null
          manager_signed_at?: string | null
          property_id?: string
          qualified_signature_callback_url?: string | null
          qualified_signature_metadata?: Json | null
          qualified_signature_provider?: string | null
          qualified_signature_session_id?: string | null
          reminder_count?: number | null
          signature_method?: string | null
          signed_document_url?: string | null
          signing_method_provider?: string | null
          source_document_id?: string | null
          tenancy_id?: string
          tenant_embed_slug?: string | null
          tenant_signature_data?: Json | null
          tenant_signature_ip?: string | null
          tenant_signature_method?: string | null
          tenant_signed_at?: string | null
          tenant_signer_id?: string | null
          updated_at?: string
          workflow_id?: string | null
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "property_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_health: {
        Row: {
          consecutive_failures: number
          created_at: string
          id: string
          job_name: string
          last_error: string | null
          last_run_at: string | null
          last_run_status: string | null
          metadata: Json | null
          run_count: number
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          id?: string
          job_name: string
          last_error?: string | null
          last_run_at?: string | null
          last_run_status?: string | null
          metadata?: Json | null
          run_count?: number
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          id?: string
          job_name?: string
          last_error?: string | null
          last_run_at?: string | null
          last_run_status?: string | null
          metadata?: Json | null
          run_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_retention_audit: {
        Row: {
          affected_records: number
          anonymized_records: number
          created_at: string
          deleted_records: number
          executed_at: string
          execution_details: Json | null
          id: string
          policy_type: string
        }
        Insert: {
          affected_records?: number
          anonymized_records?: number
          created_at?: string
          deleted_records?: number
          executed_at?: string
          execution_details?: Json | null
          id?: string
          policy_type: string
        }
        Update: {
          affected_records?: number
          anonymized_records?: number
          created_at?: string
          deleted_records?: number
          executed_at?: string
          execution_details?: Json | null
          id?: string
          policy_type?: string
        }
        Relationships: []
      }
      enterprise_contact_requests: {
        Row: {
          company_name: string | null
          contacted_at: string | null
          contacted_by: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          notes: string | null
          phone: string | null
          properties_count: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          notes?: string | null
          phone?: string | null
          properties_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          notes?: string | null
          phone?: string | null
          properties_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_contact_requests_contacted_by_fkey"
            columns: ["contacted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_contact_requests_contacted_by_fkey"
            columns: ["contacted_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_contact_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_contact_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      grace_period_reminders_sent: {
        Row: {
          id: string
          reminder_day: number
          sent_at: string
          user_subscription_id: string
        }
        Insert: {
          id?: string
          reminder_day: number
          sent_at?: string
          user_subscription_id: string
        }
        Update: {
          id?: string
          reminder_day?: number
          sent_at?: string
          user_subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grace_period_reminders_sent_user_subscription_id_fkey"
            columns: ["user_subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_log: Json | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          import_type: string
          manager_id: string
          processing_time_ms: number | null
          records_failed: number | null
          records_processed: number | null
          records_succeeded: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          import_type: string
          manager_id: string
          processing_time_ms?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          import_type?: string
          manager_id?: string
          processing_time_ms?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          condition: Database["public"]["Enums"]["condition_rating"] | null
          created_at: string
          id: string
          inspection_id: string
          notes: string | null
          photos: string[] | null
          room_name: string
          room_order: number
          updated_at: string
          videos: string[] | null
        }
        Insert: {
          condition?: Database["public"]["Enums"]["condition_rating"] | null
          created_at?: string
          id?: string
          inspection_id: string
          notes?: string | null
          photos?: string[] | null
          room_name: string
          room_order?: number
          updated_at?: string
          videos?: string[] | null
        }
        Update: {
          condition?: Database["public"]["Enums"]["condition_rating"] | null
          created_at?: string
          id?: string
          inspection_id?: string
          notes?: string | null
          photos?: string[] | null
          room_name?: string
          room_order?: number
          updated_at?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "tenancy_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          email: string
          expires_at: string
          id: string
          invited_user_id: string | null
          property_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          tenancy_requirements_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_user_id?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenancy_requirements_id?: string | null
          token: string
        }
        Update: {
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_user_id?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          tenancy_requirements_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenancy_requirements_id_fkey"
            columns: ["tenancy_requirements_id"]
            isOneToOne: false
            referencedRelation: "tenancy_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      language_settings: {
        Row: {
          display_order: number | null
          id: string
          is_enabled: boolean | null
          language_code: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          display_order?: number | null
          id?: string
          is_enabled?: boolean | null
          language_code: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          display_order?: number | null
          id?: string
          is_enabled?: boolean | null
          language_code?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      manager_stripe_accounts: {
        Row: {
          created_at: string
          id: string
          manager_id: string
          onboarding_completed_at: string | null
          stripe_account_id: string
          stripe_account_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id: string
          onboarding_completed_at?: string | null
          stripe_account_id: string
          stripe_account_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string
          onboarding_completed_at?: string | null
          stripe_account_id?: string
          stripe_account_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_stripe_accounts_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_stripe_accounts_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_disputes: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          dispute_reason: string
          dispute_status: string
          evidence_due_by: string | null
          id: string
          rent_payment_id: string
          stripe_dispute_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          dispute_reason: string
          dispute_status?: string
          evidence_due_by?: string | null
          id?: string
          rent_payment_id: string
          stripe_dispute_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          dispute_reason?: string
          dispute_status?: string
          evidence_due_by?: string | null
          id?: string
          rent_payment_id?: string
          stripe_dispute_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          created_at: string
          email_status: string | null
          email_subject: string
          email_to: string
          error_message: string | null
          id: string
          reminder_type: string
          rent_payment_id: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          email_status?: string | null
          email_subject: string
          email_to: string
          error_message?: string | null
          id?: string
          reminder_type: string
          rent_payment_id: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          email_status?: string | null
          email_subject?: string
          email_to?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          rent_payment_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          request_details: string | null
          request_type: string
          requested_at: string
          response_details: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          request_details?: string | null
          request_type: string
          requested_at?: string
          response_details?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          request_details?: string | null
          request_type?: string
          requested_at?: string
          response_details?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aml_status: string | null
          avatar_url: string | null
          created_at: string
          default_rent_settings: Json | null
          deletion_requested_at: string | null
          deletion_scheduled_for: string | null
          email: string
          email_verification_expires_at: string | null
          email_verification_sent_at: string | null
          email_verification_token: string | null
          email_verified: boolean | null
          first_name: string | null
          id: string
          id_document_country: string | null
          id_document_type: string | null
          kyc_credential_id: string | null
          kyc_data: Json | null
          kyc_expires_at: string | null
          kyc_provider: string | null
          kyc_qr_code_url: string | null
          kyc_status: string | null
          kyc_verified_at: string | null
          kyc_wallet_did: string | null
          last_name: string | null
          legal_name: string | null
          manager_iban: string | null
          phone: string | null
          sepa_creditor_identifier: string | null
          updated_at: string
        }
        Insert: {
          aml_status?: string | null
          avatar_url?: string | null
          created_at?: string
          default_rent_settings?: Json | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          email: string
          email_verification_expires_at?: string | null
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id: string
          id_document_country?: string | null
          id_document_type?: string | null
          kyc_credential_id?: string | null
          kyc_data?: Json | null
          kyc_expires_at?: string | null
          kyc_provider?: string | null
          kyc_qr_code_url?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_wallet_did?: string | null
          last_name?: string | null
          legal_name?: string | null
          manager_iban?: string | null
          phone?: string | null
          sepa_creditor_identifier?: string | null
          updated_at?: string
        }
        Update: {
          aml_status?: string | null
          avatar_url?: string | null
          created_at?: string
          default_rent_settings?: Json | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          email?: string
          email_verification_expires_at?: string | null
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          id_document_country?: string | null
          id_document_type?: string | null
          kyc_credential_id?: string | null
          kyc_data?: Json | null
          kyc_expires_at?: string | null
          kyc_provider?: string | null
          kyc_qr_code_url?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_wallet_did?: string | null
          last_name?: string | null
          legal_name?: string | null
          manager_iban?: string | null
          phone?: string | null
          sepa_creditor_identifier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          delete_reason: Database["public"]["Enums"]["delete_reason"] | null
          deleted_at: string | null
          description: string | null
          id: string
          images: string[] | null
          manager_id: string
          postal_code: string | null
          state_province: string | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delete_reason?: Database["public"]["Enums"]["delete_reason"] | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          manager_id: string
          postal_code?: string | null
          state_province?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delete_reason?: Database["public"]["Enums"]["delete_reason"] | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          manager_id?: string
          postal_code?: string | null
          state_province?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_category: string | null
          document_title: string
          file_name: string
          file_path: string
          file_size_bytes: number
          file_type: string
          id: string
          is_latest_version: boolean | null
          mime_type: string
          parent_document_id: string | null
          property_id: string | null
          tenancy_id: string | null
          updated_at: string | null
          uploaded_by: string
          version: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_category?: string | null
          document_title?: string
          file_name: string
          file_path: string
          file_size_bytes: number
          file_type: string
          id?: string
          is_latest_version?: boolean | null
          mime_type: string
          parent_document_id?: string | null
          property_id?: string | null
          tenancy_id?: string | null
          updated_at?: string | null
          uploaded_by: string
          version?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_category?: string | null
          document_title?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          file_type?: string
          id?: string
          is_latest_version?: boolean | null
          mime_type?: string
          parent_document_id?: string | null
          property_id?: string | null
          tenancy_id?: string | null
          updated_at?: string | null
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "property_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_tenants: {
        Row: {
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          notes: string | null
          planned_ending_date: string | null
          property_id: string
          started_at: string
          tenancy_status: string | null
          tenant_id: string
          videos: string[] | null
        }
        Insert: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          planned_ending_date?: string | null
          property_id: string
          started_at?: string
          tenancy_status?: string | null
          tenant_id: string
          videos?: string[] | null
        }
        Update: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          planned_ending_date?: string | null
          property_id?: string
          started_at?: string
          tenancy_status?: string | null
          tenant_id?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_property_tenants_profiles"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_property_tenants_profiles"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      qualified_signature_logs: {
        Row: {
          certificate_info: Json | null
          contract_signature_id: string | null
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          provider_code: string
          session_id: string
          signature_data: string | null
          user_agent: string | null
        }
        Insert: {
          certificate_info?: Json | null
          contract_signature_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          provider_code: string
          session_id: string
          signature_data?: string | null
          user_agent?: string | null
        }
        Update: {
          certificate_info?: Json | null
          contract_signature_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          provider_code?: string
          session_id?: string
          signature_data?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualified_signature_logs_contract_signature_id_fkey"
            columns: ["contract_signature_id"]
            isOneToOne: false
            referencedRelation: "contract_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      qualified_signature_providers: {
        Row: {
          config: Json | null
          country_codes: string[]
          created_at: string
          id: string
          installation_url: string | null
          is_active: boolean
          protocol_scheme: string
          provider_code: string
          provider_name: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          country_codes: string[]
          created_at?: string
          id?: string
          installation_url?: string | null
          is_active?: boolean
          protocol_scheme: string
          provider_code: string
          provider_name: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          country_codes?: string[]
          created_at?: string
          id?: string
          installation_url?: string | null
          is_active?: boolean
          protocol_scheme?: string
          provider_code?: string
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          next_run_date: string
          property_id: string
          start_date: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          next_run_date: string
          property_id: string
          start_date: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_run_date?: string
          property_id?: string
          start_date?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ticket_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_agreements: {
        Row: {
          created_at: string
          currency: string
          deposit_return_days: number | null
          end_date: string | null
          id: string
          is_active: boolean
          manager_id: string
          mandate_id: string | null
          mandate_pdf_url: string | null
          mandate_signed_at: string | null
          mandate_status: string
          payment_day: number
          property_id: string
          rent_amount_cents: number
          security_deposit_cents: number | null
          start_date: string
          tenancy_id: string
          tenant_iban: string | null
          tenant_id: string
          updated_at: string
          utilities_manager_responsible: string | null
          utilities_tenant_responsible: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          deposit_return_days?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          manager_id: string
          mandate_id?: string | null
          mandate_pdf_url?: string | null
          mandate_signed_at?: string | null
          mandate_status?: string
          payment_day: number
          property_id: string
          rent_amount_cents: number
          security_deposit_cents?: number | null
          start_date: string
          tenancy_id: string
          tenant_iban?: string | null
          tenant_id: string
          updated_at?: string
          utilities_manager_responsible?: string | null
          utilities_tenant_responsible?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          deposit_return_days?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string
          mandate_id?: string | null
          mandate_pdf_url?: string | null
          mandate_signed_at?: string | null
          mandate_status?: string
          payment_day?: number
          property_id?: string
          rent_amount_cents?: number
          security_deposit_cents?: number | null
          start_date?: string
          tenancy_id?: string
          tenant_iban?: string | null
          tenant_id?: string
          updated_at?: string
          utilities_manager_responsible?: string | null
          utilities_tenant_responsible?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_agreements_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_agreements_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_agreements_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "property_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          manager_id: string
          manager_reviewed: boolean | null
          manager_reviewed_at: string | null
          manager_reviewed_by: string | null
          notes: string | null
          payment_date: string | null
          payment_due_date: string | null
          payment_method: string | null
          payment_received_date: string | null
          payment_status: string
          processed_at: string | null
          proof_of_payment_url: string | null
          proof_review_notes: string | null
          proof_review_status: string | null
          property_id: string
          rent_agreement_id: string
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          tenant_confirmed: boolean | null
          tenant_confirmed_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          manager_id: string
          manager_reviewed?: boolean | null
          manager_reviewed_at?: string | null
          manager_reviewed_by?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_due_date?: string | null
          payment_method?: string | null
          payment_received_date?: string | null
          payment_status?: string
          processed_at?: string | null
          proof_of_payment_url?: string | null
          proof_review_notes?: string | null
          proof_review_status?: string | null
          property_id: string
          rent_agreement_id: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_confirmed?: boolean | null
          tenant_confirmed_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          manager_id?: string
          manager_reviewed?: boolean | null
          manager_reviewed_at?: string | null
          manager_reviewed_by?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_due_date?: string | null
          payment_method?: string | null
          payment_received_date?: string | null
          payment_status?: string
          processed_at?: string | null
          proof_of_payment_url?: string | null
          proof_review_notes?: string | null
          proof_review_status?: string | null
          property_id?: string
          rent_agreement_id?: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_confirmed?: boolean | null
          tenant_confirmed_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_rent_agreement_id_fkey"
            columns: ["rent_agreement_id"]
            isOneToOne: false
            referencedRelation: "rent_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_shops: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          license_number: string | null
          manager_id: string
          notes: string | null
          phone: string
          postal_code: string | null
          specializations: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          manager_id: string
          notes?: string | null
          phone: string
          postal_code?: string | null
          specializations?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          manager_id?: string
          notes?: string | null
          phone?: string
          postal_code?: string | null
          specializations?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      signature_events: {
        Row: {
          contract_signature_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          contract_signature_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          contract_signature_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_contract_signature_id_fkey"
            columns: ["contract_signature_id"]
            isOneToOne: false
            referencedRelation: "contract_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_maintenance_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          priority: Database["public"]["Enums"]["ticket_priority"]
          suggested_frequency: string
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          suggested_frequency: string
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          suggested_frequency?: string
          title?: string
          type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          event_data: Json
          event_type: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          change_reason: string
          changed_at: string
          changed_by: string | null
          from_plan_id: string | null
          id: string
          metadata: Json | null
          to_plan_id: string
          user_id: string
        }
        Insert: {
          change_reason: string
          changed_at?: string
          changed_by?: string | null
          from_plan_id?: string | null
          id?: string
          metadata?: Json | null
          to_plan_id: string
          user_id: string
        }
        Update: {
          change_reason?: string
          changed_at?: string
          changed_by?: string | null
          from_plan_id?: string | null
          id?: string
          metadata?: Json | null
          to_plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          feature_limits: Json
          features_display: Json | null
          grace_period_days: number
          id: string
          is_available_for_signup: boolean
          is_default: boolean
          limitations_display: Json | null
          name: string
          overage_price_per_government_id_cents: number | null
          overage_price_per_signature_cents: number
          price_annual_cents: number
          price_monthly_cents: number
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["plan_status"]
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          stripe_product_id: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_limits?: Json
          features_display?: Json | null
          grace_period_days?: number
          id?: string
          is_available_for_signup?: boolean
          is_default?: boolean
          limitations_display?: Json | null
          name: string
          overage_price_per_government_id_cents?: number | null
          overage_price_per_signature_cents?: number
          price_annual_cents?: number
          price_monthly_cents?: number
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_limits?: Json
          features_display?: Json | null
          grace_period_days?: number
          id?: string
          is_available_for_signup?: boolean
          is_default?: boolean
          limitations_display?: Json | null
          name?: string
          overage_price_per_government_id_cents?: number | null
          overage_price_per_signature_cents?: number
          price_annual_cents?: number
          price_monthly_cents?: number
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          created_at: string
          government_id_verifications_used: number
          id: string
          last_gov_id_overage_billed_at: string | null
          last_overage_billed_at: string | null
          overage_government_id_used: number
          overage_signatures_used: number
          reset_at: string
          signatures_used: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          government_id_verifications_used?: number
          id?: string
          last_gov_id_overage_billed_at?: string | null
          last_overage_billed_at?: string | null
          overage_government_id_used?: number
          overage_signatures_used?: number
          reset_at: string
          signatures_used?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          government_id_verifications_used?: number
          id?: string
          last_gov_id_overage_billed_at?: string | null
          last_overage_billed_at?: string | null
          overage_government_id_used?: number
          overage_signatures_used?: number
          reset_at?: string
          signatures_used?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_inspections: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          inspection_date: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          manager_id: string | null
          manager_signature_data: Json | null
          manager_signed_at: string | null
          notes: string | null
          overall_condition: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          property_id: string
          status: Database["public"]["Enums"]["inspection_status"]
          template_document_id: string | null
          tenancy_id: string
          tenant_id: string | null
          tenant_signature_data: Json | null
          tenant_signed_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          inspection_date?: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          manager_id?: string | null
          manager_signature_data?: Json | null
          manager_signed_at?: string | null
          notes?: string | null
          overall_condition?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["inspection_status"]
          template_document_id?: string | null
          tenancy_id: string
          tenant_id?: string | null
          tenant_signature_data?: Json | null
          tenant_signed_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          inspection_date?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          manager_id?: string | null
          manager_signature_data?: Json | null
          manager_signed_at?: string | null
          notes?: string | null
          overall_condition?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          template_document_id?: string | null
          tenancy_id?: string
          tenant_id?: string | null
          tenant_signature_data?: Json | null
          tenant_signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_template_document_id_fkey"
            columns: ["template_document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "property_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_requirements: {
        Row: {
          contract_method: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          end_date: string | null
          id: string
          invitation_id: string | null
          payment_day: number | null
          property_id: string
          questionnaire_config: Json | null
          questionnaire_enabled: boolean | null
          rent_amount_cents: number | null
          require_email_verification: boolean | null
          require_kyc_verification: boolean | null
          require_phone_verification: boolean | null
          security_deposit_cents: number | null
          selected_template_id: string | null
          start_date: string | null
          status: string | null
          tenancy_id: string | null
          tenant_email: string
          updated_at: string | null
          utilities_config: Json | null
        }
        Insert: {
          contract_method?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          end_date?: string | null
          id?: string
          invitation_id?: string | null
          payment_day?: number | null
          property_id: string
          questionnaire_config?: Json | null
          questionnaire_enabled?: boolean | null
          rent_amount_cents?: number | null
          require_email_verification?: boolean | null
          require_kyc_verification?: boolean | null
          require_phone_verification?: boolean | null
          security_deposit_cents?: number | null
          selected_template_id?: string | null
          start_date?: string | null
          status?: string | null
          tenancy_id?: string | null
          tenant_email: string
          updated_at?: string | null
          utilities_config?: Json | null
        }
        Update: {
          contract_method?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          end_date?: string | null
          id?: string
          invitation_id?: string | null
          payment_day?: number | null
          property_id?: string
          questionnaire_config?: Json | null
          questionnaire_enabled?: boolean | null
          rent_amount_cents?: number | null
          require_email_verification?: boolean | null
          require_kyc_verification?: boolean | null
          require_phone_verification?: boolean | null
          security_deposit_cents?: number | null
          selected_template_id?: string | null
          start_date?: string | null
          status?: string | null
          tenancy_id?: string | null
          tenant_email?: string
          updated_at?: string | null
          utilities_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_requirements_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_requirements_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_requirements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_requirements_selected_template_id_fkey"
            columns: ["selected_template_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_requirements_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "property_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          ticket_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_path: string
          file_size_bytes: number
          file_type: string
          id: string
          original_filename: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size_bytes: number
          file_type: string
          id?: string
          original_filename: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size_bytes?: number
          file_type?: string
          id?: string
          original_filename?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          property_id: string
          source_standard_template_id: string | null
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          property_id: string
          source_standard_template_id?: string | null
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          property_id?: string
          source_standard_template_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_templates_source_standard_template_id_fkey"
            columns: ["source_standard_template_id"]
            isOneToOne: false
            referencedRelation: "standard_maintenance_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          property_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_template_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          property_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          property_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title?: string
          type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "ticket_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          cookie_consent_analytics: boolean | null
          cookie_consent_given_at: string | null
          created_at: string | null
          date_format: string | null
          font_size: string | null
          id: string
          language: string | null
          theme_mode: string | null
          updated_at: string | null
          user_id: string
          week_start_day: string | null
        }
        Insert: {
          cookie_consent_analytics?: boolean | null
          cookie_consent_given_at?: string | null
          created_at?: string | null
          date_format?: string | null
          font_size?: string | null
          id?: string
          language?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id: string
          week_start_day?: string | null
        }
        Update: {
          cookie_consent_analytics?: boolean | null
          cookie_consent_given_at?: string | null
          created_at?: string | null
          date_format?: string | null
          font_size?: string | null
          id?: string
          language?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id?: string
          week_start_day?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          admin_granted_at: string | null
          admin_granted_by: string | null
          admin_granted_duration_days: number | null
          admin_granted_reason: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_ends_at: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_granted_at?: string | null
          admin_granted_by?: string | null
          admin_granted_duration_days?: number | null
          admin_granted_reason?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_granted_at?: string | null
          admin_granted_by?: string | null
          admin_granted_duration_days?: number | null
          admin_granted_reason?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_admin_granted_by_fkey"
            columns: ["admin_granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_admin_granted_by_fkey"
            columns: ["admin_granted_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_payments: {
        Row: {
          amount_cents: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          currency: string
          custom_utility_name: string | null
          id: string
          manager_id: string
          manager_reviewed_at: string | null
          manager_reviewed_by: string | null
          notes: string | null
          payment_date: string | null
          payment_due_date: string
          proof_of_payment_url: string | null
          proof_review_notes: string | null
          proof_review_status: string | null
          property_id: string
          status: string
          tenant_id: string
          updated_at: string
          utility_type: string
        }
        Insert: {
          amount_cents: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          currency?: string
          custom_utility_name?: string | null
          id?: string
          manager_id: string
          manager_reviewed_at?: string | null
          manager_reviewed_by?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_due_date: string
          proof_of_payment_url?: string | null
          proof_review_notes?: string | null
          proof_review_status?: string | null
          property_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          utility_type: string
        }
        Update: {
          amount_cents?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          currency?: string
          custom_utility_name?: string | null
          id?: string
          manager_id?: string
          manager_reviewed_at?: string | null
          manager_reviewed_by?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_due_date?: string
          proof_of_payment_url?: string | null
          proof_review_notes?: string | null
          proof_review_status?: string | null
          property_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          utility_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      invitations_safe: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          invited_user_id: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_user_id?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_user_id?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          first_name: string | null
          id: string | null
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_create_active_property: {
        Args: { p_address: string }
        Returns: boolean
      }
      can_end_tenancy: {
        Args: { p_address: string; p_property_id: string }
        Returns: boolean
      }
      can_upload_photo: {
        Args: { _file_size_bytes: number; _ticket_id: string }
        Returns: boolean
      }
      can_upload_property_document: {
        Args: { _file_size_bytes: number; _property_id: string }
        Returns: boolean
      }
      can_upload_video: {
        Args: { _file_size_bytes: number; _ticket_id: string }
        Returns: boolean
      }
      can_use_feature: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      can_view_full_profile: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_email_has_account: {
        Args: { check_email: string }
        Returns: boolean
      }
      generate_rent_payments: {
        Args: { p_agreement_id: string; p_months_ahead?: number }
        Returns: number
      }
      get_auth_user_email: { Args: never; Returns: string }
      get_properties_status_indicators: {
        Args: { p_property_ids: string[] }
        Returns: {
          maintenance_has_data: boolean
          maintenance_overdue: boolean
          property_id: string
          rent_has_data: boolean
          rent_overdue: boolean
          tickets_has_data: boolean
          tickets_open: boolean
          utility_has_data: boolean
          utility_overdue: boolean
        }[]
      }
      get_property_tenant_status: {
        Args: { p_property_id: string }
        Returns: {
          pending_invites: number
          status: string
          tenant_email: string
          tenant_name: string
        }[]
      }
      get_user_subscription: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_gov_id_used: {
        Args: { p_amount?: number; p_user_id: string; p_year: number }
        Returns: undefined
      }
      increment_overage_gov_id: {
        Args: { p_amount?: number; p_user_id: string; p_year: number }
        Returns: undefined
      }
      increment_overage_signatures: {
        Args: { p_amount?: number; p_user_id: string; p_year: number }
        Returns: undefined
      }
      increment_signatures_used: {
        Args: { p_amount?: number; p_user_id: string; p_year: number }
        Returns: undefined
      }
      is_property_manager: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      is_property_tenant: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      condition_rating: "excellent" | "good" | "fair" | "poor" | "damaged"
      delete_reason:
        | "sold"
        | "no_longer_managing"
        | "merged_with_other_property"
        | "other"
      inspection_status:
        | "draft"
        | "in_progress"
        | "pending_signatures"
        | "completed"
      inspection_type: "move_in" | "move_out"
      invitation_status:
        | "pending"
        | "accepted"
        | "expired"
        | "declined"
        | "property_inactive"
        | "already_tenant"
        | "cancelled"
      plan_status: "active" | "inactive" | "archived"
      property_status: "active" | "inactive" | "ending_tenancy"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "expired"
      subscription_type: "stripe" | "admin_grant" | "free"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "cancelled"
      ticket_type:
        | "issue"
        | "request"
        | "incident"
        | "maintenance"
        | "repair"
        | "inspection"
        | "cleaning"
        | "other"
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
      app_role: ["admin", "user"],
      condition_rating: ["excellent", "good", "fair", "poor", "damaged"],
      delete_reason: [
        "sold",
        "no_longer_managing",
        "merged_with_other_property",
        "other",
      ],
      inspection_status: [
        "draft",
        "in_progress",
        "pending_signatures",
        "completed",
      ],
      inspection_type: ["move_in", "move_out"],
      invitation_status: [
        "pending",
        "accepted",
        "expired",
        "declined",
        "property_inactive",
        "already_tenant",
        "cancelled",
      ],
      plan_status: ["active", "inactive", "archived"],
      property_status: ["active", "inactive", "ending_tenancy"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "expired",
      ],
      subscription_type: ["stripe", "admin_grant", "free"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "cancelled"],
      ticket_type: [
        "issue",
        "request",
        "incident",
        "maintenance",
        "repair",
        "inspection",
        "cleaning",
        "other",
      ],
    },
  },
} as const
