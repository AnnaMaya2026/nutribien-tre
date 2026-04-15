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
      aliments_ciqual: {
        Row: {
          calcium_100g: number | null
          calories_100g: number | null
          fer_100g: number | null
          fibres_100g: number | null
          glucides_100g: number | null
          groupe: string | null
          id: number
          lipides_100g: number | null
          magnesium_100g: number | null
          nom: string | null
          omega3_total_100g: number | null
          proteines_100g: number | null
          vitamine_b12_100g: number | null
          vitamine_d_100g: number | null
        }
        Insert: {
          calcium_100g?: number | null
          calories_100g?: number | null
          fer_100g?: number | null
          fibres_100g?: number | null
          glucides_100g?: number | null
          groupe?: string | null
          id?: number
          lipides_100g?: number | null
          magnesium_100g?: number | null
          nom?: string | null
          omega3_total_100g?: number | null
          proteines_100g?: number | null
          vitamine_b12_100g?: number | null
          vitamine_d_100g?: number | null
        }
        Update: {
          calcium_100g?: number | null
          calories_100g?: number | null
          fer_100g?: number | null
          fibres_100g?: number | null
          glucides_100g?: number | null
          groupe?: string | null
          id?: number
          lipides_100g?: number | null
          magnesium_100g?: number | null
          nom?: string | null
          omega3_total_100g?: number | null
          proteines_100g?: number | null
          vitamine_b12_100g?: number | null
          vitamine_d_100g?: number | null
        }
        Relationships: []
      }
      favorite_meal_items: {
        Row: {
          calcium: number | null
          calories: number | null
          carbs: number | null
          fats: number | null
          favorite_meal_id: string
          fibres: number | null
          food_name: string
          id: string
          iron: number | null
          magnesium: number | null
          omega3: number | null
          phytoestrogens: number | null
          portion_size: number | null
          proteins: number | null
          vitamin_b12: number | null
          vitamin_d: number | null
        }
        Insert: {
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          fats?: number | null
          favorite_meal_id: string
          fibres?: number | null
          food_name: string
          id?: string
          iron?: number | null
          magnesium?: number | null
          omega3?: number | null
          phytoestrogens?: number | null
          portion_size?: number | null
          proteins?: number | null
          vitamin_b12?: number | null
          vitamin_d?: number | null
        }
        Update: {
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          fats?: number | null
          favorite_meal_id?: string
          fibres?: number | null
          food_name?: string
          id?: string
          iron?: number | null
          magnesium?: number | null
          omega3?: number | null
          phytoestrogens?: number | null
          portion_size?: number | null
          proteins?: number | null
          vitamin_b12?: number | null
          vitamin_d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_meal_items_favorite_meal_id_fkey"
            columns: ["favorite_meal_id"]
            isOneToOne: false
            referencedRelation: "favorite_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_meals: {
        Row: {
          created_at: string
          id: string
          meal_type: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_type: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_type?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          calcium: number | null
          calories: number | null
          carbs: number | null
          created_at: string
          fats: number | null
          fibres: number | null
          food_name: string
          id: string
          iron: number | null
          logged_at: string
          magnesium: number | null
          meal_type: string | null
          omega3: number | null
          phytoestrogens: number | null
          portion_size: number | null
          proteins: number | null
          user_id: string
          vitamin_b12: number | null
          vitamin_d: number | null
        }
        Insert: {
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fats?: number | null
          fibres?: number | null
          food_name: string
          id?: string
          iron?: number | null
          logged_at?: string
          magnesium?: number | null
          meal_type?: string | null
          omega3?: number | null
          phytoestrogens?: number | null
          portion_size?: number | null
          proteins?: number | null
          user_id: string
          vitamin_b12?: number | null
          vitamin_d?: number | null
        }
        Update: {
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fats?: number | null
          fibres?: number | null
          food_name?: string
          id?: string
          iron?: number | null
          logged_at?: string
          magnesium?: number | null
          meal_type?: string | null
          omega3?: number | null
          phytoestrogens?: number | null
          portion_size?: number | null
          proteins?: number | null
          user_id?: string
          vitamin_b12?: number | null
          vitamin_d?: number | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          category: string
          content: string
          created_at: string
          entry_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          entry_date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          daily_calorie_goal: number | null
          dietary_preferences: string[] | null
          height: number | null
          id: string
          menopause_stage: string | null
          profile_completed: boolean | null
          symptoms: string[] | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          daily_calorie_goal?: number | null
          dietary_preferences?: string[] | null
          height?: number | null
          id?: string
          menopause_stage?: string | null
          profile_completed?: boolean | null
          symptoms?: string[] | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          daily_calorie_goal?: number | null
          dietary_preferences?: string[] | null
          height?: number | null
          id?: string
          menopause_stage?: string | null
          profile_completed?: boolean | null
          symptoms?: string[] | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      symptom_logs: {
        Row: {
          bouffees_chaleur: number | null
          created_at: string
          fatigue: number | null
          id: string
          insomnie: number | null
          logged_at: string
          notes: string | null
          sautes_humeur: number | null
          selected_symptoms: string[] | null
          symptom_scores: Json | null
          user_id: string
        }
        Insert: {
          bouffees_chaleur?: number | null
          created_at?: string
          fatigue?: number | null
          id?: string
          insomnie?: number | null
          logged_at?: string
          notes?: string | null
          sautes_humeur?: number | null
          selected_symptoms?: string[] | null
          symptom_scores?: Json | null
          user_id: string
        }
        Update: {
          bouffees_chaleur?: number | null
          created_at?: string
          fatigue?: number | null
          id?: string
          insomnie?: number | null
          logged_at?: string
          notes?: string | null
          sautes_humeur?: number | null
          selected_symptoms?: string[] | null
          symptom_scores?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
