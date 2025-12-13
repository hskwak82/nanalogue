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
          email: string | null
          name: string | null
          avatar_url: string | null
          locale: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          locale?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          locale?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          interests: Json
          tone: string
          language: string
          notification_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          interests?: Json
          tone?: string
          language?: string
          notification_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          interests?: Json
          tone?: string
          language?: string
          notification_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      daily_sessions: {
        Row: {
          id: string
          user_id: string
          session_date: string
          status: string
          raw_conversation: Json
          calendar_events: Json
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_date: string
          status?: string
          raw_conversation?: Json
          calendar_events?: Json
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_date?: string
          status?: string
          raw_conversation?: Json
          calendar_events?: Json
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      diary_entries: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          entry_date: string
          content: string
          summary: string | null
          emotions: Json
          gratitude: Json
          schedule_review: Json
          tomorrow_plan: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          entry_date: string
          content: string
          summary?: string | null
          emotions?: Json
          gratitude?: Json
          schedule_review?: Json
          tomorrow_plan?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          entry_date?: string
          content?: string
          summary?: string | null
          emotions?: Json
          gratitude?: Json
          schedule_review?: Json
          tomorrow_plan?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calendar_tokens: {
        Row: {
          id: string
          user_id: string
          provider: string
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          scope: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
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
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserPreferences =
  Database['public']['Tables']['user_preferences']['Row']
export type DailySession = Database['public']['Tables']['daily_sessions']['Row']
export type DiaryEntry = Database['public']['Tables']['diary_entries']['Row']
export type CalendarToken =
  Database['public']['Tables']['calendar_tokens']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']

// Conversation types
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  purpose?: string // e.g., 'greeting', 'emotion', 'schedule', 'gratitude'
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  status?: 'completed' | 'pending' | 'canceled'
}
