'use client'

import { useState, useEffect, useRef } from 'react'
import { SpeakerWaveIcon, PlayIcon, CheckIcon } from '@heroicons/react/24/outline'

interface TTSProviderInfo {
  id: string
  name: string
  description: string
  isActive: boolean
  isDefault: boolean
  voiceCount: number
}

interface TTSVoice {
  id: string
  name: string
  gender: 'male' | 'female'
  quality?: string
  premium?: boolean
}

interface TTSSettings {
  currentProvider: string
  speakingRate: number
  providers: TTSProviderInfo[]
  updatedAt: string | null
  updatedBy: string | null
}

export default function AdminTTSPage() {
  const [settings, setSettings] = useState<TTSSettings | null>(null)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [speakingRate, setSpeakingRate] = useState<number>(1.0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (selectedProvider) {
      fetchVoices(selectedProvider)
    }
  }, [selectedProvider])

  async function fetchSettings() {
    try {
      const response = await fetch('/api/admin/tts')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings(data)
      setSelectedProvider(data.currentProvider)
      setSpeakingRate(data.speakingRate ?? 1.0)
    } catch (error) {
      console.error('Error fetching TTS settings:', error)
      setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchVoices(providerId: string) {
    try {
      const response = await fetch(`/api/admin/tts/voices?provider=${providerId}`)
      if (!response.ok) throw new Error('Failed to fetch voices')
      const data = await response.json()
      setVoices(data.voices)
      setSelectedVoice(data.defaultVoice)
    } catch (error) {
      console.error('Error fetching voices:', error)
      setVoices([])
    }
  }

  const hasChanges = () => {
    if (!settings) return false
    return selectedProvider !== settings.currentProvider || speakingRate !== settings.speakingRate
  }

  async function handleSave() {
    if (!hasChanges()) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/tts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          speakingRate: speakingRate,
        }),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      await fetchSettings()
      setMessage({ type: 'success', text: 'TTS 설정이 저장되었습니다.' })
    } catch (error) {
      console.error('Error saving TTS settings:', error)
      setMessage({ type: 'error', text: '저장에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  async function handlePlaySample(providerId: string, voiceId?: string) {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }

    const playKey = voiceId || providerId
    setPlaying(playKey)

    try {
      const params = new URLSearchParams({ provider: providerId })
      if (voiceId) params.append('voice', voiceId)
      params.append('rate', speakingRate.toString())

      const response = await fetch(`/api/admin/tts/sample?${params}`)
      if (!response.ok) throw new Error('Failed to generate sample')

      const data = await response.json()
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`)
      audioRef.current = audio

      audio.onended = () => setPlaying(null)
      audio.onerror = () => setPlaying(null)

      await audio.play()
    } catch (error) {
      console.error('Error playing sample:', error)
      setMessage({ type: 'error', text: '샘플 재생에 실패했습니다.' })
      setPlaying(null)
    }
  }

  const getSpeedLabel = (rate: number) => {
    if (rate <= 0.7) return '매우 느림'
    if (rate <= 0.9) return '느림'
    if (rate <= 1.1) return '보통'
    if (rate <= 1.3) return '빠름'
    if (rate <= 1.5) return '더 빠름'
    return '매우 빠름'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">TTS 설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          시스템에서 사용할 TTS(Text-to-Speech) 제공자와 속도를 설정하세요.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">TTS 제공자 선택</h2>

        <div className="space-y-4">
          {settings?.providers.map((provider) => (
            <div
              key={provider.id}
              className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedProvider === provider.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedProvider(provider.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{provider.name}</h3>
                  {provider.id === settings.currentProvider && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <CheckIcon className="h-3 w-3 mr-1" />
                      현재 사용중
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{provider.description}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {provider.voiceCount}개 음성 지원
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlaySample(provider.id)
                }}
                disabled={playing !== null}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  playing === provider.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {playing === provider.id ? (
                  <>
                    <SpeakerWaveIcon className="h-4 w-4 animate-pulse" />
                    재생중...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    샘플 듣기
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Speaking Rate */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">음성 속도</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 w-16">느림</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={speakingRate}
              onChange={(e) => setSpeakingRate(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-sm text-gray-500 w-16 text-right">빠름</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              현재 속도: <span className="font-semibold text-indigo-600">{speakingRate.toFixed(2)}x</span>
              <span className="ml-2 text-gray-400">({getSpeedLabel(speakingRate)})</span>
            </span>
            <button
              onClick={() => setSpeakingRate(1.0)}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              기본값으로 초기화
            </button>
          </div>

          <div className="flex gap-2">
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => setSpeakingRate(rate)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  speakingRate === rate
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>

        {message && (
          <span
            className={`text-sm ${
              message.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message.text}
          </span>
        )}
      </div>

      {/* Voice Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          음성 미리듣기 ({settings?.providers.find(p => p.id === selectedProvider)?.name})
        </h2>

        {voices.length === 0 ? (
          <p className="text-sm text-gray-500">음성 목록을 불러오는 중...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">{voice.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {voice.gender === 'male' ? '남성' : '여성'}
                    {voice.quality && ` / ${voice.quality}`}
                    {voice.premium && ' (프리미엄)'}
                  </span>
                </div>
                <button
                  onClick={() => handlePlaySample(selectedProvider, voice.id)}
                  disabled={playing !== null}
                  className={`p-1.5 rounded-full transition-all ${
                    playing === voice.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {playing === voice.id ? (
                    <SpeakerWaveIcon className="h-4 w-4 animate-pulse" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Environment Variables Info */}
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
        <h3 className="font-medium text-amber-800">환경 변수 설정</h3>
        <p className="mt-1 text-sm text-amber-700">
          각 TTS 제공자를 사용하려면 해당 API 키가 환경 변수에 설정되어야 합니다.
        </p>
        <div className="mt-3 text-xs font-mono text-amber-600 space-y-1">
          <p>• Google Cloud: GOOGLE_CLOUD_CREDENTIALS</p>
          <p>• Naver Clova: NAVER_CLOUD_CLIENT_ID, NAVER_CLOUD_CLIENT_SECRET</p>
        </div>
      </div>
    </div>
  )
}
