// Server-side utilities for Realtime Voice API (OpenAI & Gemini)

import { createClient } from '@supabase/supabase-js'
import type { RealtimeSettings, EphemeralToken, ConversationMode, RealtimeProviderId } from './types'

const DEFAULT_OPENAI_VOICE = 'alloy'
const DEFAULT_GEMINI_VOICE = 'Puck'
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
      realtimeProvider: 'openai',
      realtimeVoice: DEFAULT_OPENAI_VOICE,
      realtimeInstructions: DEFAULT_INSTRUCTIONS,
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('system_settings')
    .select('conversation_mode, realtime_provider, realtime_voice, realtime_instructions')
    .eq('id', 'default')
    .single()

  if (error || !data) {
    return {
      conversationMode: 'classic',
      realtimeProvider: 'openai',
      realtimeVoice: DEFAULT_OPENAI_VOICE,
      realtimeInstructions: DEFAULT_INSTRUCTIONS,
    }
  }

  const provider = (data.realtime_provider as RealtimeProviderId) || 'openai'
  const defaultVoice = provider === 'gemini' ? DEFAULT_GEMINI_VOICE : DEFAULT_OPENAI_VOICE

  return {
    conversationMode: (data.conversation_mode as ConversationMode) || 'classic',
    realtimeProvider: provider,
    realtimeVoice: data.realtime_voice || defaultVoice,
    realtimeInstructions: data.realtime_instructions || DEFAULT_INSTRUCTIONS,
  }
}

/**
 * Create an ephemeral token for OpenAI Realtime WebRTC connection
 */
export async function getOpenAIEphemeralToken(): Promise<EphemeralToken> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
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
    throw new Error(`Failed to create OpenAI ephemeral token: ${error}`)
  }

  return response.json()
}

/**
 * Get Gemini API key for client-side WebSocket connection
 * Note: Gemini Live API uses direct WebSocket with API key
 * For production, consider using ephemeral tokens via Vertex AI
 */
export async function getGeminiSessionConfig(): Promise<{ apiKey: string }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured')
  }

  // For now, return the API key directly
  // In production, you should use Vertex AI ephemeral tokens
  return { apiKey }
}

/**
 * Get ephemeral token based on provider
 * @deprecated Use getOpenAIEphemeralToken or getGeminiSessionConfig instead
 */
export async function getEphemeralToken(): Promise<EphemeralToken> {
  return getOpenAIEphemeralToken()
}

/**
 * Get default instructions for realtime conversation
 */
export function getDefaultInstructions(): string {
  return DEFAULT_INSTRUCTIONS
}
