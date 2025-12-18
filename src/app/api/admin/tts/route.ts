import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import { getAllProviderInfos, getTTSProvider } from '@/lib/tts'

// Realtime provider options
const REALTIME_PROVIDERS = [
  { id: 'openai', name: 'OpenAI Realtime', description: 'GPT-4o 기반 WebRTC 실시간 대화' },
  { id: 'gemini', name: 'Google Gemini Live', description: 'Gemini 2.5 기반 WebSocket 실시간 대화' },
]

// OpenAI Realtime voice options
const OPENAI_REALTIME_VOICES = [
  { id: 'alloy', name: 'Alloy', description: '중성적이고 친근한' },
  { id: 'ash', name: 'Ash', description: '따뜻하고 부드러운' },
  { id: 'ballad', name: 'Ballad', description: '차분하고 감성적' },
  { id: 'coral', name: 'Coral', description: '밝고 활기찬' },
  { id: 'echo', name: 'Echo', description: '차분하고 전문적' },
  { id: 'sage', name: 'Sage', description: '지적이고 침착한' },
  { id: 'shimmer', name: 'Shimmer', description: '맑고 상쾌한' },
  { id: 'verse', name: 'Verse', description: '자연스럽고 대화체' },
]

// Gemini Live voice options
const GEMINI_REALTIME_VOICES = [
  { id: 'Puck', name: 'Puck', description: '활발하고 명랑한' },
  { id: 'Charon', name: 'Charon', description: '차분하고 신뢰감 있는' },
  { id: 'Kore', name: 'Kore', description: '따뜻하고 부드러운' },
  { id: 'Fenrir', name: 'Fenrir', description: '힘있고 안정적인' },
  { id: 'Aoede', name: 'Aoede', description: '밝고 친근한' },
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
      .select('tts_provider, tts_speaking_rate, tts_default_voice, conversation_mode, realtime_provider, realtime_voice, realtime_instructions, updated_at, updated_by')
      .eq('id', 'default')
      .single()

    // Get all available providers with their info
    const providers = getAllProviderInfos()

    // Extract settings with defaults
    const conversationMode = settings?.conversation_mode || 'classic'
    const currentProvider = settings?.tts_provider || 'google'
    const speakingRate = settings?.tts_speaking_rate ?? 1.0
    const defaultVoice = settings?.tts_default_voice || null
    const realtimeProvider = settings?.realtime_provider || 'openai'
    const realtimeVoice = settings?.realtime_voice || 'alloy'
    const realtimeInstructions = settings?.realtime_instructions || ''

    const providersWithDefault = providers.map(p => ({
      ...p,
      isDefault: p.id === currentProvider,
    }))

    // Get voices based on selected realtime provider
    const realtimeVoices = realtimeProvider === 'gemini'
      ? GEMINI_REALTIME_VOICES
      : OPENAI_REALTIME_VOICES

    return NextResponse.json({
      conversationMode,
      // Classic mode settings
      currentProvider,
      speakingRate,
      defaultVoice,
      providers: providersWithDefault,
      // Realtime mode settings
      realtimeProvider,
      realtimeProviders: REALTIME_PROVIDERS,
      realtimeVoice,
      realtimeVoices,
      openaiVoices: OPENAI_REALTIME_VOICES,
      geminiVoices: GEMINI_REALTIME_VOICES,
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
      realtimeProvider,
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
    if (realtimeProvider !== undefined) {
      const validProviders = REALTIME_PROVIDERS.map(p => p.id)
      if (!validProviders.includes(realtimeProvider)) {
        return NextResponse.json({ error: 'Invalid realtime provider' }, { status: 400 })
      }
      updateData.realtime_provider = realtimeProvider
    }

    if (realtimeVoice !== undefined) {
      // Validate voice based on provider
      const currentProvider = realtimeProvider || body.currentRealtimeProvider || 'openai'
      const validVoices = currentProvider === 'gemini'
        ? GEMINI_REALTIME_VOICES.map(v => v.id)
        : OPENAI_REALTIME_VOICES.map(v => v.id)
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
      realtimeProvider: updateData.realtime_provider,
      realtimeVoice: updateData.realtime_voice,
      realtimeInstructions: updateData.realtime_instructions,
    })
  } catch (error) {
    console.error('Error updating TTS provider:', error)
    return NextResponse.json({ error: 'Failed to update TTS provider' }, { status: 500 })
  }
}
