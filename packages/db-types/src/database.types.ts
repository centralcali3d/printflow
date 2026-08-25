export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor: string | null
          after: Json | null
          before: Json | null
          id: number
          occurred_at: string
          row_id: string | null
          table_name: string
          workspace_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor?: string | null
          after?: Json | null
          before?: Json | null
          id?: number
          occurred_at?: string
          row_id?: string | null
          table_name: string
          workspace_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor?: string | null
          after?: Json | null
          before?: Json | null
          id?: number
          occurred_at?: string
          row_id?: string | null
          table_name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_model_versions: {
        Row: {
          created_at: string
          default_waste_pct: number
          effective_from: string
          electricity_mode: Database["public"]["Enums"]["electricity_mode"]
          electricity_rate_per_hr: number
          id: string
          kwh_rate: number
          labor_rate_per_hr: number
          machine_rate_per_hr: number
          mileage_rate: number
          notes: string | null
          overhead_per_unit: number
          post_office_miles: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_waste_pct?: number
          effective_from: string
          electricity_mode?: Database["public"]["Enums"]["electricity_mode"]
          electricity_rate_per_hr?: number
          id?: string
          kwh_rate?: number
          labor_rate_per_hr?: number
          machine_rate_per_hr?: number
          mileage_rate?: number
          notes?: string | null
          overhead_per_unit?: number
          post_office_miles?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_waste_pct?: number
          effective_from?: string
          electricity_mode?: Database["public"]["Enums"]["electricity_mode"]
          electricity_rate_per_hr?: number
          id?: string
          kwh_rate?: number
          labor_rate_per_hr?: number
          machine_rate_per_hr?: number
          mileage_rate?: number
          notes?: string | null
          overhead_per_unit?: number
          post_office_miles?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_model_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_mileage: boolean
          name: string
          schedule_c_line: string | null
          sort: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_mileage?: boolean
          name: string
          schedule_c_line?: string | null
          sort?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_mileage?: boolean
          name?: string
          schedule_c_line?: string | null
          sort?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          incurred_at: string
          legacy_id: string | null
          miles: number | null
          notes: string | null
          printer_id: string | null
          receipt_path: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          incurred_at: string
          legacy_id?: string | null
          miles?: number | null
          notes?: string | null
          printer_id?: string | null
          receipt_path?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          incurred_at?: string
          legacy_id?: string | null
          miles?: number | null
          notes?: string | null
          printer_id?: string | null
          receipt_path?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      filament_lots: {
        Row: {
          build_to_spools: number
          color: string
          cost_per_g: number | null
          cost_per_spool: number
          created_at: string
          deleted_at: string | null
          filament_type_id: string
          id: string
          legacy_id: string | null
          notes: string | null
          on_hand_g: number
          purchased_at: string | null
          spool_weight_g: number
          status: string
          swatch_hex: string | null
          updated_at: string
          vendor: string | null
          workspace_id: string
        }
        Insert: {
          build_to_spools?: number
          color: string
          cost_per_g?: number | null
          cost_per_spool?: number
          created_at?: string
          deleted_at?: string | null
          filament_type_id: string
          id?: string
          legacy_id?: string | null
          notes?: string | null
          on_hand_g?: number
          purchased_at?: string | null
          spool_weight_g?: number
          status?: string
          swatch_hex?: string | null
          updated_at?: string
          vendor?: string | null
          workspace_id: string
        }
        Update: {
          build_to_spools?: number
          color?: string
          cost_per_g?: number | null
          cost_per_spool?: number
          created_at?: string
          deleted_at?: string | null
          filament_type_id?: string
          id?: string
          legacy_id?: string | null
          notes?: string | null
          on_hand_g?: number
          purchased_at?: string | null
          spool_weight_g?: number
          status?: string
          swatch_hex?: string | null
          updated_at?: string
          vendor?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filament_lots_filament_type_id_fkey"
            columns: ["filament_type_id"]
            isOneToOne: false
            referencedRelation: "filament_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filament_lots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      filament_types: {
        Row: {
          active: boolean
          created_at: string
          default_cost_per_kg: number
          density_g_cm3: number | null
          id: string
          name: string
          sort: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_cost_per_kg?: number
          density_g_cm3?: number | null
          id?: string
          name: string
          sort?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_cost_per_kg?: number
          density_g_cm3?: number | null
          id?: string
          name?: string
          sort?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filament_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          build_to: number
          created_at: string
          deleted_at: string | null
          filament_lot_id: string | null
          id: string
          legacy_id: string | null
          on_loan: number
          product_id: string
          qty_available: number
          qty_sold: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          build_to?: number
          created_at?: string
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string
          legacy_id?: string | null
          on_loan?: number
          product_id: string
          qty_available?: number
          qty_sold?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          build_to?: number
          created_at?: string
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string
          legacy_id?: string | null
          on_loan?: number
          product_id?: string
          qty_available?: number
          qty_sold?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "v_filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_moves: {
        Row: {
          created_by: string | null
          delta: number
          filament_g_delta: number
          id: string
          inventory_item_id: string
          note: string | null
          occurred_at: string
          reason: Database["public"]["Enums"]["move_reason"]
          ref_id: string | null
          ref_type: string | null
          workspace_id: string
        }
        Insert: {
          created_by?: string | null
          delta: number
          filament_g_delta?: number
          id?: string
          inventory_item_id: string
          note?: string | null
          occurred_at?: string
          reason: Database["public"]["Enums"]["move_reason"]
          ref_id?: string | null
          ref_type?: string | null
          workspace_id: string
        }
        Update: {
          created_by?: string | null
          delta?: number
          filament_g_delta?: number
          id?: string
          inventory_item_id?: string
          note?: string | null
          occurred_at?: string
          reason?: Database["public"]["Enums"]["move_reason"]
          ref_id?: string | null
          ref_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_moves_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_moves_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_moves_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_options: {
        Row: {
          active: boolean
          cost: number
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          cost?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          cost?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_options_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          actual_print_time_hr: number | null
          auto_generated: boolean
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          est_print_time_hr: number | null
          failed_qty: number
          filament_lot_id: string | null
          good_qty: number | null
          id: string
          legacy_id: string | null
          notes: string | null
          printer_id: string | null
          priority: Database["public"]["Enums"]["job_priority"]
          product_id: string
          qty: number
          source_inventory_item_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actual_print_time_hr?: number | null
          auto_generated?: boolean
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          est_print_time_hr?: number | null
          failed_qty?: number
          filament_lot_id?: string | null
          good_qty?: number | null
          id?: string
          legacy_id?: string | null
          notes?: string | null
          printer_id?: string | null
          priority?: Database["public"]["Enums"]["job_priority"]
          product_id: string
          qty: number
          source_inventory_item_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actual_print_time_hr?: number | null
          auto_generated?: boolean
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          est_print_time_hr?: number | null
          failed_qty?: number
          filament_lot_id?: string | null
          good_qty?: number | null
          id?: string
          legacy_id?: string | null
          notes?: string | null
          printer_id?: string | null
          priority?: Database["public"]["Enums"]["job_priority"]
          product_id?: string
          qty?: number
          source_inventory_item_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "v_filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_source_inventory_item_id_fkey"
            columns: ["source_inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_source_inventory_item_id_fkey"
            columns: ["source_inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          active: boolean
          created_at: string
          deleted_at: string | null
          id: string
          legacy_id: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          sort: number
          status: string
          updated_at: string
          watts: number | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          legacy_id?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          sort?: number
          status?: string
          updated_at?: string
          watts?: number | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          legacy_id?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          sort?: number
          status?: string
          updated_at?: string
          watts?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "printers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          batch_size: number
          created_at: string
          default_channel_fee_pct: number
          deleted_at: string | null
          depth_in: number | null
          filament_g: number
          filament_type_id: string | null
          height_in: number | null
          id: string
          legacy_id: string | null
          name: string
          notes: string | null
          packaging_option_id: string | null
          prep_time_hr: number
          print_time_hr: number
          sale_price: number
          sku: string | null
          updated_at: string
          waste_pct: number
          weight_lb: number | null
          width_in: number | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          batch_size?: number
          created_at?: string
          default_channel_fee_pct?: number
          deleted_at?: string | null
          depth_in?: number | null
          filament_g?: number
          filament_type_id?: string | null
          height_in?: number | null
          id?: string
          legacy_id?: string | null
          name: string
          notes?: string | null
          packaging_option_id?: string | null
          prep_time_hr?: number
          print_time_hr?: number
          sale_price?: number
          sku?: string | null
          updated_at?: string
          waste_pct?: number
          weight_lb?: number | null
          width_in?: number | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          batch_size?: number
          created_at?: string
          default_channel_fee_pct?: number
          deleted_at?: string | null
          depth_in?: number | null
          filament_g?: number
          filament_type_id?: string | null
          height_in?: number | null
          id?: string
          legacy_id?: string | null
          name?: string
          notes?: string | null
          packaging_option_id?: string | null
          prep_time_hr?: number
          print_time_hr?: number
          sale_price?: number
          sku?: string | null
          updated_at?: string
          waste_pct?: number
          weight_lb?: number | null
          width_in?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_filament_type_id_fkey"
            columns: ["filament_type_id"]
            isOneToOne: false
            referencedRelation: "filament_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_packaging_option_id_fkey"
            columns: ["packaging_option_id"]
            isOneToOne: false
            referencedRelation: "packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_applications: {
        Row: {
          absorbed_by: Database["public"]["Enums"]["promo_absorber"]
          applied_at: string
          discount_amount: number
          id: string
          promotion_id: string
          sale_id: string
          workspace_id: string
        }
        Insert: {
          absorbed_by: Database["public"]["Enums"]["promo_absorber"]
          applied_at?: string
          discount_amount?: number
          id?: string
          promotion_id: string
          sale_id: string
          workspace_id: string
        }
        Update: {
          absorbed_by?: Database["public"]["Enums"]["promo_absorber"]
          applied_at?: string
          discount_amount?: number
          id?: string
          promotion_id?: string
          sale_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_applications_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_applications_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_applications_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_applications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_products: {
        Row: {
          product_id: string
          promotion_id: string
        }
        Insert: {
          product_id: string
          promotion_id: string
        }
        Update: {
          product_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          absorbed_by: Database["public"]["Enums"]["promo_absorber"]
          active: boolean
          channel_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          name: string
          notes: string | null
          promo_type: Database["public"]["Enums"]["promo_type"]
          scope: Database["public"]["Enums"]["promo_scope"]
          starts_at: string | null
          updated_at: string
          value: number
          workspace_id: string
        }
        Insert: {
          absorbed_by?: Database["public"]["Enums"]["promo_absorber"]
          active?: boolean
          channel_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name: string
          notes?: string | null
          promo_type: Database["public"]["Enums"]["promo_type"]
          scope?: Database["public"]["Enums"]["promo_scope"]
          starts_at?: string | null
          updated_at?: string
          value?: number
          workspace_id: string
        }
        Update: {
          absorbed_by?: Database["public"]["Enums"]["promo_absorber"]
          active?: boolean
          channel_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          promo_type?: Database["public"]["Enums"]["promo_type"]
          scope?: Database["public"]["Enums"]["promo_scope"]
          starts_at?: string | null
          updated_at?: string
          value?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          affiliate_fee_amt: number
          affiliate_fee_pct: number
          channel_id: string
          cost_model_version_id: string | null
          created_at: string
          deleted_at: string | null
          filament_lot_id: string | null
          id: string
          legacy_id: string | null
          margin_pct: number | null
          notes: string | null
          order_ref: string | null
          packaging_cost: number
          packaging_option_id: string | null
          payout: number
          product_id: string
          profit: number | null
          qty: number
          sale_price: number
          shipping_cost_paid: number
          shipping_trip_id: string | null
          sold_at: string
          status: string | null
          subtotal: number
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          affiliate_fee_amt?: number
          affiliate_fee_pct?: number
          channel_id: string
          cost_model_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string
          legacy_id?: string | null
          margin_pct?: number | null
          notes?: string | null
          order_ref?: string | null
          packaging_cost?: number
          packaging_option_id?: string | null
          payout?: number
          product_id: string
          profit?: number | null
          qty: number
          sale_price?: number
          shipping_cost_paid?: number
          shipping_trip_id?: string | null
          sold_at: string
          status?: string | null
          subtotal?: number
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          affiliate_fee_amt?: number
          affiliate_fee_pct?: number
          channel_id?: string
          cost_model_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string
          legacy_id?: string | null
          margin_pct?: number | null
          notes?: string | null
          order_ref?: string | null
          packaging_cost?: number
          packaging_option_id?: string | null
          payout?: number
          product_id?: string
          profit?: number | null
          qty?: number
          sale_price?: number
          shipping_cost_paid?: number
          shipping_trip_id?: string | null
          sold_at?: string
          status?: string | null
          subtotal?: number
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cost_model_version_id_fkey"
            columns: ["cost_model_version_id"]
            isOneToOne: false
            referencedRelation: "cost_model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "v_filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_packaging_option_id_fkey"
            columns: ["packaging_option_id"]
            isOneToOne: false
            referencedRelation: "packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shipping_trip_id_fkey"
            columns: ["shipping_trip_id"]
            isOneToOne: false
            referencedRelation: "shipping_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channels: {
        Row: {
          active: boolean
          allows_affiliate: boolean
          counts_as_revenue: boolean
          created_at: string
          default_status: string | null
          fee_flat: number
          fee_model: Database["public"]["Enums"]["fee_model"]
          fee_pct: number
          id: string
          name: string
          sort: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          allows_affiliate?: boolean
          counts_as_revenue?: boolean
          created_at?: string
          default_status?: string | null
          fee_flat?: number
          fee_model?: Database["public"]["Enums"]["fee_model"]
          fee_pct?: number
          id?: string
          name: string
          sort?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          allows_affiliate?: boolean
          counts_as_revenue?: boolean
          created_at?: string
          default_status?: string | null
          fee_flat?: number
          fee_model?: Database["public"]["Enums"]["fee_model"]
          fee_pct?: number
          id?: string
          name?: string
          sort?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          group_name: string
          key: string
          label: string
          max_value: number | null
          min_value: number | null
          options: string[] | null
          scope: Database["public"]["Enums"]["setting_scope"]
          sort: number
          unit: string | null
          updated_at: string
          value: string | null
          value_type: Database["public"]["Enums"]["setting_type"]
          workspace_id: string
        }
        Insert: {
          description?: string | null
          group_name?: string
          key: string
          label: string
          max_value?: number | null
          min_value?: number | null
          options?: string[] | null
          scope?: Database["public"]["Enums"]["setting_scope"]
          sort?: number
          unit?: string | null
          updated_at?: string
          value?: string | null
          value_type?: Database["public"]["Enums"]["setting_type"]
          workspace_id: string
        }
        Update: {
          description?: string | null
          group_name?: string
          key?: string
          label?: string
          max_value?: number | null
          min_value?: number | null
          options?: string[] | null
          scope?: Database["public"]["Enums"]["setting_scope"]
          sort?: number
          unit?: string | null
          updated_at?: string
          value?: string | null
          value_type?: Database["public"]["Enums"]["setting_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_trips: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          destination: string
          expense_id: string | null
          id: string
          legacy_id: string | null
          miles: number
          notes: string | null
          occurred_at: string
          order_refs: string[] | null
          purpose: string
          rate_used: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          destination?: string
          expense_id?: string | null
          id?: string
          legacy_id?: string | null
          miles: number
          notes?: string | null
          occurred_at: string
          order_refs?: string[] | null
          purpose?: string
          rate_used: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          destination?: string
          expense_id?: string | null
          id?: string
          legacy_id?: string | null
          miles?: number
          notes?: string | null
          occurred_at?: string
          order_refs?: string[] | null
          purpose?: string
          rate_used?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_trips_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_trips_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "v_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_trips_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_expenses: {
        Row: {
          amount: number | null
          category_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string | null
          incurred_at: string | null
          legacy_id: string | null
          miles: number | null
          notes: string | null
          printer_id: string | null
          receipt_path: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          incurred_at?: string | null
          legacy_id?: string | null
          miles?: number | null
          notes?: string | null
          printer_id?: string | null
          receipt_path?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          incurred_at?: string | null
          legacy_id?: string | null
          miles?: number | null
          notes?: string | null
          printer_id?: string | null
          receipt_path?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_filament_lots: {
        Row: {
          build_to_spools: number | null
          color: string | null
          cost_per_g: number | null
          cost_per_spool: number | null
          created_at: string | null
          deleted_at: string | null
          filament_type_id: string | null
          id: string | null
          legacy_id: string | null
          notes: string | null
          on_hand_g: number | null
          purchased_at: string | null
          spool_weight_g: number | null
          status: string | null
          swatch_hex: string | null
          updated_at: string | null
          vendor: string | null
          workspace_id: string | null
        }
        Insert: {
          build_to_spools?: number | null
          color?: string | null
          cost_per_g?: number | null
          cost_per_spool?: number | null
          created_at?: string | null
          deleted_at?: string | null
          filament_type_id?: string | null
          id?: string | null
          legacy_id?: string | null
          notes?: string | null
          on_hand_g?: number | null
          purchased_at?: string | null
          spool_weight_g?: number | null
          status?: string | null
          swatch_hex?: string | null
          updated_at?: string | null
          vendor?: string | null
          workspace_id?: string | null
        }
        Update: {
          build_to_spools?: number | null
          color?: string | null
          cost_per_g?: number | null
          cost_per_spool?: number | null
          created_at?: string | null
          deleted_at?: string | null
          filament_type_id?: string | null
          id?: string | null
          legacy_id?: string | null
          notes?: string | null
          on_hand_g?: number | null
          purchased_at?: string | null
          spool_weight_g?: number | null
          status?: string | null
          swatch_hex?: string | null
          updated_at?: string | null
          vendor?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filament_lots_filament_type_id_fkey"
            columns: ["filament_type_id"]
            isOneToOne: false
            referencedRelation: "filament_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filament_lots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_items: {
        Row: {
          build_to: number | null
          created_at: string | null
          deleted_at: string | null
          filament_lot_id: string | null
          id: string | null
          legacy_id: string | null
          on_loan: number | null
          product_id: string | null
          qty_available: number | null
          qty_sold: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          build_to?: number | null
          created_at?: string | null
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string | null
          legacy_id?: string | null
          on_loan?: number | null
          product_id?: string | null
          qty_available?: number | null
          qty_sold?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          build_to?: number | null
          created_at?: string | null
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string | null
          legacy_id?: string | null
          on_loan?: number | null
          product_id?: string | null
          qty_available?: number | null
          qty_sold?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "v_filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_products: {
        Row: {
          active: boolean | null
          batch_size: number | null
          created_at: string | null
          default_channel_fee_pct: number | null
          deleted_at: string | null
          depth_in: number | null
          filament_g: number | null
          filament_type_id: string | null
          height_in: number | null
          id: string | null
          legacy_id: string | null
          name: string | null
          notes: string | null
          packaging_option_id: string | null
          prep_time_hr: number | null
          print_time_hr: number | null
          sale_price: number | null
          sku: string | null
          updated_at: string | null
          waste_pct: number | null
          weight_lb: number | null
          width_in: number | null
          workspace_id: string | null
        }
        Insert: {
          active?: boolean | null
          batch_size?: number | null
          created_at?: string | null
          default_channel_fee_pct?: number | null
          deleted_at?: string | null
          depth_in?: number | null
          filament_g?: number | null
          filament_type_id?: string | null
          height_in?: number | null
          id?: string | null
          legacy_id?: string | null
          name?: string | null
          notes?: string | null
          packaging_option_id?: string | null
          prep_time_hr?: number | null
          print_time_hr?: number | null
          sale_price?: number | null
          sku?: string | null
          updated_at?: string | null
          waste_pct?: number | null
          weight_lb?: number | null
          width_in?: number | null
          workspace_id?: string | null
        }
        Update: {
          active?: boolean | null
          batch_size?: number | null
          created_at?: string | null
          default_channel_fee_pct?: number | null
          deleted_at?: string | null
          depth_in?: number | null
          filament_g?: number | null
          filament_type_id?: string | null
          height_in?: number | null
          id?: string | null
          legacy_id?: string | null
          name?: string | null
          notes?: string | null
          packaging_option_id?: string | null
          prep_time_hr?: number | null
          print_time_hr?: number | null
          sale_price?: number | null
          sku?: string | null
          updated_at?: string | null
          waste_pct?: number | null
          weight_lb?: number | null
          width_in?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_filament_type_id_fkey"
            columns: ["filament_type_id"]
            isOneToOne: false
            referencedRelation: "filament_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_packaging_option_id_fkey"
            columns: ["packaging_option_id"]
            isOneToOne: false
            referencedRelation: "packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sales: {
        Row: {
          affiliate_fee_amt: number | null
          affiliate_fee_pct: number | null
          channel_id: string | null
          cost_model_version_id: string | null
          created_at: string | null
          deleted_at: string | null
          filament_lot_id: string | null
          id: string | null
          legacy_id: string | null
          margin_pct: number | null
          notes: string | null
          order_ref: string | null
          packaging_cost: number | null
          packaging_option_id: string | null
          payout: number | null
          product_id: string | null
          profit: number | null
          qty: number | null
          sale_price: number | null
          shipping_cost_paid: number | null
          shipping_trip_id: string | null
          sold_at: string | null
          status: string | null
          subtotal: number | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          affiliate_fee_amt?: number | null
          affiliate_fee_pct?: number | null
          channel_id?: string | null
          cost_model_version_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string | null
          legacy_id?: string | null
          margin_pct?: number | null
          notes?: string | null
          order_ref?: string | null
          packaging_cost?: number | null
          packaging_option_id?: string | null
          payout?: number | null
          product_id?: string | null
          profit?: number | null
          qty?: number | null
          sale_price?: number | null
          shipping_cost_paid?: number | null
          shipping_trip_id?: string | null
          sold_at?: string | null
          status?: string | null
          subtotal?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          affiliate_fee_amt?: number | null
          affiliate_fee_pct?: number | null
          channel_id?: string | null
          cost_model_version_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          filament_lot_id?: string | null
          id?: string | null
          legacy_id?: string | null
          margin_pct?: number | null
          notes?: string | null
          order_ref?: string | null
          packaging_cost?: number | null
          packaging_option_id?: string | null
          payout?: number | null
          product_id?: string | null
          profit?: number | null
          qty?: number | null
          sale_price?: number | null
          shipping_cost_paid?: number | null
          shipping_trip_id?: string | null
          sold_at?: string | null
          status?: string | null
          subtotal?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cost_model_version_id_fkey"
            columns: ["cost_model_version_id"]
            isOneToOne: false
            referencedRelation: "cost_model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_filament_lot_id_fkey"
            columns: ["filament_lot_id"]
            isOneToOne: false
            referencedRelation: "v_filament_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_packaging_option_id_fkey"
            columns: ["packaging_option_id"]
            isOneToOne: false
            referencedRelation: "packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shipping_trip_id_fkey"
            columns: ["shipping_trip_id"]
            isOneToOne: false
            referencedRelation: "shipping_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      report_expenses_detail: {
        Args: { p_end: string; p_start: string }
        Returns: {
          amount: number
          category: string
          description: string
          expense_id: string
          has_receipt: boolean
          incurred_at: string
          miles: number
          notes: string
          printer: string
          schedule_c_line: string
        }[]
      }
      report_filament_consumption: {
        Args: { p_end: string; p_start: string }
        Returns: {
          color: string
          cost_per_g: number
          cost_used: number
          filament_type: string
          grams_used: number
          kg_used: number
        }[]
      }
      report_inventory_snapshot: {
        Args: { p_as_of?: string }
        Returns: {
          color: string
          filament_type: string
          inventory_value: number
          product: string
          qty_available: number
          retail_unit: number
          retail_value: number
          unit_cost: number
        }[]
      }
      report_mileage_log: {
        Args: { p_end: string; p_start: string }
        Returns: {
          amount: number
          destination: string
          miles: number
          occurred_at: string
          order_refs: string
          purpose: string
          rate_used: number
        }[]
      }
      report_pnl: {
        Args: { p_end: string; p_start: string }
        Returns: {
          affiliate_fees: number
          cogs: number
          expense_total: number
          gross_profit: number
          mileage_amount: number
          mileage_miles: number
          net_profit: number
          packaging_costs: number
          payout: number
          revenue: number
          sale_count: number
          shipping_costs: number
          units_sold: number
        }[]
      }
      report_promo_performance: {
        Args: { p_end: string; p_start: string }
        Returns: {
          absorbed_by: Database["public"]["Enums"]["promo_absorber"]
          cost_to_you: number
          discount_given: number
          profit: number
          promo_type: Database["public"]["Enums"]["promo_type"]
          promotion: string
          revenue: number
          sales_count: number
          units: number
        }[]
      }
      report_sales_by_channel: {
        Args: { p_end: string; p_start: string }
        Returns: {
          channel: string
          cogs: number
          margin_pct: number
          payout: number
          profit: number
          revenue: number
          sale_count: number
          units: number
        }[]
      }
      report_sales_by_product: {
        Args: { p_end: string; p_start: string }
        Returns: {
          cogs: number
          margin_pct: number
          payout: number
          product: string
          profit: number
          revenue: number
          sale_count: number
          units: number
        }[]
      }
      report_sales_detail: {
        Args: { p_end: string; p_start: string }
        Returns: {
          affiliate_fee: number
          channel: string
          color: string
          filament_type: string
          margin_pct: number
          notes: string
          order_ref: string
          packaging_cost: number
          payout: number
          product: string
          profit: number
          qty: number
          sale_id: string
          sale_price: number
          shipping_cost: number
          sold_at: string
          status: string
          subtotal: number
          total_cost: number
          unit_cost: number
        }[]
      }
      report_tax_summary: {
        Args: { p_end: string; p_start: string }
        Returns: {
          cogs: number
          expense_total: number
          gross_profit: number
          inventory_value: number
          mileage_amount: number
          mileage_miles: number
          net_profit: number
          payout: number
          period_end: string
          period_start: string
          revenue: number
        }[]
      }
    }
    Enums: {
      audit_action: "insert" | "update" | "delete"
      electricity_mode: "flat" | "metered"
      fee_model: "percent" | "flat" | "none"
      job_priority: "high" | "medium" | "low"
      job_status:
        | "pending"
        | "printing"
        | "blocked"
        | "done"
        | "failed"
        | "cancelled"
      move_reason:
        | "stock_add"
        | "sale"
        | "sale_void"
        | "print_complete"
        | "print_failed"
        | "adjustment"
        | "loan"
        | "loan_return"
        | "import"
      promo_absorber: "seller" | "platform"
      promo_scope: "all" | "products" | "channel"
      promo_type:
        | "percent_off"
        | "fixed_off"
        | "free_shipping"
        | "bogo"
        | "giveaway"
      setting_scope: "workspace" | "device"
      setting_type:
        | "number"
        | "currency"
        | "percent"
        | "text"
        | "bool"
        | "select"
        | "date"
      workspace_role: "owner" | "admin" | "member" | "viewer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_action: ["insert", "update", "delete"],
      electricity_mode: ["flat", "metered"],
      fee_model: ["percent", "flat", "none"],
      job_priority: ["high", "medium", "low"],
      job_status: [
        "pending",
        "printing",
        "blocked",
        "done",
        "failed",
        "cancelled",
      ],
      move_reason: [
        "stock_add",
        "sale",
        "sale_void",
        "print_complete",
        "print_failed",
        "adjustment",
        "loan",
        "loan_return",
        "import",
      ],
      promo_absorber: ["seller", "platform"],
      promo_scope: ["all", "products", "channel"],
      promo_type: [
        "percent_off",
        "fixed_off",
        "free_shipping",
        "bogo",
        "giveaway",
      ],
      setting_scope: ["workspace", "device"],
      setting_type: [
        "number",
        "currency",
        "percent",
        "text",
        "bool",
        "select",
        "date",
      ],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const

