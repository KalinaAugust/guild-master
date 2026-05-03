export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          fullName: string | null
          avatarUrl: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          fullName?: string | null
          avatarUrl?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          fullName?: string | null
          avatarUrl?: string | null
          updated_at?: string | null
        }
      }
      guilds: {
        Row: {
          id: string
          name: string
          ownerId: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          ownerId: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          ownerId?: string
          description?: string | null
          created_at?: string
        }
      }
      guild_members: {
        Row: {
          guild_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          guild_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          guild_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
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
