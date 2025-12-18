import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getTTSProvider } from '@/lib/tts'

// GET /api/admin/tts/voices?provider=google
// Get available voices for a TTS provider
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider')

    if (!providerId) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    const provider = getTTSProvider(providerId)
    if (!provider) {
      return NextResponse.json({ error: 'Invalid TTS provider' }, { status: 400 })
    }

    const voices = provider.getVoices()
    const defaultVoice = provider.getDefaultVoice()

    return NextResponse.json({
      provider: providerId,
      voices,
      defaultVoice,
    })
  } catch (error) {
    console.error('Error fetching TTS voices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    )
  }
}
