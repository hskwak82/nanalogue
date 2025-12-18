import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveProvider, getSystemTTSSettings, getUserTTSSettings, removeEmojis } from '@/lib/tts'

export async function POST(request: Request) {
  try {
    const { text, voice, speakingRate } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Clean text for TTS
    const cleanText = removeEmojis(text)
    if (!cleanText) {
      return NextResponse.json({ error: 'No text to speak' }, { status: 400 })
    }

    // Get active TTS provider and system settings
    const [provider, systemSettings] = await Promise.all([
      getActiveProvider(),
      getSystemTTSSettings(),
    ])

    // Determine effective settings
    let effectiveVoice = voice
    let effectiveRate = speakingRate

    // If voice or rate not provided, try to get user's personal settings
    if (voice === undefined || speakingRate === undefined) {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const userSettings = await getUserTTSSettings(user.id)

          // Use user's personal settings if available
          if (voice === undefined) {
            effectiveVoice = userSettings.voice || systemSettings.defaultVoice || provider.getDefaultVoice()
          }
          if (speakingRate === undefined) {
            effectiveRate = userSettings.speakingRate ?? systemSettings.speakingRate
          }
        }
      } catch {
        // If can't get user settings, fall through to system defaults
      }
    }

    // Final fallback to system defaults
    if (!effectiveVoice) {
      effectiveVoice = systemSettings.defaultVoice || provider.getDefaultVoice()
    }
    if (effectiveRate === undefined) {
      effectiveRate = systemSettings.speakingRate
    }

    // Synthesize speech
    const audioBuffer = await provider.synthesize(
      cleanText,
      effectiveVoice,
      { speakingRate: effectiveRate }
    )

    // Return audio as base64
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({
      audio: audioBase64,
      format: 'mp3',
      provider: provider.id,
    })
  } catch (error) {
    console.error('TTS Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
