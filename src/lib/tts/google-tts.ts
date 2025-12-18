// Google Cloud TTS Provider

import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import type { TTSProvider, TTSVoice, TTSSynthesizeOptions } from './types'

const GOOGLE_VOICES: TTSVoice[] = [
  { id: 'ko-KR-Neural2-A', name: '여성 1 (Neural2-A)', gender: 'female', quality: 'Neural2' },
  { id: 'ko-KR-Neural2-B', name: '여성 2 (Neural2-B)', gender: 'female', quality: 'Neural2' },
  { id: 'ko-KR-Neural2-C', name: '남성 (Neural2-C)', gender: 'male', quality: 'Neural2' },
  { id: 'ko-KR-Wavenet-A', name: '여성 1 (Wavenet-A)', gender: 'female', quality: 'Wavenet' },
  { id: 'ko-KR-Wavenet-B', name: '여성 2 (Wavenet-B)', gender: 'female', quality: 'Wavenet' },
  { id: 'ko-KR-Wavenet-C', name: '남성 1 (Wavenet-C)', gender: 'male', quality: 'Wavenet' },
  { id: 'ko-KR-Wavenet-D', name: '남성 2 (Wavenet-D)', gender: 'male', quality: 'Wavenet' },
]

function getClient(): TextToSpeechClient {
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
  if (credentials) {
    return new TextToSpeechClient({
      credentials: JSON.parse(credentials),
    })
  }
  return new TextToSpeechClient()
}

export class GoogleTTSProvider implements TTSProvider {
  id = 'google'
  name = 'Google Cloud TTS'

  async synthesize(text: string, voice: string, options?: TTSSynthesizeOptions): Promise<Buffer> {
    const client = getClient()
    const selectedVoice = this.getVoices().find(v => v.id === voice) ? voice : this.getDefaultVoice()

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'ko-KR',
        name: selectedVoice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: options?.speakingRate ?? 1.0,
        pitch: options?.pitch ?? 0,
      },
    })

    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS')
    }

    return Buffer.from(response.audioContent as Uint8Array)
  }

  getVoices(): TTSVoice[] {
    return GOOGLE_VOICES
  }

  getDefaultVoice(): string {
    return 'ko-KR-Neural2-A'
  }

  getSampleText(): string {
    return '안녕하세요. 나날로그 음성 서비스입니다.'
  }
}

export const googleTTSProvider = new GoogleTTSProvider()
