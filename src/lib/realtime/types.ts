// Realtime Voice Provider Types

export type RealtimeProviderId = 'openai' | 'gemini'

// Conversation mode
export type ConversationMode = 'classic' | 'realtime'

// OpenAI Realtime voices
export type OpenAIRealtimeVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse'

// Gemini Live voices
export type GeminiRealtimeVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede'

// Combined voice type
export type RealtimeVoice = OpenAIRealtimeVoice | GeminiRealtimeVoice

// Settings from database
export interface RealtimeSettings {
  conversationMode: ConversationMode
  realtimeProvider: RealtimeProviderId
  realtimeVoice: string
  realtimeInstructions: string
}

// OpenAI ephemeral token response
export interface EphemeralToken {
  client_secret: {
    value: string
    expires_at: number
  }
}

export interface RealtimeProviderConfig {
  id: RealtimeProviderId
  name: string
  description: string
  isAvailable: boolean
}

export interface RealtimeSessionConfig {
  voice?: string
  instructions?: string
  language?: string
}

export interface RealtimeSessionToken {
  token: string
  expiresAt?: number
  voice?: string
  instructions?: string
  providerId?: RealtimeProviderId
}

export type RealtimeConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'

export interface RealtimeCallbacks {
  onStateChange?: (state: RealtimeConnectionState) => void
  onTranscript?: (text: string, isFinal: boolean) => void
  onAIResponse?: (text: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  onAudioLevel?: (level: number[]) => void
}

// Provider interface that both OpenAI and Gemini implementations must follow
export interface RealtimeProvider {
  readonly providerId: RealtimeProviderId
  readonly state: RealtimeConnectionState

  // Connection lifecycle
  connect(session: RealtimeSessionToken): Promise<void>
  disconnect(): Promise<void>

  // Conversation control
  startConversation(): void
  endConversation(): Promise<void>

  // State
  isConnected(): boolean
  isListening(): boolean

  // Callbacks
  setCallbacks(callbacks: RealtimeCallbacks): void
}

// Available providers configuration
export const REALTIME_PROVIDERS: Record<RealtimeProviderId, RealtimeProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI Realtime',
    description: 'GPT-4o 기반 실시간 음성 대화 (WebRTC)',
    isAvailable: true,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini Live',
    description: 'Gemini 2.5 기반 실시간 음성 대화 (WebSocket)',
    isAvailable: true,
  },
}

// Voice option with display info
export interface RealtimeVoiceOption {
  id: string
  name: string
  gender: string
  provider: RealtimeProviderId
}

// OpenAI Realtime voices list
export const OPENAI_REALTIME_VOICES: RealtimeVoiceOption[] = [
  { id: 'alloy', name: 'Alloy', gender: '중성', provider: 'openai' },
  { id: 'ash', name: 'Ash', gender: '남성', provider: 'openai' },
  { id: 'ballad', name: 'Ballad', gender: '남성', provider: 'openai' },
  { id: 'coral', name: 'Coral', gender: '여성', provider: 'openai' },
  { id: 'echo', name: 'Echo', gender: '남성', provider: 'openai' },
  { id: 'sage', name: 'Sage', gender: '여성', provider: 'openai' },
  { id: 'shimmer', name: 'Shimmer', gender: '여성', provider: 'openai' },
  { id: 'verse', name: 'Verse', gender: '남성', provider: 'openai' },
]

// Gemini Live voices list
export const GEMINI_REALTIME_VOICES: RealtimeVoiceOption[] = [
  { id: 'Puck', name: 'Puck', gender: '남성', provider: 'gemini' },
  { id: 'Charon', name: 'Charon', gender: '남성', provider: 'gemini' },
  { id: 'Kore', name: 'Kore', gender: '여성', provider: 'gemini' },
  { id: 'Fenrir', name: 'Fenrir', gender: '남성', provider: 'gemini' },
  { id: 'Aoede', name: 'Aoede', gender: '여성', provider: 'gemini' },
]

// Combined list of all realtime voices (for backward compatibility)
export const REALTIME_VOICES: RealtimeVoiceOption[] = [
  ...OPENAI_REALTIME_VOICES,
  ...GEMINI_REALTIME_VOICES,
]
