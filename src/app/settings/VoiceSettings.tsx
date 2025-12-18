'use client'

import { useState, useEffect, useRef } from 'react'
import { PlayIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { BoltIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'

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

interface TTSSettings {
  conversationMode: 'classic' | 'realtime'
  provider: {
    id: string
    name: string
  }
  voices: TTSVoice[]
  realtimeVoices: RealtimeVoice[]
  systemDefaults: {
    voice: string
    speakingRate: number
    realtimeVoice: string
  }
  userSettings: {
    voice: string | null
    speakingRate: number | null
    realtimeVoice: string | null
  } | null
  effective: {
    voice: string
    speakingRate: number
    realtimeVoice: string
  }
}

interface VoiceSettingsProps {
  userId: string
  currentVoice: string | null
}

export function VoiceSettings({ userId, currentVoice }: VoiceSettingsProps) {
  const [settings, setSettings] = useState<TTSSettings | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [selectedRate, setSelectedRate] = useState<number | null>(null)
  const [selectedRealtimeVoice, setSelectedRealtimeVoice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const response = await fetch('/api/tts/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: TTSSettings = await response.json()
      setSettings(data)
      // Initialize with user settings (or null to use system defaults)
      setSelectedVoice(data.userSettings?.voice ?? null)
      setSelectedRate(data.userSettings?.speakingRate ?? null)
      setSelectedRealtimeVoice(data.userSettings?.realtimeVoice ?? null)
    } catch (error) {
      console.error('Error fetching TTS settings:', error)
      setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const hasChanges = () => {
    if (!settings) return false
    const originalVoice = settings.userSettings?.voice ?? null
    const originalRate = settings.userSettings?.speakingRate ?? null
    const originalRealtimeVoice = settings.userSettings?.realtimeVoice ?? null
    return (
      selectedVoice !== originalVoice ||
      selectedRate !== originalRate ||
      selectedRealtimeVoice !== originalRealtimeVoice
    )
  }

  const effectiveVoice = selectedVoice || settings?.systemDefaults.voice || ''
  const effectiveRate = selectedRate ?? settings?.systemDefaults.speakingRate ?? 1.0

  async function handleSave() {
    if (!hasChanges()) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/tts/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: selectedVoice,
          speakingRate: selectedRate,
          realtimeVoice: selectedRealtimeVoice,
        }),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      await fetchSettings()
      setMessage({ type: 'success', text: '저장되었습니다.' })
    } catch (error) {
      console.error('Failed to save TTS settings:', error)
      setMessage({ type: 'error', text: '저장에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  async function handlePlaySample(voiceId?: string) {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }

    const playKey = voiceId || 'default'
    setPlaying(playKey)

    try {
      const testVoice = voiceId || effectiveVoice
      const response = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '안녕하세요. 이 음성이 마음에 드시나요?',
          voice: testVoice,
          speakingRate: effectiveRate,
        }),
      })

      if (!response.ok) throw new Error('TTS failed')

      const data = await response.json()
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`)
      audioRef.current = audio

      audio.onended = () => setPlaying(null)
      audio.onerror = () => setPlaying(null)

      await audio.play()
    } catch (error) {
      console.error('Failed to play sample:', error)
      setMessage({ type: 'error', text: '음성 테스트에 실패했습니다.' })
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pastel-purple"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-8 text-gray-500">
        설정을 불러올 수 없습니다.
      </div>
    )
  }

  const currentVoiceOption = settings.voices.find(v => v.id === effectiveVoice)
  const effectiveRealtimeVoice = selectedRealtimeVoice || settings.systemDefaults.realtimeVoice

  const isRealtimeMode = settings.conversationMode === 'realtime'

  return (
    <div className="space-y-6">
      {/* Mode Indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isRealtimeMode
          ? 'bg-indigo-50 border border-indigo-200'
          : 'bg-gray-50 border border-gray-200'
      }`}>
        {isRealtimeMode ? (
          <>
            <BoltIcon className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-indigo-700">
              <span className="font-medium">실시간 대화 모드</span>
              <span className="text-indigo-500 ml-1">- OpenAI Realtime API</span>
            </span>
          </>
        ) : (
          <>
            <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">
              <span className="font-medium">클래식 모드</span>
              <span className="text-gray-500 ml-1">- {settings.provider.name}</span>
            </span>
          </>
        )}
      </div>

      {/* Realtime Voice Selection (for realtime mode) */}
      {isRealtimeMode && (
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            AI 음성 선택
          </label>
          <div className="space-y-2">
            {/* Use System Default Option */}
            <div
              onClick={() => setSelectedRealtimeVoice(null)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                selectedRealtimeVoice === null
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div>
                <span className="font-medium text-gray-700">시스템 기본값 사용</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {settings.realtimeVoices.find(v => v.id === settings.systemDefaults.realtimeVoice)?.name || settings.systemDefaults.realtimeVoice}
                  {' - '}
                  {settings.realtimeVoices.find(v => v.id === settings.systemDefaults.realtimeVoice)?.description}
                </p>
              </div>
            </div>

            {/* Individual Realtime Voice Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {settings.realtimeVoices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => setSelectedRealtimeVoice(voice.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedRealtimeVoice === voice.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <span className="font-medium text-gray-700">{voice.name}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{voice.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Classic Mode Settings */}
      {!isRealtimeMode && (
        <>
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              AI 음성 선택
            </label>
            <div className="space-y-2">
              {/* Use System Default Option */}
              <div
                onClick={() => setSelectedVoice(null)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedVoice === null
                    ? 'border-pastel-purple bg-pastel-purple-light'
                    : 'border-gray-200 hover:border-pastel-pink'
                }`}
              >
                <div>
                  <span className="font-medium text-gray-700">시스템 기본값 사용</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {settings.voices.find(v => v.id === settings.systemDefaults.voice)?.name || settings.systemDefaults.voice}
                  </p>
                </div>
              </div>

              {/* Individual Voice Options */}
              <div className="grid grid-cols-1 gap-2 mt-3">
                {settings.voices.map((voice) => (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedVoice === voice.id
                        ? 'border-pastel-purple bg-pastel-purple-light'
                        : 'border-gray-200 hover:border-pastel-pink'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="font-medium text-gray-700">{voice.name}</span>
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
                        handlePlaySample(voice.id)
                      }}
                      disabled={playing !== null}
                      className={`p-1.5 rounded-full transition-all ${
                        playing === voice.id
                          ? 'bg-pastel-purple text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            </div>
          </div>

          {/* Speaking Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              음성 속도
            </label>

            {/* Use System Default Option */}
            <div
              onClick={() => setSelectedRate(null)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all mb-3 ${
                selectedRate === null
                  ? 'border-pastel-purple bg-pastel-purple-light'
                  : 'border-gray-200 hover:border-pastel-pink'
              }`}
            >
              <div>
                <span className="font-medium text-gray-700">시스템 기본값 사용</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {settings.systemDefaults.speakingRate.toFixed(2)}x ({getSpeedLabel(settings.systemDefaults.speakingRate)})
                </p>
              </div>
            </div>

            {/* Custom Rate Slider */}
            {selectedRate !== null && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 w-12">느림</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={selectedRate}
                    onChange={(e) => setSelectedRate(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pastel-purple"
                  />
                  <span className="text-xs text-gray-500 w-12 text-right">빠름</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    현재 속도: <span className="font-semibold text-pastel-purple">{selectedRate.toFixed(2)}x</span>
                    <span className="ml-2 text-gray-400">({getSpeedLabel(selectedRate)})</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSelectedRate(rate)}
                      className={`px-3 py-1 text-xs rounded-lg transition-all ${
                        selectedRate === rate
                          ? 'bg-pastel-purple text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Enable Custom Rate Button */}
            {selectedRate === null && (
              <button
                onClick={() => setSelectedRate(settings.systemDefaults.speakingRate)}
                className="text-xs text-pastel-purple hover:text-pastel-purple-dark"
              >
                직접 속도 설정하기
              </button>
            )}
          </div>

          {/* Action Buttons - Sample playback only for classic mode */}
          <div className="flex gap-3">
            <button
              onClick={() => handlePlaySample()}
              disabled={playing !== null}
              className="rounded-full border border-pastel-purple px-4 py-2 text-sm font-medium text-pastel-purple hover:bg-pastel-purple-light transition-all disabled:opacity-50"
            >
              {playing ? '재생 중...' : '현재 설정으로 듣기'}
            </button>
          </div>
        </>
      )}

      {/* Save Button (both modes) */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges()}
          className={`rounded-full px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50 ${
            isRealtimeMode
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-pastel-purple hover:bg-pastel-purple-dark'
          }`}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === 'success' ? 'text-pastel-mint' : 'text-pastel-peach'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
