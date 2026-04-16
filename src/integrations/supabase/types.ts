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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allies: {
        Row: {
          active: boolean
          contact_info: Json | null
          created_at: string
          ein: string | null
          id: string
          name: string
          notes: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact_info?: Json | null
          created_at?: string
          ein?: string | null
          id?: string
          name: string
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact_info?: Json | null
          created_at?: string
          ein?: string | null
          id?: string
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_status: string
          assignee_id: string | null
          assigned_manager_id: string | null
          assigned_rep_id: string | null
          conflict_flag: boolean | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          date_time: string
          duration_minutes: number | null
          external_id: string | null
          id: string
          job_id: string | null
          notes: string | null
          notification_settings: Json
          outcome: string | null
          timezone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_status?: string
          assignee_id?: string | null
          assigned_manager_id?: string | null
          assigned_rep_id?: string | null
          conflict_flag?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          date_time: string
          duration_minutes?: number | null
          external_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          notification_settings?: Json
          outcome?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_status?: string
          assignee_id?: string | null
          assigned_manager_id?: string | null
          assigned_rep_id?: string | null
          conflict_flag?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          date_time?: string
          duration_minutes?: number | null
          external_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          notification_settings?: Json
          outcome?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          subject_user_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          subject_user_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          subject_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          call_time: string
          created_at: string
          id: string
          master_lead_id: string
          notes: string | null
          outcome: string
          setter_id: string
        }
        Insert: {
          call_time?: string
          created_at?: string
          id?: string
          master_lead_id: string
          notes?: string | null
          outcome?: string
          setter_id: string
        }
        Update: {
          call_time?: string
          created_at?: string
          id?: string
          master_lead_id?: string
          notes?: string | null
          outcome?: string
          setter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_master_lead_id_fkey"
            columns: ["master_lead_id"]
            isOneToOne: false
            referencedRelation: "master_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      check_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          check_id: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          check_id: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          check_id?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_history_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "payment_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          base_rep_id: string | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          override_amount: number
          rep_id: string
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          amount?: number
          base_rep_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          override_amount?: number
          rep_id: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          amount?: number
          base_rep_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          override_amount?: number
          rep_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_rep_id: string | null
          billing_address: Json | null
          company_name: string | null
          contact_info: Json | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          customer_number: string
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          id: string
          insurance_carrier: string | null
          lead_source: string | null
          main_address: Json | null
          name: string
          name_json: Json | null
          notes: string | null
          prior_crm_location: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          assigned_rep_id?: string | null
          billing_address?: Json | null
          company_name?: string | null
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          customer_number: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          insurance_carrier?: string | null
          lead_source?: string | null
          main_address?: Json | null
          name: string
          name_json?: Json | null
          notes?: string | null
          prior_crm_location?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          assigned_rep_id?: string | null
          billing_address?: Json | null
          company_name?: string | null
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          customer_number?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          insurance_carrier?: string | null
          lead_source?: string | null
          main_address?: Json | null
          name?: string
          name_json?: Json | null
          notes?: string | null
          prior_crm_location?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          job_id: string
          sitecam_media_id: string | null
          type: Database["public"]["Enums"]["doc_type"]
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          job_id: string
          sitecam_media_id?: string | null
          type?: Database["public"]["Enums"]["doc_type"]
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          job_id?: string
          sitecam_media_id?: string | null
          type?: Database["public"]["Enums"]["doc_type"]
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "job_document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_sitecam_media_id_fkey"
            columns: ["sitecam_media_id"]
            isOneToOne: false
            referencedRelation: "sitecam_media"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deducted_from: string | null
          draw_date: string
          id: string
          job_id: string
          notes: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deducted_from?: string | null
          draw_date?: string
          id?: string
          job_id: string
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deducted_from?: string | null
          draw_date?: string
          id?: string
          job_id?: string
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draws_deducted_from_fkey"
            columns: ["deducted_from"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draws_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          active: boolean
          allows_negative: boolean
          category: string
          created_at: string
          default_rate: number
          default_unit: string
          description: string
          icon: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allows_negative?: boolean
          category?: string
          created_at?: string
          default_rate?: number
          default_unit?: string
          description?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allows_negative?: boolean
          category?: string
          created_at?: string
          default_rate?: number
          default_unit?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number
          errors: Json | null
          file_name: string
          id: string
          mappings: Json | null
          processed_count: number
          status: string
          total_rows: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: Json | null
          file_name?: string
          id?: string
          mappings?: Json | null
          processed_count?: number
          status?: string
          total_rows?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: Json | null
          file_name?: string
          id?: string
          mappings?: Json | null
          processed_count?: number
          status?: string
          total_rows?: number
          user_id?: string
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          adjuster_contact: Json | null
          approved_date: string | null
          carrier: string
          claim_number: string | null
          closed_date: string | null
          created_at: string
          filed_date: string | null
          id: string
          is_out_of_scope: boolean
          job_id: string
          notes: string | null
          policy_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adjuster_contact?: Json | null
          approved_date?: string | null
          carrier?: string
          claim_number?: string | null
          closed_date?: string | null
          created_at?: string
          filed_date?: string | null
          id?: string
          is_out_of_scope?: boolean
          job_id: string
          notes?: string | null
          policy_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adjuster_contact?: Json | null
          approved_date?: string | null
          carrier?: string
          claim_number?: string | null
          closed_date?: string | null
          created_at?: string
          filed_date?: string | null
          id?: string
          is_out_of_scope?: boolean
          job_id?: string
          notes?: string | null
          policy_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations_config: {
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
      inventory: {
        Row: {
          created_at: string
          id: string
          job_allocations: Json | null
          min_stock: number
          name: string
          sku: string | null
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_allocations?: Json | null
          min_stock?: number
          name: string
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_allocations?: Json | null
          min_stock?: number
          name?: string
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_assignments: {
        Row: {
          assigned_at: string
          assignment_role: Database["public"]["Enums"]["assignment_role"]
          id: string
          job_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assignment_role?: Database["public"]["Enums"]["assignment_role"]
          id?: string
          job_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assignment_role?: Database["public"]["Enums"]["assignment_role"]
          id?: string
          job_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_document_folders: {
        Row: {
          created_at: string
          id: string
          job_id: string
          name: string
          parent_id: string | null
          scope: Database["public"]["Enums"]["job_document_folder_scope"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          name: string
          parent_id?: string | null
          scope: Database["public"]["Enums"]["job_document_folder_scope"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          name?: string
          parent_id?: string | null
          scope?: Database["public"]["Enums"]["job_document_folder_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_document_folders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "job_document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_expenses: {
        Row: {
          ally_id: string | null
          amount: number
          created_at: string
          created_by: string | null
          expense_date: string
          expense_type_id: string
          id: string
          job_id: string
          notes: string | null
          reference_number: string | null
          sub_id: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          ally_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          expense_date?: string
          expense_type_id: string
          id?: string
          job_id: string
          notes?: string | null
          reference_number?: string | null
          sub_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          ally_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          expense_date?: string
          expense_type_id?: string
          id?: string
          job_id?: string
          notes?: string | null
          reference_number?: string | null
          sub_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_expenses_ally_id_fkey"
            columns: ["ally_id"]
            isOneToOne: false
            referencedRelation: "allies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_expenses_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_type_usage"
            referencedColumns: ["type_id"]
          },
          {
            foreignKeyName: "job_expenses_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_expenses_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          edited_by: string | null
          id: string
          job_id: string
          type: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          job_id: string
          type?: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          job_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_production_items: {
        Row: {
          assigned_to_user_id: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          crew_assigned: unknown
          dependencies: string | null
          delivery_date: string | null
          drop_location: string | null
          estimate_per_sq: number | null
          id: string
          job_id: string
          labor_cost: number
          labor_vendor: string | null
          material_cost: number
          material_logistics: Json
          material_order_status: string
          material_vendor: string | null
          pre_draw_amount: number | null
          quantity: number
          qualification_status: string
          recoverable_depreciation: number | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          scope_description: string
          scope_metadata: unknown
          sol_notes: string | null
          status: string
          trade_type_id: string
          unit_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          crew_assigned?: unknown
          dependencies?: string | null
          delivery_date?: string | null
          drop_location?: string | null
          estimate_per_sq?: number | null
          id?: string
          job_id: string
          labor_cost?: number
          labor_vendor?: string | null
          material_cost?: number
          material_logistics?: Json
          material_order_status?: string
          material_vendor?: string | null
          pre_draw_amount?: number | null
          quantity?: number
          qualification_status?: string
          recoverable_depreciation?: number | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          scope_description?: string
          scope_metadata?: unknown
          sol_notes?: string | null
          status?: string
          trade_type_id: string
          unit_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          crew_assigned?: unknown
          dependencies?: string | null
          delivery_date?: string | null
          drop_location?: string | null
          estimate_per_sq?: number | null
          id?: string
          job_id?: string
          labor_cost?: number
          labor_vendor?: string | null
          material_cost?: number
          material_logistics?: Json
          material_order_status?: string
          material_vendor?: string | null
          pre_draw_amount?: number | null
          quantity?: number
          qualification_status?: string
          recoverable_depreciation?: number | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          scope_description?: string
          scope_metadata?: unknown
          sol_notes?: string | null
          status?: string
          trade_type_id?: string
          unit_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_production_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_production_items_trade_type_id_fkey"
            columns: ["trade_type_id"]
            isOneToOne: false
            referencedRelation: "trade_types"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_flows: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          enforce_sequence: boolean
          flow_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          enforce_sequence?: boolean
          flow_type: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          enforce_sequence?: boolean
          flow_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      flow_stages: {
        Row: {
          active: boolean
          color: string
          created_at: string
          display_name: string
          flow_id: string
          id: string
          is_milestone: boolean
          name: string
          sequence: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          display_name: string
          flow_id: string
          id?: string
          is_milestone?: boolean
          name: string
          sequence: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          display_name?: string
          flow_id?: string
          id?: string
          is_milestone?: boolean
          name?: string
          sequence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_stages_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "custom_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          aggregated_financials: Json | null
          claim_number: string | null
          created_at: string
          archived_at: string | null
          customer_id: string
          dates: Json
          deleted_at: string | null
          estimate_amount: number
          financials: Json
          has_supplement: boolean | null
          id: string
          job_id: string
          job_type: string
          notes: string | null
          number_of_squares: number | null
          squares_estimated: number | null
          squares_actual_installed: number | null
          squares_final: number | null
          parent_job_id: string | null
          production_milestones: Json | null
          qualification: Json | null
          sales_rep_id: string | null
          site_address: Json | null
          status: string
          sub_number: number | null
          supplement_status: string | null
          tracking: Json | null
          trade_types: string[]
          updated_at: string
        }
        Insert: {
          aggregated_financials?: Json | null
          claim_number?: string | null
          created_at?: string
          archived_at?: string | null
          customer_id: string
          dates?: Json
          deleted_at?: string | null
          estimate_amount?: number
          financials?: Json
          has_supplement?: boolean | null
          id?: string
          job_id: string
          job_type?: string
          notes?: string | null
          number_of_squares?: number | null
          squares_estimated?: number | null
          squares_actual_installed?: number | null
          squares_final?: number | null
          parent_job_id?: string | null
          production_milestones?: Json | null
          qualification?: Json | null
          sales_rep_id?: string | null
          site_address?: Json | null
          status?: string
          sub_number?: number | null
          supplement_status?: string | null
          tracking?: Json | null
          trade_types?: string[]
          updated_at?: string
        }
        Update: {
          aggregated_financials?: Json | null
          archived_at?: string | null
          claim_number?: string | null
          created_at?: string
          customer_id?: string
          dates?: Json
          deleted_at?: string | null
          estimate_amount?: number
          financials?: Json
          has_supplement?: boolean | null
          id?: string
          job_id?: string
          job_type?: string
          notes?: string | null
          number_of_squares?: number | null
          squares_estimated?: number | null
          squares_actual_installed?: number | null
          squares_final?: number | null
          parent_job_id?: string | null
          production_milestones?: Json | null
          qualification?: Json | null
          sales_rep_id?: string | null
          site_address?: Json | null
          status?: string
          sub_number?: number | null
          supplement_status?: string | null
          tracking?: Json | null
          trade_types?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          assigned_date: string
          assigned_rep_id: string
          created_at: string
          customer_id: string
          id: string
          job_id: string | null
          lead_source_id: string
          package_id: string | null
          status: Database["public"]["Enums"]["lead_assignment_status"]
        }
        Insert: {
          assigned_date?: string
          assigned_rep_id: string
          created_at?: string
          customer_id: string
          id?: string
          job_id?: string | null
          lead_source_id: string
          package_id?: string | null
          status?: Database["public"]["Enums"]["lead_assignment_status"]
        }
        Update: {
          assigned_date?: string
          assigned_rep_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string | null
          lead_source_id?: string
          package_id?: string | null
          status?: Database["public"]["Enums"]["lead_assignment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "lead_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_distribution_rules: {
        Row: {
          created_at: string
          enforce_strict: boolean
          id: string
          lead_batch_size: number
          min_contracts_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enforce_strict?: boolean
          id?: string
          lead_batch_size?: number
          min_contracts_required?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enforce_strict?: boolean
          id?: string
          lead_batch_size?: number
          min_contracts_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_packages: {
        Row: {
          cost_per_lead: number
          created_at: string
          created_by: string | null
          id: string
          lead_source_id: string
          leads_remaining: number
          notes: string | null
          package_size: number
          purchase_date: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          cost_per_lead?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lead_source_id: string
          leads_remaining: number
          notes?: string | null
          package_size: number
          purchase_date?: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          cost_per_lead?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lead_source_id?: string
          leads_remaining?: number
          notes?: string | null
          package_size?: number
          purchase_date?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_packages_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_segments: {
        Row: {
          created_at: string
          created_by: string | null
          filter_type: string
          filter_value: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filter_type?: string
          filter_value?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filter_type?: string
          filter_value?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          active: boolean
          color: string
          created_at: string
          default_cost_per_lead: number
          display_name: string
          id: string
          name: string
          requires_pool: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          default_cost_per_lead?: number
          display_name: string
          id?: string
          name: string
          requires_pool?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          default_cost_per_lead?: number
          display_name?: string
          id?: string
          name?: string
          requires_pool?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      master_leads: {
        Row: {
          allows_inspection: boolean
          appointment_date: string | null
          appointment_time: string
          assigned_date: string | null
          assigned_setter_id: string | null
          city: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          do_not_call: boolean
          dwelling_type: string
          dwelling_type_desc: string
          email: string
          first_name: string
          has_insurance: boolean
          homeowner_indicator_desc: string
          homeowner_present: boolean
          id: string
          is_qualified: boolean | null
          last_name: string
          lead_source_id: string | null
          notes: string | null
          phone: string
          state: string
          status: Database["public"]["Enums"]["master_lead_status"]
          street: string
          updated_at: string
          wireless: boolean
          zip: string
        }
        Insert: {
          allows_inspection?: boolean
          appointment_date?: string | null
          appointment_time?: string
          assigned_date?: string | null
          assigned_setter_id?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          do_not_call?: boolean
          dwelling_type?: string
          dwelling_type_desc?: string
          email?: string
          first_name?: string
          has_insurance?: boolean
          homeowner_indicator_desc?: string
          homeowner_present?: boolean
          id?: string
          is_qualified?: boolean | null
          last_name?: string
          lead_source_id?: string | null
          notes?: string | null
          phone?: string
          state?: string
          status?: Database["public"]["Enums"]["master_lead_status"]
          street?: string
          updated_at?: string
          wireless?: boolean
          zip?: string
        }
        Update: {
          allows_inspection?: boolean
          appointment_date?: string | null
          appointment_time?: string
          assigned_date?: string | null
          assigned_setter_id?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          do_not_call?: boolean
          dwelling_type?: string
          dwelling_type_desc?: string
          email?: string
          first_name?: string
          has_insurance?: boolean
          homeowner_indicator_desc?: string
          homeowner_present?: boolean
          id?: string
          is_qualified?: boolean | null
          last_name?: string
          lead_source_id?: string | null
          notes?: string | null
          phone?: string
          state?: string
          status?: Database["public"]["Enums"]["master_lead_status"]
          street?: string
          updated_at?: string
          wireless?: boolean
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_leads_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          job_id: string
          milestone_type: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          job_id: string
          milestone_type: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          job_id?: string
          milestone_type?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_checks: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          date_received: string | null
          id: string
          job_id: string
          notes: string | null
          status: Database["public"]["Enums"]["check_status"]
          type: Database["public"]["Enums"]["check_type"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          date_received?: string | null
          id?: string
          job_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["check_status"]
          type?: Database["public"]["Enums"]["check_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          date_received?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["check_status"]
          type?: Database["public"]["Enums"]["check_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_checks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          production_item_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          production_item_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          production_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_status_history_production_item_id_fkey"
            columns: ["production_item_id"]
            isOneToOne: false
            referencedRelation: "job_production_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          address: string | null
          commission_rate: number
          created_at: string
          deleted_at: string | null
          email: string
          google_drive_link: string | null
          id: string
          last_login: string | null
          level: Database["public"]["Enums"]["user_level"]
          manager_id: string | null
          must_change_password: boolean
          name: string
          override_rate: number
          phone: string | null
          phone_secondary: string | null
          profile_picture_url: string | null
          signature_text: string | null
          signature_url: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          active?: boolean
          address?: string | null
          commission_rate?: number
          created_at?: string
          deleted_at?: string | null
          email?: string
          google_drive_link?: string | null
          id?: string
          last_login?: string | null
          level?: Database["public"]["Enums"]["user_level"]
          manager_id?: string | null
          must_change_password?: boolean
          name?: string
          override_rate?: number
          phone?: string | null
          phone_secondary?: string | null
          profile_picture_url?: string | null
          signature_text?: string | null
          signature_url?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          active?: boolean
          address?: string | null
          commission_rate?: number
          created_at?: string
          deleted_at?: string | null
          email?: string
          google_drive_link?: string | null
          id?: string
          last_login?: string | null
          level?: Database["public"]["Enums"]["user_level"]
          manager_id?: string | null
          must_change_password?: boolean
          name?: string
          override_rate?: number
          phone?: string | null
          phone_secondary?: string | null
          profile_picture_url?: string | null
          signature_text?: string | null
          signature_url?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      setter_assignments: {
        Row: {
          active: boolean
          assigned_date: string
          created_at: string
          id: string
          segment_id: string | null
          setter_user_id: string
        }
        Insert: {
          active?: boolean
          assigned_date?: string
          created_at?: string
          id?: string
          segment_id?: string | null
          setter_user_id: string
        }
        Update: {
          active?: boolean
          assigned_date?: string
          created_at?: string
          id?: string
          segment_id?: string | null
          setter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setter_assignments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "lead_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      sitecam_media: {
        Row: {
          annotated_path: string | null
          annotations: Json | null
          caption: string | null
          comments: Json | null
          created_at: string
          folder_id: string | null
          id: string
          is_public: boolean | null
          job_id: string
          original_path: string
          tags: string[] | null
          thumbnail_path: string | null
          type: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          annotated_path?: string | null
          annotations?: Json | null
          caption?: string | null
          comments?: Json | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          job_id: string
          original_path: string
          tags?: string[] | null
          thumbnail_path?: string | null
          type?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          annotated_path?: string | null
          annotations?: Json | null
          caption?: string | null
          comments?: Json | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          job_id?: string
          original_path?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          type?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sitecam_media_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "sitecam_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitecam_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sitecam_folders: {
        Row: {
          created_at: string
          id: string
          job_id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sitecam_folders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitecam_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sitecam_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      sitecam_pages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          job_id: string
          layout: Json | null
          media_order: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          job_id: string
          layout?: Json | null
          media_order?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          job_id?: string
          layout?: Json | null
          media_order?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitecam_pages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      status_branches: {
        Row: {
          active: boolean | null
          branch_point_status: string | null
          created_at: string | null
          display_name: string
          id: string
          name: string
          parent_branch_id: string | null
          statuses: string[]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          branch_point_status?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          name: string
          parent_branch_id?: string | null
          statuses?: string[]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          branch_point_status?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          name?: string
          parent_branch_id?: string | null
          statuses?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_branches_parent_branch_id_fkey"
            columns: ["parent_branch_id"]
            isOneToOne: false
            referencedRelation: "status_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subs: {
        Row: {
          active: boolean
          contact_info: Json | null
          created_at: string
          id: string
          name: string
          rate: number
          specialty: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact_info?: Json | null
          created_at?: string
          id?: string
          name: string
          rate?: number
          specialty?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact_info?: Json | null
          created_at?: string
          id?: string
          name?: string
          rate?: number
          specialty?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          overridden_by: string | null
          override_notes: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          overridden_by?: string | null
          override_notes?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          overridden_by?: string | null
          override_notes?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_types: {
        Row: {
          active: boolean
          created_at: string
          default_labor_cost_per_unit: number
          default_material_cost_per_unit: number
          id: string
          name: string
          sort_order: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_labor_cost_per_unit?: number
          default_material_cost_per_unit?: number
          id?: string
          name: string
          sort_order?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_labor_cost_per_unit?: number
          default_material_cost_per_unit?: number
          id?: string
          name?: string
          sort_order?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          location: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["time_off_request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          location?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["time_off_request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["time_off_request_status"]
          user_id?: string
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["user_document_type"]
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: Database["public"]["Enums"]["user_document_type"]
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["user_document_type"]
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
          user_id?: string
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
      vendors: {
        Row: {
          active: boolean
          contact_info: Json | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact_info?: Json | null
          created_at?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact_info?: Json | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      white_label_config: {
        Row: {
          app_name: string | null
          colors: Json
          company_name: string
          created_at: string
          icon_style: string
          id: string
          logo_url: string | null
          tenant_id: string
          theme_pack: string | null
          tooltip_phrases: Json | null
          updated_at: string
        }
        Insert: {
          app_name?: string | null
          colors?: Json
          company_name?: string
          created_at?: string
          icon_style?: string
          id?: string
          logo_url?: string | null
          tenant_id: string
          theme_pack?: string | null
          tooltip_phrases?: Json | null
          updated_at?: string
        }
        Update: {
          app_name?: string | null
          colors?: Json
          company_name?: string
          created_at?: string
          icon_style?: string
          id?: string
          logo_url?: string | null
          tenant_id?: string
          theme_pack?: string | null
          tooltip_phrases?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      expense_type_usage: {
        Row: {
          avg_amount: number | null
          name: string | null
          total_amount: number | null
          type_id: string | null
          usage_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_team_user_ids: {
        Args: { _manager_user_id: string }
        Returns: string[]
      }
      get_user_level: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_level"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_highest: { Args: { _user_id: string }; Returns: boolean }
      is_manager_of: {
        Args: { _manager_user_id: string; _target_user_id: string }
        Returns: boolean
      }
      soft_delete_user: {
        Args: { _reassign_to_user_id?: string; _target_user_id: string }
        Returns: undefined
      }
      search_customers_global: {
        Args: { search_query: string; result_limit?: number }
        Returns: {
          id: string
          name: string
          customer_number: string
          match_hint: string | null
        }[]
      }
    }
    Enums: {
      app_role:
        | "sales_rep"
        | "field_tech"
        | "office_admin"
        | "manager"
        | "owner"
      assignment_role:
        | "primary_rep"
        | "assistant_rep"
        | "manager_override"
        | "field_tech"
      check_status: "Pending" | "Received" | "Deposited" | "Disputed"
      check_type:
        | "ACV"
        | "2nd_ACV"
        | "Depreciation"
        | "Final"
        | "Supplement"
        | "Other"
      commission_status: "earned" | "paid"
      customer_type: "residential" | "commercial"
      doc_type: "contract" | "invoice" | "photo" | "other" | "measurements"
      job_document_folder_scope: "photos" | "documents"
      lead_assignment_status: "assigned" | "converted" | "dead" | "reallocated"
      lead_source:
        | "self_gen"
        | "referral"
        | "marketing"
        | "website"
        | "insurance"
        | "other"
      master_lead_status:
        | "new"
        | "called"
        | "bad"
        | "follow_up"
        | "appointment_set"
        | "converted"
        | "dead"
      subscription_tier: "free" | "pro" | "enterprise"
      time_off_request_status: "pending" | "approved" | "denied"
      user_document_type: "document" | "w2" | "dl" | "misc" | "profile_pic"
      user_level:
        | "highest"
        | "admin"
        | "manager"
        | "lvl5"
        | "lvl4"
        | "lvl3"
        | "lvl2"
        | "lvl1"
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
      app_role: ["sales_rep", "field_tech", "office_admin", "manager", "owner"],
      assignment_role: [
        "primary_rep",
        "assistant_rep",
        "manager_override",
        "field_tech",
      ],
      check_status: ["Pending", "Received", "Deposited", "Disputed"],
      check_type: [
        "ACV",
        "2nd_ACV",
        "Depreciation",
        "Final",
        "Supplement",
        "Other",
      ],
      commission_status: ["earned", "paid"],
      customer_type: ["residential", "commercial"],
      doc_type: ["contract", "invoice", "photo", "other", "measurements"],
      job_document_folder_scope: ["photos", "documents"],
      lead_assignment_status: ["assigned", "converted", "dead", "reallocated"],
      lead_source: [
        "self_gen",
        "referral",
        "marketing",
        "website",
        "insurance",
        "other",
      ],
      master_lead_status: [
        "new",
        "called",
        "bad",
        "follow_up",
        "appointment_set",
        "converted",
        "dead",
      ],
      subscription_tier: ["free", "pro", "enterprise"],
      time_off_request_status: ["pending", "approved", "denied"],
      user_document_type: ["document", "w2", "dl", "misc", "profile_pic"],
      user_level: [
        "highest",
        "admin",
        "manager",
        "lvl5",
        "lvl4",
        "lvl3",
        "lvl2",
        "lvl1",
      ],
    },
  },
} as const
