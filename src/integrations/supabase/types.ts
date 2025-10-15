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
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
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
          accent_color: string | null
          created_at: string | null
          date_format: string | null
          font_size: string | null
          id: string
          language: string | null
          primary_color: string | null
          theme_mode: string | null
          updated_at: string | null
          user_id: string
          week_start_day: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          date_format?: string | null
          font_size?: string | null
          id?: string
          language?: string | null
          primary_color?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id: string
          week_start_day?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          date_format?: string | null
          font_size?: string | null
          id?: string
          language?: string | null
          primary_color?: string | null
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
      [_ in never]: never
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
