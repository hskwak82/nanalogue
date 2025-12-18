import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getTTSProvider, removeEmojis } from '@/lib/tts'

// GET /api/admin/tts/sample?provider=google&voice=ko-KR-Neural2-A
// Generate sample audio for a TTS provider/voice combination
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider')
    const voiceId = searchParams.get('voice')

    if (!providerId) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    const provider = getTTSProvider(providerId)
    if (!provider) {
      return NextResponse.json({ error: 'Invalid TTS provider' }, { status: 400 })
    }

    // Use specified voice or provider's default voice
    const voice = voiceId || provider.getDefaultVoice()
    const sampleText = removeEmojis(provider.getSampleText())

    // Generate sample audio
    const audioBuffer = await provider.synthesize(sampleText, voice)
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({
      audio: audioBase64,
      format: 'mp3',
      provider: providerId,
      voice,
      text: sampleText,
    })
  } catch (error) {
    console.error('Error generating TTS sample:', error)
    return NextResponse.json(
      { error: 'Failed to generate sample audio' },
      { status: 500 }
    )
  }
}
