// Realtime Voice Provider Types

export type RealtimeProviderId = 'openai' | 'gemini'

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
