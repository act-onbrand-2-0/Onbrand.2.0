export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      brand_settings: {
        Row: {
          brand_id: string | null
          created_at: string | null
          features: Json | null
          id: string
          logo_url: string | null
          primary_color: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_uploads: {
        Row: {
          brand_id: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_uploads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_users: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_users_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived: boolean | null
          brand_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          model: string
          settings: Json | null
          system_prompt: string | null
          title: string
          total_cost_usd: number | null
          total_tokens_used: number | null
          updated_at: string | null
          user_id: string
          visibility: 'private' | 'shared' | null
        }
        Insert: {
          archived?: boolean | null
          brand_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          model?: string
          settings?: Json | null
          system_prompt?: string | null
          title: string
          total_cost_usd?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id: string
          visibility?: 'private' | 'shared' | null
        }
        Update: {
          archived?: boolean | null
          brand_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          model?: string
          settings?: Json | null
          system_prompt?: string | null
          title?: string
          total_cost_usd?: number | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
          visibility?: 'private' | 'shared' | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          model: string
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model: string
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brand_id: string
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          email?: string
          id?: string
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

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type Conversation = Tables<'conversations'>
export type Message = Tables<'messages'>
export type Brand = Tables<'brands'>
export type BrandUser = Tables<'brand_users'>
export type Profile = Tables<'profiles'>

// Visibility type
export type ConversationVisibility = 'private' | 'shared'
