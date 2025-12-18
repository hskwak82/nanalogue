// OpenAI Realtime API Types

export type ConversationMode = 'classic' | 'realtime'

export type RealtimeVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse'

export interface RealtimeVoiceInfo {
  id: RealtimeVoice
  name: string
  description: string
}

export const REALTIME_VOICES: RealtimeVoiceInfo[] = [
  { id: 'alloy', name: 'Alloy', description: '중성적이고 친근한' },
  { id: 'ash', name: 'Ash', description: '따뜻하고 부드러운' },
  { id: 'ballad', name: 'Ballad', description: '차분하고 감성적' },
  { id: 'coral', name: 'Coral', description: '밝고 활기찬' },
  { id: 'echo', name: 'Echo', description: '차분하고 전문적' },
  { id: 'sage', name: 'Sage', description: '지적이고 침착한' },
  { id: 'shimmer', name: 'Shimmer', description: '맑고 상쾌한' },
  { id: 'verse', name: 'Verse', description: '자연스럽고 대화체' },
]

export interface RealtimeSessionConfig {
  voice: RealtimeVoice
  instructions?: string
  turnDetection?: {
    type: 'server_vad'
    threshold?: number // 0.0 to 1.0, default 0.5
    prefix_padding_ms?: number // default 300
    silence_duration_ms?: number // default 500
  }
  inputAudioTranscription?: {
    model: 'whisper-1'
  }
}

export interface RealtimeSettings {
  conversationMode: ConversationMode
  realtimeVoice: RealtimeVoice
  realtimeInstructions: string | null
}

// Ephemeral token for browser WebRTC connection
export interface EphemeralToken {
  client_secret: {
    value: string
    expires_at: number
  }
}

// Audio format for Realtime API
// Input: PCM 16-bit, 24kHz, mono
// Output: PCM 16-bit, 24kHz, mono
export const REALTIME_AUDIO_FORMAT = {
  sampleRate: 24000,
  channels: 1,
  bitDepth: 16,
}

// Realtime event types (subset of full API)
export interface RealtimeEvent {
  type: string
  event_id?: string
}

export interface SessionCreatedEvent extends RealtimeEvent {
  type: 'session.created'
  session: {
    id: string
    model: string
    voice: RealtimeVoice
  }
}

export interface ResponseAudioDeltaEvent extends RealtimeEvent {
  type: 'response.audio.delta'
  response_id: string
  item_id: string
  delta: string // base64 encoded audio
}

export interface ResponseAudioTranscriptDeltaEvent extends RealtimeEvent {
  type: 'response.audio_transcript.delta'
  response_id: string
  item_id: string
  delta: string // text
}

export interface InputAudioBufferSpeechStartedEvent extends RealtimeEvent {
  type: 'input_audio_buffer.speech_started'
  audio_start_ms: number
  item_id: string
}

export interface InputAudioBufferSpeechStoppedEvent extends RealtimeEvent {
  type: 'input_audio_buffer.speech_stopped'
  audio_end_ms: number
  item_id: string
}

export interface ResponseDoneEvent extends RealtimeEvent {
  type: 'response.done'
  response: {
    id: string
    status: 'completed' | 'cancelled' | 'failed' | 'incomplete'
  }
}

export interface ErrorEvent extends RealtimeEvent {
  type: 'error'
  error: {
    type: string
    code: string
    message: string
  }
}

export type RealtimeServerEvent =
  | SessionCreatedEvent
  | ResponseAudioDeltaEvent
  | ResponseAudioTranscriptDeltaEvent
  | InputAudioBufferSpeechStartedEvent
  | InputAudioBufferSpeechStoppedEvent
  | ResponseDoneEvent
  | ErrorEvent
