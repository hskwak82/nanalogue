import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import { getAllProviderInfos, getTTSProvider } from '@/lib/tts'

// OpenAI Realtime voice options
const REALTIME_VOICES = [
  { id: 'alloy', name: 'Alloy', description: '중성적이고 친근한' },
  { id: 'ash', name: 'Ash', description: '따뜻하고 부드러운' },
  { id: 'ballad', name: 'Ballad', description: '차분하고 감성적' },
  { id: 'coral', name: 'Coral', description: '밝고 활기찬' },
  { id: 'echo', name: 'Echo', description: '차분하고 전문적' },
  { id: 'sage', name: 'Sage', description: '지적이고 침착한' },
  { id: 'shimmer', name: 'Shimmer', description: '맑고 상쾌한' },
  { id: 'verse', name: 'Verse', description: '자연스럽고 대화체' },
]

// GET /api/admin/tts - Get TTS settings and available providers
export async function GET() {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getAdminServiceClient()

    // Get current system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('tts_provider, tts_speaking_rate, tts_default_voice, conversation_mode, realtime_voice, realtime_instructions, updated_at, updated_by')
      .eq('id', 'default')
      .single()

    // Get all available providers with their info
    const providers = getAllProviderInfos()

    // Extract settings with defaults
    const conversationMode = settings?.conversation_mode || 'classic'
    const currentProvider = settings?.tts_provider || 'google'
    const speakingRate = settings?.tts_speaking_rate ?? 1.0
    const defaultVoice = settings?.tts_default_voice || null
    const realtimeVoice = settings?.realtime_voice || 'alloy'
    const realtimeInstructions = settings?.realtime_instructions || ''

    const providersWithDefault = providers.map(p => ({
      ...p,
      isDefault: p.id === currentProvider,
    }))

    return NextResponse.json({
      conversationMode,
      // Classic mode settings
      currentProvider,
      speakingRate,
      defaultVoice,
      providers: providersWithDefault,
      // Realtime mode settings
      realtimeVoice,
      realtimeVoices: REALTIME_VOICES,
      realtimeInstructions,
      // Metadata
      updatedAt: settings?.updated_at || null,
      updatedBy: settings?.updated_by || null,
    })
  } catch (error) {
    console.error('Error fetching TTS settings:', error)
    return NextResponse.json({ error: 'Failed to fetch TTS settings' }, { status: 500 })
  }
}

// PATCH /api/admin/tts - Update TTS provider
export async function PATCH(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      conversationMode,
      provider,
      speakingRate,
      defaultVoice,
      realtimeVoice,
      realtimeInstructions,
    } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      id: 'default',
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    }

    // Validate and add conversation mode
    if (conversationMode !== undefined) {
      if (!['classic', 'realtime'].includes(conversationMode)) {
        return NextResponse.json({ error: 'Invalid conversation mode' }, { status: 400 })
      }
      updateData.conversation_mode = conversationMode
    }

    // Classic mode settings
    if (provider) {
      const ttsProvider = getTTSProvider(provider)
      if (!ttsProvider) {
        return NextResponse.json({ error: 'Invalid TTS provider' }, { status: 400 })
      }
      updateData.tts_provider = provider
    }

    if (speakingRate !== undefined) {
      const rate = Number(speakingRate)
      if (isNaN(rate) || rate < 0.5 || rate > 2.0) {
        return NextResponse.json({ error: 'Speaking rate must be between 0.5 and 2.0' }, { status: 400 })
      }
      updateData.tts_speaking_rate = rate
    }

    if (defaultVoice !== undefined) {
      updateData.tts_default_voice = defaultVoice || null
    }

    // Realtime mode settings
    if (realtimeVoice !== undefined) {
      const validVoices = REALTIME_VOICES.map(v => v.id)
      if (!validVoices.includes(realtimeVoice)) {
        return NextResponse.json({ error: 'Invalid realtime voice' }, { status: 400 })
      }
      updateData.realtime_voice = realtimeVoice
    }

    if (realtimeInstructions !== undefined) {
      updateData.realtime_instructions = realtimeInstructions || null
    }

    const supabase = getAdminServiceClient()

    // Update system settings
    const { error } = await supabase
      .from('system_settings')
      .upsert(updateData)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      conversationMode: updateData.conversation_mode,
      currentProvider: updateData.tts_provider,
      speakingRate: updateData.tts_speaking_rate,
      defaultVoice: updateData.tts_default_voice,
      realtimeVoice: updateData.realtime_voice,
      realtimeInstructions: updateData.realtime_instructions,
    })
  } catch (error) {
    console.error('Error updating TTS provider:', error)
    return NextResponse.json({ error: 'Failed to update TTS provider' }, { status: 500 })
  }
}
