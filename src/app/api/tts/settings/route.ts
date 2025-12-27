import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemTTSSettings, getActiveProvider } from '@/lib/tts'
import { getRealtimeSettings } from '@/lib/realtime'
import { REALTIME_VOICES, type RealtimeVoice } from '@/lib/realtime/types'

// GET /api/tts/settings - Get TTS settings for current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get system defaults
    const [systemSettings, provider, realtimeSettings] = await Promise.all([
      getSystemTTSSettings(),
      getActiveProvider(),
      getRealtimeSettings(),
    ])

    // Get available voices from active provider
    const voices = provider.getVoices()
    const defaultVoice = systemSettings.defaultVoice || provider.getDefaultVoice()

    // If user is logged in, get their personal settings
    let userVoice: string | null = null
    let userSpeakingRate: number | null = null
    let userRealtimeVoice: string | null = null
    let userInputMode: 'voice' | 'text' = 'voice'

    if (user) {
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('tts_voice, tts_speaking_rate, realtime_voice, input_mode')
        .eq('user_id', user.id)
        .single()

      if (userPrefs) {
        userVoice = userPrefs.tts_voice || null
        userSpeakingRate = userPrefs.tts_speaking_rate ?? null
        userRealtimeVoice = userPrefs.realtime_voice || null
      }
      userInputMode = userPrefs?.input_mode || 'voice'
    }

    // Effective settings (user override or system default)
    const effectiveVoice = userVoice || defaultVoice
    const effectiveSpeakingRate = userSpeakingRate ?? systemSettings.speakingRate
    const effectiveRealtimeVoice = userRealtimeVoice || realtimeSettings.realtimeVoice

    return NextResponse.json({
      conversationMode: realtimeSettings.conversationMode,
      provider: {
        id: provider.id,
        name: provider.name,
      },
      voices,
      realtimeVoices: REALTIME_VOICES,
      systemDefaults: {
        voice: defaultVoice,
        speakingRate: systemSettings.speakingRate,
        realtimeVoice: realtimeSettings.realtimeVoice,
      },
      userSettings: user ? {
        voice: userVoice,
        speakingRate: userSpeakingRate,
        realtimeVoice: userRealtimeVoice,
        inputMode: userInputMode,
      } : null,
      effective: {
        voice: effectiveVoice,
        speakingRate: effectiveSpeakingRate,
        realtimeVoice: effectiveRealtimeVoice,
      },
    })
  } catch (error) {
    console.error('Error fetching TTS settings:', error)
    return NextResponse.json({ error: 'Failed to fetch TTS settings' }, { status: 500 })
  }
}

// Valid realtime voices
const VALID_REALTIME_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']

// PATCH /api/tts/settings - Update user's personal TTS settings
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { voice, speakingRate, realtimeVoice, inputMode } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      user_id: user.id,
    }

    // Validate voice if provided (must be from active provider)
    if (voice !== undefined) {
      if (voice === null) {
        // Reset to system default
        updateData.tts_voice = null
      } else {
        const provider = await getActiveProvider()
        const validVoices = provider.getVoices().map(v => v.id)
        if (!validVoices.includes(voice)) {
          return NextResponse.json({ error: 'Invalid voice for current provider' }, { status: 400 })
        }
        updateData.tts_voice = voice
      }
    }

    // Validate speaking rate if provided
    if (speakingRate !== undefined) {
      if (speakingRate === null) {
        // Reset to system default
        updateData.tts_speaking_rate = null
      } else {
        const rate = Number(speakingRate)
        if (isNaN(rate) || rate < 0.5 || rate > 2.0) {
          return NextResponse.json({ error: 'Speaking rate must be between 0.5 and 2.0' }, { status: 400 })
        }
        updateData.tts_speaking_rate = rate
      }
    }

    // Validate realtime voice if provided
    if (realtimeVoice !== undefined) {
      if (realtimeVoice === null) {
        // Reset to system default
        updateData.realtime_voice = null
      } else {
        if (!VALID_REALTIME_VOICES.includes(realtimeVoice)) {
          return NextResponse.json({ error: 'Invalid realtime voice' }, { status: 400 })
        }
        updateData.realtime_voice = realtimeVoice
      }
    }

    // Validate input mode if provided
    if (inputMode !== undefined) {
      if (inputMode !== null && !['voice', 'text'].includes(inputMode)) {
        return NextResponse.json({ error: 'Invalid input mode' }, { status: 400 })
      }
      updateData.input_mode = inputMode
    }

    // Upsert user preferences
    const { error } = await supabase
      .from('user_preferences')
      .upsert(updateData, { onConflict: 'user_id' })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      voice: updateData.tts_voice,
      speakingRate: updateData.tts_speaking_rate,
      realtimeVoice: updateData.realtime_voice,
      inputMode: updateData.input_mode,
    })
  } catch (error) {
    console.error('Error updating TTS settings:', error)
    return NextResponse.json({ error: 'Failed to update TTS settings' }, { status: 500 })
  }
}
