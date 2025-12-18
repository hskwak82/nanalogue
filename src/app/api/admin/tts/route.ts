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
      .select('tts_provider, updated_at, updated_by')
      .eq('id', 'default')
      .single()

    // Get all available providers with their info
    const providers = getAllProviderInfos()

    // Mark the current provider as default
    const currentProvider = settings?.tts_provider || 'google'
    const providersWithDefault = providers.map(p => ({
      ...p,
      isDefault: p.id === currentProvider,
    }))

    return NextResponse.json({
      currentProvider,
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
    const { provider } = body

    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    // Validate provider exists
    const ttsProvider = getTTSProvider(provider)
    if (!ttsProvider) {
      return NextResponse.json({ error: 'Invalid TTS provider' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    // Update system settings
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'default',
        tts_provider: provider,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      currentProvider: provider,
    })
  } catch (error) {
    console.error('Error updating TTS provider:', error)
    return NextResponse.json({ error: 'Failed to update TTS provider' }, { status: 500 })
  }
}
