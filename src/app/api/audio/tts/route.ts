import { NextResponse } from 'next/server'
import { getActiveProvider, removeEmojis } from '@/lib/tts'

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

    // Get active TTS provider from system settings
    const provider = await getActiveProvider()

    // Synthesize speech
    const audioBuffer = await provider.synthesize(cleanText, voice || provider.getDefaultVoice())

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
