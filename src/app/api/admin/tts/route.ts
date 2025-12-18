import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import { getAllProviderInfos, getTTSProvider } from '@/lib/tts'

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
      .select('tts_provider, tts_speaking_rate, tts_default_voice, updated_at, updated_by')
      .eq('id', 'default')
      .single()

    // Get all available providers with their info
    const providers = getAllProviderInfos()

    // Mark the current provider as default
    const currentProvider = settings?.tts_provider || 'google'
    const speakingRate = settings?.tts_speaking_rate ?? 1.0
    const defaultVoice = settings?.tts_default_voice || null
    const providersWithDefault = providers.map(p => ({
      ...p,
      isDefault: p.id === currentProvider,
    }))

    return NextResponse.json({
      currentProvider,
      speakingRate,
      defaultVoice,
      providers: providersWithDefault,
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
    const { provider, speakingRate, defaultVoice } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      id: 'default',
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    }

    // Validate and add provider if provided
    if (provider) {
      const ttsProvider = getTTSProvider(provider)
      if (!ttsProvider) {
        return NextResponse.json({ error: 'Invalid TTS provider' }, { status: 400 })
      }
      updateData.tts_provider = provider
    }

    // Validate and add speaking rate if provided
    if (speakingRate !== undefined) {
      const rate = Number(speakingRate)
      if (isNaN(rate) || rate < 0.5 || rate > 2.0) {
        return NextResponse.json({ error: 'Speaking rate must be between 0.5 and 2.0' }, { status: 400 })
      }
      updateData.tts_speaking_rate = rate
    }

    // Add default voice if provided
    if (defaultVoice !== undefined) {
      updateData.tts_default_voice = defaultVoice || null
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
      currentProvider: provider,
      speakingRate: speakingRate,
      defaultVoice: defaultVoice,
    })
  } catch (error) {
    console.error('Error updating TTS provider:', error)
    return NextResponse.json({ error: 'Failed to update TTS provider' }, { status: 500 })
  }
}
