// Server-side utilities for OpenAI Realtime API

import { createClient } from '@supabase/supabase-js'
import type { RealtimeSettings, RealtimeVoice, EphemeralToken, ConversationMode } from './types'

const DEFAULT_VOICE: RealtimeVoice = 'alloy'
const DEFAULT_INSTRUCTIONS = `You are a warm and friendly diary companion.
Help users reflect on their day through natural conversation.
Be empathetic, encouraging, and supportive.
Ask follow-up questions to help them explore their feelings and experiences.
Keep responses concise and conversational.
Speak in Korean.`

/**
 * Get realtime settings from database
 */
export async function getRealtimeSettings(): Promise<RealtimeSettings> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      conversationMode: 'classic',
      realtimeVoice: DEFAULT_VOICE,
      realtimeInstructions: DEFAULT_INSTRUCTIONS,
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('system_settings')
    .select('conversation_mode, realtime_voice, realtime_instructions')
    .eq('id', 'default')
    .single()

  if (error || !data) {
    return {
      conversationMode: 'classic',
      realtimeVoice: DEFAULT_VOICE,
      realtimeInstructions: DEFAULT_INSTRUCTIONS,
    }
  }

  return {
    conversationMode: (data.conversation_mode as ConversationMode) || 'classic',
    realtimeVoice: (data.realtime_voice as RealtimeVoice) || DEFAULT_VOICE,
    realtimeInstructions: data.realtime_instructions || DEFAULT_INSTRUCTIONS,
  }
}

/**
 * Create an ephemeral token for browser WebRTC connection
 * This token is short-lived and safe to expose to the client
 */
export async function getEphemeralToken(): Promise<EphemeralToken> {
  const apiKey = process.env.OPENAI_API_KEY

  // Debug: Check environment variable
  console.log('[getEphemeralToken] OPENAI_API_KEY exists:', !!apiKey)
  console.log('[getEphemeralToken] OPENAI_API_KEY length:', apiKey?.length || 0)
  console.log('[getEphemeralToken] Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('API')).join(', '))

  if (!apiKey) {
    throw new Error(`OPENAI_API_KEY is not set. Available keys: ${Object.keys(process.env).slice(0, 20).join(', ')}`)
  }

  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy', // Will be overridden by session.update
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create ephemeral token: ${error}`)
  }

  return response.json()
}

/**
 * Get default instructions for realtime conversation
 */
export function getDefaultInstructions(): string {
  return DEFAULT_INSTRUCTIONS
}
