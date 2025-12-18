import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRealtimeSettings, getEphemeralToken } from '@/lib/realtime'

// POST /api/realtime/session - Create ephemeral token for realtime connection
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

    // Create ephemeral token
    const tokenResponse = await getEphemeralToken()

    // Return token with settings
    return NextResponse.json({
      token: tokenResponse.client_secret.value,
      expiresAt: tokenResponse.client_secret.expires_at,
      voice: settings.realtimeVoice,
      instructions: settings.realtimeInstructions,
    })
  } catch (error) {
    console.error('Error creating realtime session:', error)
    return NextResponse.json(
      { error: 'Failed to create realtime session' },
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
