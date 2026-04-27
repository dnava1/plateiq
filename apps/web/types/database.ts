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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cycles: {
        Row: {
          auto_progression_applied: boolean
          completed_at: string | null
          config: Json | null
          created_at: string | null
          cycle_number: number
          id: number
          program_id: number
          start_date: string
          template_key: string
          user_id: string
        }
        Insert: {
          auto_progression_applied?: boolean
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          cycle_number?: number
          id?: never
          program_id: number
          start_date?: string
          template_key: string
          user_id: string
        }
        Update: {
          auto_progression_applied?: boolean
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          cycle_number?: number
          id?: never
          program_id?: number
          start_date?: string
          template_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          analytics_track: string
          category: string
          created_at: string | null
          created_by_user_id: string | null
          id: number
          is_main_lift: boolean
          movement_pattern: string
          name: string
          progression_increment_lbs: number | null
          strength_lift_slug: string | null
        }
        Insert: {
          analytics_track?: string
          category: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: never
          is_main_lift?: boolean
          movement_pattern: string
          name: string
          progression_increment_lbs?: number | null
          strength_lift_slug?: string | null
        }
        Update: {
          analytics_track?: string
          category?: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: never
          is_main_lift?: boolean
          movement_pattern?: string
          name?: string
          progression_increment_lbs?: number | null
          strength_lift_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          category: string
          created_at: string
          id: number
          message: string
          source_path: string
          status: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: never
          message: string
          source_path?: string
          status?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: never
          message?: string
          source_path?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          id: string
          preferred_unit: string
          weight_rounding_lbs: number
          strength_profile_age_years: number | null
          strength_profile_bodyweight_lbs: number | null
          strength_profile_sex: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          id: string
          preferred_unit?: string
          weight_rounding_lbs?: number
          strength_profile_age_years?: number | null
          strength_profile_bodyweight_lbs?: number | null
          strength_profile_sex?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          preferred_unit?: string
          weight_rounding_lbs?: number
          strength_profile_age_years?: number | null
          strength_profile_bodyweight_lbs?: number | null
          strength_profile_sex?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_maxes: {
        Row: {
          created_at: string | null
          effective_date: string
          exercise_id: number
          id: number
          tm_percentage: number
          user_id: string
          weight_lbs: number
        }
        Insert: {
          created_at?: string | null
          effective_date?: string
          exercise_id: number
          id?: never
          tm_percentage?: number
          user_id: string
          weight_lbs: number
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          exercise_id?: number
          id?: never
          tm_percentage?: number
          user_id?: string
          weight_lbs?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_maxes_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_maxes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          config: Json | null
          created_at: string | null
          id: number
          is_active: boolean
          name: string
          start_date: string
          template_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: never
          is_active?: boolean
          name: string
          start_date?: string
          template_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: never
          is_active?: boolean
          name?: string
          start_date?: string
          template_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          exercise_id: number
          id: number
          intensity_type: string
          is_amrap: boolean
          logged_at: string | null
          prescribed_intensity: number | null
          prescribed_weight_lbs: number | null
          prescription_base_weight_lbs: number | null
          reps_actual: number | null
          reps_prescribed: number
          reps_prescribed_max: number | null
          rpe: number | null
          set_order: number
          set_type: string
          updated_at: string | null
          user_id: string
          weight_lbs: number
          workout_id: number
        }
        Insert: {
          exercise_id: number
          id?: never
          intensity_type: string
          is_amrap?: boolean
          logged_at?: string | null
          prescribed_intensity?: number | null
          prescribed_weight_lbs?: number | null
          prescription_base_weight_lbs?: number | null
          reps_actual?: number | null
          reps_prescribed: number
          reps_prescribed_max?: number | null
          rpe?: number | null
          set_order: number
          set_type: string
          updated_at?: string | null
          user_id: string
          weight_lbs: number
          workout_id: number
        }
        Update: {
          exercise_id?: number
          id?: never
          intensity_type?: string
          is_amrap?: boolean
          logged_at?: string | null
          prescribed_intensity?: number | null
          prescribed_weight_lbs?: number | null
          prescription_base_weight_lbs?: number | null
          reps_actual?: number | null
          reps_prescribed?: number
          reps_prescribed_max?: number | null
          rpe?: number | null
          set_order?: number
          set_type?: string
          updated_at?: string | null
          user_id?: string
          weight_lbs?: number
          workout_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          cycle_id: number
          day_label: string | null
          id: number
          notes: string | null
          primary_exercise_id: number
          scheduled_date: string
          started_at: string | null
          user_id: string
          week_number: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          cycle_id: number
          day_label?: string | null
          id?: never
          notes?: string | null
          primary_exercise_id: number
          scheduled_date?: string
          started_at?: string | null
          user_id: string
          week_number: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          cycle_id?: number
          day_label?: string | null
          id?: never
          notes?: string | null
          primary_exercise_id?: number
          scheduled_date?: string
          started_at?: string | null
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workouts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_primary_exercise_id_fkey"
            columns: ["primary_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_cycle: {
        Args: { p_cycle_id: number; p_progression?: Json }
        Returns: Json
      }
      consume_ai_insight_daily_quota: {
        Args: { p_daily_limit?: number }
        Returns: Json
      }
      create_program_with_cycle: {
        Args: {
          p_activate_on_save?: boolean
          p_config?: Json
          p_name: string
          p_template_key: string
        }
        Returns: Json
      }
      delete_inactive_program: {
        Args: {
          p_program_id: number
        }
        Returns: number
      }
      estimate_one_rep_max: {
        Args: { p_reps: number; p_weight_lbs: number }
        Returns: number
      }
      get_analytics_data: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_exercise_id?: number
        }
        Returns: Json
      }
      get_dashboard: { Args: never; Returns: Json }
      set_active_program: {
        Args: {
          p_program_id: number
        }
        Returns: Json
      }
      update_program_definition: {
        Args: {
          p_config?: Json
          p_name: string
          p_program_id: number
          p_template_key: string
        }
        Returns: Json
      }
      update_strength_profile: {
        Args: {
          p_age_years?: number | null
          p_bodyweight_lbs?: number | null
          p_sex?: string | null
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
    Enums: {},
  },
} as const
