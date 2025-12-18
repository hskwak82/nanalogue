// TTS Provider Factory

import type { TTSProvider, TTSProviderInfo, SystemTTSSettings } from './types'
import { googleTTSProvider } from './google-tts'
import { naverClovaTTSProvider } from './naver-clova'
import { createClient } from '@supabase/supabase-js'

// Provider registry
const providers: Map<string, TTSProvider> = new Map([
  ['google', googleTTSProvider],
  ['naver', naverClovaTTSProvider],
])

// Default provider if no database setting exists
const DEFAULT_PROVIDER_ID = 'google'

/**
 * Get a TTS provider by ID
 */
export function getTTSProvider(providerId: string): TTSProvider | undefined {
  return providers.get(providerId)
}

/**
 * Get all available TTS providers
 */
export function getAllProviders(): TTSProvider[] {
  return Array.from(providers.values())
}

/**
 * Get provider info for all registered providers
 */
export function getAllProviderInfos(): TTSProviderInfo[] {
  return Array.from(providers.entries()).map(([id, provider]) => ({
    id,
    name: provider.name,
    description: getProviderDescription(id),
    isActive: true,
    isDefault: id === DEFAULT_PROVIDER_ID,
    voiceCount: provider.getVoices().length,
  }))
}

function getProviderDescription(id: string): string {
  switch (id) {
    case 'google':
      return 'Google Cloud Text-to-Speech - Neural2 및 Wavenet 음성'
    case 'naver':
      return 'Naver Clova Voice - 한국어 특화 자연스러운 음성'
    default:
      return ''
  }
}

/**
 * Get the active TTS provider from system settings
 */
export async function getActiveProvider(): Promise<TTSProvider> {
  try {
    const settings = await getSystemTTSSettings()
    const provider = providers.get(settings.provider)
    if (provider) {
      return provider
    }
  } catch (error) {
    console.error('Failed to get active provider from settings:', error)
  }

  // Fallback to default provider
  return providers.get(DEFAULT_PROVIDER_ID)!
}

/**
 * Get system TTS settings from database
 */
export async function getSystemTTSSettings(): Promise<SystemTTSSettings> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return { provider: DEFAULT_PROVIDER_ID, updatedAt: null, updatedBy: null }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('system_settings')
    .select('tts_provider, updated_at, updated_by')
    .eq('id', 'default')
    .single()

  if (error || !data) {
    return { provider: DEFAULT_PROVIDER_ID, updatedAt: null, updatedBy: null }
  }

  return {
    provider: data.tts_provider || DEFAULT_PROVIDER_ID,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  }
}

/**
 * Update system TTS provider setting
 */
export async function updateSystemTTSProvider(providerId: string, userId: string): Promise<void> {
  if (!providers.has(providerId)) {
    throw new Error(`Unknown TTS provider: ${providerId}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      id: 'default',
      tts_provider: providerId,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })

  if (error) {
    throw new Error(`Failed to update TTS provider: ${error.message}`)
  }
}

/**
 * Register a new TTS provider (for extensibility)
 */
export function registerProvider(provider: TTSProvider): void {
  providers.set(provider.id, provider)
}
