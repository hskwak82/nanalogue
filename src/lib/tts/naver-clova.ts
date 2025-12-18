// Naver Clova Voice API Provider
// API Docs: https://api.ncloud-docs.com/docs/ai-naver-clovavoice

import type { TTSProvider, TTSVoice, TTSSynthesizeOptions } from './types'

const NAVER_VOICES: TTSVoice[] = [
  // Standard voices
  { id: 'nara', name: '나라 (여성)', gender: 'female' },
  { id: 'nminsang', name: '민상 (남성)', gender: 'male' },
  { id: 'nihyun', name: '이현 (여성)', gender: 'female' },
  { id: 'njiyun', name: '지윤 (여성)', gender: 'female' },
  { id: 'njinho', name: '진호 (남성)', gender: 'male' },
  { id: 'njoonyoung', name: '준영 (남성)', gender: 'male' },
  { id: 'nsunkyung', name: '선경 (여성)', gender: 'female' },
  { id: 'nyujin', name: '유진 (여성)', gender: 'female' },
  // Character voices
  { id: 'nmeow', name: '야옹이 (아동)', gender: 'female' },
  { id: 'nnarae', name: '나래 (뉴스)', gender: 'female' },
  { id: 'ngoeun', name: '고은 (차분)', gender: 'female' },
  { id: 'neunyoung', name: '은영 (상담)', gender: 'female' },
  { id: 'nsunhee', name: '선희 (밝음)', gender: 'female' },
  // Premium voices (may require premium plan)
  { id: 'vdain', name: '다인 프리미엄', gender: 'female', premium: true },
  { id: 'vhyeri', name: '혜리 프리미엄', gender: 'female', premium: true },
  { id: 'vyuna', name: '유나 프리미엄', gender: 'female', premium: true },
  { id: 'vgoeun', name: '고은 프리미엄', gender: 'female', premium: true },
  { id: 'vdaeseong', name: '대성 프리미엄', gender: 'male', premium: true },
]

const NAVER_TTS_ENDPOINT = 'https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts'

export class NaverClovaTTSProvider implements TTSProvider {
  id = 'naver'
  name = 'Naver Clova Voice'

  private getCredentials() {
    const clientId = process.env.NAVER_CLOUD_CLIENT_ID
    const clientSecret = process.env.NAVER_CLOUD_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Naver Cloud credentials not configured')
    }

    return { clientId, clientSecret }
  }

  async synthesize(text: string, voice: string, options?: TTSSynthesizeOptions): Promise<Buffer> {
    const { clientId, clientSecret } = this.getCredentials()
    const selectedVoice = this.getVoices().find(v => v.id === voice) ? voice : this.getDefaultVoice()

    // Naver expects volume as integer: -5 to 5, speed: -5 to 5
    // Note: Naver API speed is inverted - negative is faster, positive is slower
    const volume = Math.round((options?.volume ?? 0) * 5)
    const speed = Math.round((1 - (options?.speakingRate ?? 1)) * 5)
    const pitch = Math.round((options?.pitch ?? 0) * 5)

    const params = new URLSearchParams({
      speaker: selectedVoice,
      text: text,
      volume: volume.toString(),
      speed: speed.toString(),
      pitch: pitch.toString(),
      format: 'mp3',
    })

    const response = await fetch(NAVER_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Naver TTS API error: ${response.status} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  getVoices(): TTSVoice[] {
    return NAVER_VOICES
  }

  getDefaultVoice(): string {
    return 'nara'
  }

  getSampleText(): string {
    return '안녕하세요. 나날로그 음성 서비스입니다.'
  }
}

export const naverClovaTTSProvider = new NaverClovaTTSProvider()
