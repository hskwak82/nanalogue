import { NextResponse } from 'next/server'
import { getActiveProvider, getSystemTTSSettings, removeEmojis } from '@/lib/tts'

export async function POST(request: Request) {
  try {
    const { text, voice } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Clean text for TTS
    const cleanText = removeEmojis(text)
    if (!cleanText) {
      return NextResponse.json({ error: 'No text to speak' }, { status: 400 })
    }

    // Get active TTS provider and settings
    const [provider, settings] = await Promise.all([
      getActiveProvider(),
      getSystemTTSSettings(),
    ])

    // Synthesize speech with speaking rate from settings
    const audioBuffer = await provider.synthesize(
      cleanText,
      voice || provider.getDefaultVoice(),
      { speakingRate: settings.speakingRate }
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
