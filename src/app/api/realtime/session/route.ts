import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRealtimeSettings, getOpenAIEphemeralToken, getGeminiSessionConfig } from '@/lib/realtime'

// POST /api/realtime/session - Create session config for realtime connection
export async function POST() {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if realtime mode is enabled
    const settings = await getRealtimeSettings()

    if (settings.conversationMode !== 'realtime') {
      return NextResponse.json(
        { error: 'Realtime mode is not enabled' },
        { status: 400 }
      )
    }

    // Get user's preferred realtime voice
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('realtime_voice')
      .eq('user_id', user.id)
      .single()

    // Use user's voice preference or fall back to system default
    const effectiveVoice = userPrefs?.realtime_voice || settings.realtimeVoice
    const provider = settings.realtimeProvider

    // Create session based on provider
    if (provider === 'gemini') {
      // Gemini Live API - return API key for WebSocket connection
      const geminiConfig = await getGeminiSessionConfig()
      return NextResponse.json({
        provider: 'gemini',
        apiKey: geminiConfig.apiKey,
        voice: effectiveVoice,
        instructions: settings.realtimeInstructions,
      })
    } else {
      // OpenAI Realtime API - return ephemeral token for WebRTC connection
      const tokenResponse = await getOpenAIEphemeralToken()
      return NextResponse.json({
        provider: 'openai',
        token: tokenResponse.client_secret.value,
        expiresAt: tokenResponse.client_secret.expires_at,
        voice: effectiveVoice,
        instructions: settings.realtimeInstructions,
      })
    }
  } catch (error) {
    console.error('Error creating realtime session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create realtime session: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// GET /api/realtime/session - Check if realtime mode is available
export async function GET() {
  try {
    const settings = await getRealtimeSettings()

    return NextResponse.json({
      mode: settings.conversationMode,
      realtimeEnabled: settings.conversationMode === 'realtime',
      provider: settings.realtimeProvider,
      voice: settings.realtimeVoice,
    })
  } catch (error) {
    console.error('Error checking realtime session:', error)
    return NextResponse.json(
      { error: 'Failed to check realtime session' },
      { status: 500 }
    )
  }
}
