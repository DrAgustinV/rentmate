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
          custom_domain: string | null
          id: string
          logo_url: string | null
          primary_color: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          brand_name?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          brand_name?: string
          custom_domain?: string | null
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
          created_at: string
          expires_at: string | null
          id: string
          initiated_at: string
          initiated_by: string
          manager_signature_ip: string | null
          manager_signature_method: string | null
          manager_signed_at: string | null
          property_id: string
          signed_document_url: string | null
          tenancy_id: string
          tenant_signature_ip: string | null
          tenant_signature_method: string | null
          tenant_signed_at: string | null
          updated_at: string
          workflow_id: string | null
          workflow_status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by: string
          manager_signature_ip?: string | null
          manager_signature_method?: string | null
          manager_signed_at?: string | null
          property_id: string
          signed_document_url?: string | null
          tenancy_id: string
          tenant_signature_ip?: string | null
          tenant_signature_method?: string | null
          tenant_signed_at?: string | null
          updated_at?: string
          workflow_id?: string | null
          workflow_status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string
          manager_signature_ip?: string | null
          manager_signature_method?: string | null
          manager_signed_at?: string | null
          property_id?: string
          signed_document_url?: string | null
          tenancy_id?: string
          tenant_signature_ip?: string | null
          tenant_signature_method?: string | null
          tenant_signed_at?: string | null
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
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_user_id: string | null
          property_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_user_id?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_user_id?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
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
      profiles: {
        Row: {
          aml_status: string | null
          created_at: string
          dock_kyc_credential_id: string | null
          dock_kyc_qr_code_url: string | null
          dock_wallet_did: string | null
          email: string
          first_name: string | null
          id: string
          id_document_country: string | null
          id_document_type: string | null
          kyc_expires_at: string | null
          kyc_status: string | null
          kyc_verified_at: string | null
          last_name: string | null
          legal_name: string | null
          manager_iban: string | null
          phone: string | null
          sepa_creditor_identifier: string | null
          updated_at: string
        }
        Insert: {
          aml_status?: string | null
          created_at?: string
          dock_kyc_credential_id?: string | null
          dock_kyc_qr_code_url?: string | null
          dock_wallet_did?: string | null
          email: string
          first_name?: string | null
          id: string
          id_document_country?: string | null
          id_document_type?: string | null
          kyc_expires_at?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          last_name?: string | null
          legal_name?: string | null
          manager_iban?: string | null
          phone?: string | null
          sepa_creditor_identifier?: string | null
          updated_at?: string
        }
        Update: {
          aml_status?: string | null
          created_at?: string
          dock_kyc_credential_id?: string | null
          dock_kyc_qr_code_url?: string | null
          dock_wallet_did?: string | null
          email?: string
          first_name?: string | null
          id?: string
          id_document_country?: string | null
          id_document_type?: string | null
          kyc_expires_at?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
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
          created_at: string
          delete_reason: Database["public"]["Enums"]["delete_reason"] | null
          deleted_at: string | null
          description: string | null
          id: string
          images: string[] | null
          last_modified_by: string | null
          manager_id: string
          modification_reason: string | null
          previous_property_id: string | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
          videos: string[] | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          delete_reason?: Database["public"]["Enums"]["delete_reason"] | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          last_modified_by?: string | null
          manager_id: string
          modification_reason?: string | null
          previous_property_id?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
          videos?: string[] | null
        }
        Update: {
          address?: string | null
          created_at?: string
          delete_reason?: Database["public"]["Enums"]["delete_reason"] | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          last_modified_by?: string | null
          manager_id?: string
          modification_reason?: string | null
          previous_property_id?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_previous_property_id_fkey"
            columns: ["previous_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          property_id: string
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
          property_id: string
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
          property_id?: string
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
        ]
      }
      property_tenants: {
        Row: {
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          notes: string | null
          property_id: string
          started_at: string
          tenancy_status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          property_id: string
          started_at?: string
          tenancy_status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          started_at?: string
          tenancy_status?: string | null
          tenant_id?: string
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
            foreignKeyName: "property_tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          start_date: string
          tenancy_id: string
          tenant_iban: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
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
          start_date: string
          tenancy_id: string
          tenant_iban?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
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
          start_date?: string
          tenancy_id?: string
          tenant_iban?: string | null
          tenant_id?: string
          updated_at?: string
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
          notes: string | null
          payment_date: string | null
          payment_due_date: string | null
          payment_method: string | null
          payment_received_date: string | null
          payment_status: string
          processed_at: string | null
          property_id: string
          rent_agreement_id: string
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
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
          notes?: string | null
          payment_date?: string | null
          payment_due_date?: string | null
          payment_method?: string | null
          payment_received_date?: string | null
          payment_status?: string
          processed_at?: string | null
          property_id: string
          rent_agreement_id: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
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
          notes?: string | null
          payment_date?: string | null
          payment_due_date?: string | null
          payment_method?: string | null
          payment_received_date?: string | null
          payment_status?: string
          processed_at?: string | null
          property_id?: string
          rent_agreement_id?: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
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
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "tickets_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "ticket_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
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
      generate_rent_payments: {
        Args: { p_agreement_id: string; p_months_ahead?: number }
        Returns: number
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      delete_reason:
        | "sold"
        | "no_longer_managing"
        | "merged_with_other_property"
        | "other"
      invitation_status:
        | "pending"
        | "accepted"
        | "expired"
        | "declined"
        | "property_inactive"
        | "already_tenant"
        | "cancelled"
      property_status: "active" | "inactive" | "ending_tenancy"
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
      delete_reason: [
        "sold",
        "no_longer_managing",
        "merged_with_other_property",
        "other",
      ],
      invitation_status: [
        "pending",
        "accepted",
        "expired",
        "declined",
        "property_inactive",
        "already_tenant",
        "cancelled",
      ],
      property_status: ["active", "inactive", "ending_tenancy"],
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
