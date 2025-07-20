export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      community_rewards: {
        Row: {
          created_at: string
          distributed_amount: number
          id: string
          remaining_pool: number
          token_id: string
          total_pool: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          distributed_amount?: number
          id?: string
          remaining_pool?: number
          token_id: string
          total_pool?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          distributed_amount?: number
          id?: string
          remaining_pool?: number
          token_id?: string
          total_pool?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rewards_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          claimable_amount: number
          created_at: string
          creator_wallet: string
          id: string
          last_claim_at: string | null
          token_id: string
          total_claimed: number
          total_earned: number
          updated_at: string
        }
        Insert: {
          claimable_amount?: number
          created_at?: string
          creator_wallet: string
          id?: string
          last_claim_at?: string | null
          token_id: string
          total_claimed?: number
          total_earned?: number
          updated_at?: string
        }
        Update: {
          claimable_amount?: number
          created_at?: string
          creator_wallet?: string
          id?: string
          last_claim_at?: string | null
          token_id?: string
          total_claimed?: number
          total_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "creator_earnings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_transactions: {
        Row: {
          community_fee: number
          created_at: string
          creator_fee: number
          creator_wallet: string
          id: string
          liquidity_fee: number
          platform_fee: number
          token_id: string
          total_fee: number
          trade_amount: number
          trader_wallet: string
          transaction_type: string
        }
        Insert: {
          community_fee: number
          created_at?: string
          creator_fee: number
          creator_wallet: string
          id?: string
          liquidity_fee: number
          platform_fee: number
          token_id: string
          total_fee: number
          trade_amount: number
          trader_wallet: string
          transaction_type: string
        }
        Update: {
          community_fee?: number
          created_at?: string
          creator_fee?: number
          creator_wallet?: string
          id?: string
          liquidity_fee?: number
          platform_fee?: number
          token_id?: string
          total_fee?: number
          trade_amount?: number
          trader_wallet?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_transactions_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fee_transactions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          last_active: string
          total_tokens_created: number | null
          total_volume_traded: number | null
          username: string | null
          wallet_address: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          last_active?: string
          total_tokens_created?: number | null
          total_volume_traded?: number | null
          username?: string | null
          wallet_address: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          last_active?: string
          total_tokens_created?: number | null
          total_volume_traded?: number | null
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string
          creation_fee: number | null
          creator_wallet: string
          description: string | null
          holder_count: number | null
          id: string
          image_url: string | null
          market_cap: number | null
          mint_address: string | null
          name: string
          price: number | null
          symbol: string
          total_supply: number | null
          updated_at: string
          volume_24h: number | null
        }
        Insert: {
          created_at?: string
          creation_fee?: number | null
          creator_wallet: string
          description?: string | null
          holder_count?: number | null
          id?: string
          image_url?: string | null
          market_cap?: number | null
          mint_address?: string | null
          name: string
          price?: number | null
          symbol: string
          total_supply?: number | null
          updated_at?: string
          volume_24h?: number | null
        }
        Update: {
          created_at?: string
          creation_fee?: number | null
          creator_wallet?: string
          description?: string | null
          holder_count?: number | null
          id?: string
          image_url?: string | null
          market_cap?: number | null
          mint_address?: string | null
          name?: string
          price?: number | null
          symbol?: string
          total_supply?: number | null
          updated_at?: string
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
        ]
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
