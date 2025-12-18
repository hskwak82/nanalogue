import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemTTSSettings, getActiveProvider } from '@/lib/tts'

// GET /api/tts/settings - Get TTS settings for current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get system defaults
    const [systemSettings, provider] = await Promise.all([
      getSystemTTSSettings(),
      getActiveProvider(),
    ])

    // Get available voices from active provider
    const voices = provider.getVoices()
    const defaultVoice = systemSettings.defaultVoice || provider.getDefaultVoice()

    // If user is logged in, get their personal settings
    let userVoice: string | null = null
    let userSpeakingRate: number | null = null

    if (user) {
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('tts_voice, tts_speaking_rate')
        .eq('user_id', user.id)
        .single()

      if (userPrefs) {
        userVoice = userPrefs.tts_voice || null
        userSpeakingRate = userPrefs.tts_speaking_rate ?? null
      }
    }

    // Effective settings (user override or system default)
    const effectiveVoice = userVoice || defaultVoice
    const effectiveSpeakingRate = userSpeakingRate ?? systemSettings.speakingRate

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
      },
      voices,
      systemDefaults: {
        voice: defaultVoice,
        speakingRate: systemSettings.speakingRate,
      },
      userSettings: user ? {
        voice: userVoice,
        speakingRate: userSpeakingRate,
      } : null,
      effective: {
        voice: effectiveVoice,
        speakingRate: effectiveSpeakingRate,
      },
    })
  } catch (error) {
    console.error('Error fetching TTS settings:', error)
    return NextResponse.json({ error: 'Failed to fetch TTS settings' }, { status: 500 })
  }
}

// PATCH /api/tts/settings - Update user's personal TTS settings
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { voice, speakingRate } = body

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
    })
  } catch (error) {
    console.error('Error updating TTS settings:', error)
    return NextResponse.json({ error: 'Failed to update TTS settings' }, { status: 500 })
  }
}
