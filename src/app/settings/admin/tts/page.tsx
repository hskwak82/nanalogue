'use client'

import { useState, useEffect, useRef } from 'react'
import { SpeakerWaveIcon, PlayIcon, CheckIcon, BoltIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

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

interface RealtimeVoice {
  id: string
  name: string
  description: string
}

interface RealtimeProviderInfo {
  id: string
  name: string
  description: string
}

interface TTSSettings {
  conversationMode: 'classic' | 'realtime'
  // Classic mode
  currentProvider: string
  speakingRate: number
  defaultVoice: string | null
  providers: TTSProviderInfo[]
  // Realtime mode
  realtimeProvider: string
  realtimeProviders: RealtimeProviderInfo[]
  realtimeVoice: string
  realtimeVoices: RealtimeVoice[]
  openaiVoices: RealtimeVoice[]
  geminiVoices: RealtimeVoice[]
  realtimeInstructions: string
  // Metadata
  updatedAt: string | null
  updatedBy: string | null
}

export default function AdminTTSPage() {
  const [settings, setSettings] = useState<TTSSettings | null>(null)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  // Mode selection
  const [selectedMode, setSelectedMode] = useState<'classic' | 'realtime'>('classic')
  // Classic mode state
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [speakingRate, setSpeakingRate] = useState<number>(1.0)
  // Realtime mode state
  const [selectedRealtimeProvider, setSelectedRealtimeProvider] = useState<string>('openai')
  const [selectedRealtimeVoice, setSelectedRealtimeVoice] = useState<string>('alloy')
  const [realtimeInstructions, setRealtimeInstructions] = useState<string>('')
  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (selectedProvider && selectedMode === 'classic') {
      fetchVoices(selectedProvider)
    }
  }, [selectedProvider, selectedMode])

  async function fetchSettings() {
    try {
      const response = await fetch('/api/admin/tts')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings(data)
      setSelectedMode(data.conversationMode || 'classic')
      setSelectedProvider(data.currentProvider)
      setSpeakingRate(data.speakingRate ?? 1.0)
      const rtProvider = data.realtimeProvider || 'openai'
      setSelectedRealtimeProvider(rtProvider)
      // Ensure voice matches provider
      const defaultVoice = rtProvider === 'gemini' ? 'Puck' : 'alloy'
      const isVoiceValid = rtProvider === 'gemini'
        ? data.geminiVoices?.some((v: RealtimeVoice) => v.id === data.realtimeVoice)
        : data.openaiVoices?.some((v: RealtimeVoice) => v.id === data.realtimeVoice)
      setSelectedRealtimeVoice(isVoiceValid ? data.realtimeVoice : defaultVoice)
      setRealtimeInstructions(data.realtimeInstructions || '')
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
      if (settings?.defaultVoice && data.voices.some((v: TTSVoice) => v.id === settings.defaultVoice)) {
        setSelectedVoice(settings.defaultVoice)
      } else {
        setSelectedVoice(data.defaultVoice)
      }
    } catch (error) {
      console.error('Error fetching voices:', error)
      setVoices([])
    }
  }

  const hasChanges = () => {
    if (!settings) return false

    const modeChanged = selectedMode !== settings.conversationMode

    if (selectedMode === 'classic') {
      return (
        modeChanged ||
        selectedProvider !== settings.currentProvider ||
        speakingRate !== settings.speakingRate ||
        selectedVoice !== (settings.defaultVoice || '')
      )
    } else {
      return (
        modeChanged ||
        selectedRealtimeProvider !== settings.realtimeProvider ||
        selectedRealtimeVoice !== settings.realtimeVoice ||
        realtimeInstructions !== (settings.realtimeInstructions || '')
      )
    }
  }

  async function handleSave() {
    if (!hasChanges()) return

    setSaving(true)
    setMessage(null)

    try {
      const body: Record<string, unknown> = {
        conversationMode: selectedMode,
      }

      if (selectedMode === 'classic') {
        body.provider = selectedProvider
        body.speakingRate = speakingRate
        body.defaultVoice = selectedVoice
      } else {
        body.realtimeProvider = selectedRealtimeProvider
        body.realtimeVoice = selectedRealtimeVoice
        body.realtimeInstructions = realtimeInstructions
      }

      const response = await fetch('/api/admin/tts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      await fetchSettings()
      setMessage({ type: 'success', text: '설정이 저장되었습니다.' })
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
        <h1 className="text-2xl font-bold text-gray-900">음성 대화 설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI와의 음성 대화 방식을 설정합니다.
        </p>
      </div>

      {/* Conversation Mode Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">대화 모드</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Classic Mode */}
          <div
            onClick={() => setSelectedMode('classic')}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedMode === 'classic'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${selectedMode === 'classic' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <ChatBubbleLeftRightIcon className={`h-6 w-6 ${selectedMode === 'classic' ? 'text-indigo-600' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">클래식 모드</h3>
                  {settings?.conversationMode === 'classic' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <CheckIcon className="h-3 w-3 mr-1" />
                      현재
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  기존 방식: 음성인식 → AI 응답 → 음성합성
                </p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• Google Cloud TTS / Naver Clova 지원</li>
                  <li>• 다양한 음성 선택 가능</li>
                  <li>• 비용 효율적</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Realtime Mode */}
          <div
            onClick={() => setSelectedMode('realtime')}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedMode === 'realtime'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${selectedMode === 'realtime' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <BoltIcon className={`h-6 w-6 ${selectedMode === 'realtime' ? 'text-indigo-600' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">실시간 모드</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    NEW
                  </span>
                  {settings?.conversationMode === 'realtime' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <CheckIcon className="h-3 w-3 mr-1" />
                      현재
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  OpenAI Realtime API: 자연스러운 실시간 대화
                </p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• 300ms 미만 지연시간</li>
                  <li>• 자연스러운 끼어들기 지원</li>
                  <li>• 실제 대화처럼 자연스러움</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classic Mode Settings */}
      {selectedMode === 'classic' && (
        <>
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
                      {provider.id === settings.currentProvider && settings.conversationMode === 'classic' && (
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

          {/* Default Voice Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              기본 음성 ({settings?.providers.find(p => p.id === selectedProvider)?.name})
            </h2>

            {voices.length === 0 ? (
              <p className="text-sm text-gray-500">음성 목록을 불러오는 중...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      selectedVoice === voice.id
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedVoice === voice.id && (
                        <CheckIcon className="h-4 w-4 text-indigo-600" />
                      )}
                      <div>
                        <span className="font-medium text-gray-900">{voice.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {voice.gender === 'male' ? '남성' : '여성'}
                          {voice.quality && ` / ${voice.quality}`}
                          {voice.premium && ' (프리미엄)'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlaySample(selectedProvider, voice.id)
                      }}
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

          {/* Speaking Rate */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 음성 속도</h2>

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
        </>
      )}

      {/* Realtime Mode Settings */}
      {selectedMode === 'realtime' && (
        <>
          {/* Provider Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">실시간 대화 제공자</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings?.realtimeProviders.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => {
                    setSelectedRealtimeProvider(provider.id)
                    // Reset voice to default for the new provider
                    const defaultVoice = provider.id === 'gemini' ? 'Puck' : 'alloy'
                    setSelectedRealtimeVoice(defaultVoice)
                  }}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRealtimeProvider === provider.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {selectedRealtimeProvider === provider.id && (
                      <CheckIcon className="h-4 w-4 text-indigo-600" />
                    )}
                    <span className="font-medium text-gray-900">{provider.name}</span>
                    {provider.id === settings?.realtimeProvider && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        현재
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{provider.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedRealtimeProvider === 'gemini' ? 'Gemini' : 'OpenAI'} 음성 선택
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(selectedRealtimeProvider === 'gemini' ? settings?.geminiVoices : settings?.openaiVoices)?.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => setSelectedRealtimeVoice(voice.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedRealtimeVoice === voice.id
                      ? 'bg-indigo-100 border-2 border-indigo-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {selectedRealtimeVoice === voice.id && (
                      <CheckIcon className="h-4 w-4 text-indigo-600" />
                    )}
                    <span className="font-medium text-gray-900">{voice.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{voice.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* System Instructions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">시스템 프롬프트</h2>
            <p className="text-sm text-gray-500 mb-4">
              AI의 성격과 대화 방식을 설정합니다. 비워두면 기본 설정이 사용됩니다.
            </p>

            <textarea
              value={realtimeInstructions}
              onChange={(e) => setRealtimeInstructions(e.target.value)}
              placeholder="예: 당신은 따뜻하고 친근한 일기 친구입니다. 사용자의 하루에 대해 자연스럽게 대화하며, 공감하고 격려해주세요."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Pricing Info */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h3 className="font-medium text-blue-800">
              {selectedRealtimeProvider === 'gemini' ? 'Google Gemini Live API' : 'OpenAI Realtime API'} 요금
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              실시간 모드는 {selectedRealtimeProvider === 'gemini' ? 'Gemini Live' : 'OpenAI Realtime'} API를 사용합니다.
            </p>
            {selectedRealtimeProvider === 'openai' ? (
              <div className="mt-3 text-xs font-mono text-blue-600 space-y-1">
                <p>• 음성 입력: $0.06 / 분</p>
                <p>• 음성 출력: $0.24 / 분</p>
                <p>• 텍스트 입력: $5 / 1M 토큰</p>
                <p>• 텍스트 출력: $20 / 1M 토큰</p>
              </div>
            ) : (
              <div className="mt-3 text-xs font-mono text-blue-600 space-y-1">
                <p>• Gemini 2.5 Flash: 무료 티어 제공</p>
                <p>• 유료: $0.075 / 1M 입력 토큰</p>
                <p>• 유료: $0.30 / 1M 출력 토큰</p>
              </div>
            )}
          </div>

          {/* Environment Variables Info */}
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <h3 className="font-medium text-amber-800">환경 변수 설정</h3>
            <p className="mt-1 text-sm text-amber-700">
              {selectedRealtimeProvider === 'gemini'
                ? 'Gemini Live API를 사용하려면 Google AI API 키가 필요합니다.'
                : '실시간 모드를 사용하려면 OpenAI API 키가 필요합니다.'}
            </p>
            <div className="mt-3 text-xs font-mono text-amber-600">
              {selectedRealtimeProvider === 'gemini' ? (
                <p>• GOOGLE_AI_API_KEY=AIza...</p>
              ) : (
                <p>• OPENAI_API_KEY=sk-...</p>
              )}
            </div>
          </div>
        </>
      )}

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
    </div>
  )
}
