'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const VOICE_OPTIONS = [
  { value: 'ko-KR-Neural2-A', label: '여성 1 (Neural2-A)', gender: '여성', quality: 'Neural2' },
  { value: 'ko-KR-Neural2-B', label: '여성 2 (Neural2-B)', gender: '여성', quality: 'Neural2' },
  { value: 'ko-KR-Neural2-C', label: '남성 (Neural2-C)', gender: '남성', quality: 'Neural2' },
  { value: 'ko-KR-Wavenet-A', label: '여성 1 (Wavenet-A)', gender: '여성', quality: 'Wavenet' },
  { value: 'ko-KR-Wavenet-B', label: '여성 2 (Wavenet-B)', gender: '여성', quality: 'Wavenet' },
  { value: 'ko-KR-Wavenet-C', label: '남성 1 (Wavenet-C)', gender: '남성', quality: 'Wavenet' },
  { value: 'ko-KR-Wavenet-D', label: '남성 2 (Wavenet-D)', gender: '남성', quality: 'Wavenet' },
]

interface VoiceSettingsProps {
  userId: string
  currentVoice: string | null
}

export function VoiceSettings({ userId, currentVoice }: VoiceSettingsProps) {
  const [selectedVoice, setSelectedVoice] = useState(currentVoice || 'ko-KR-Neural2-A')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: userId, tts_voice: selectedVoice },
          { onConflict: 'user_id' }
        )

      if (error) throw error

      setMessage({ type: 'success', text: '저장되었습니다.' })
    } catch (error) {
      console.error('Failed to save voice setting:', error)
      setMessage({ type: 'error', text: '저장에 실패했습니다. DB에 tts_voice 컬럼이 있는지 확인해주세요.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)

    try {
      const response = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '안녕하세요. 이 음성이 마음에 드시나요?',
          voice: selectedVoice,
        }),
      })

      if (!response.ok) throw new Error('TTS failed')

      const data = await response.json()
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`)
      await audio.play()
    } catch (error) {
      console.error('Failed to test voice:', error)
      setMessage({ type: 'error', text: '음성 테스트에 실패했습니다.' })
    } finally {
      setTesting(false)
    }
  }

  const currentOption = VOICE_OPTIONS.find((v) => v.value === selectedVoice)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-2">
          AI 음성 선택
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="w-full rounded-xl border border-pastel-pink px-3 py-2 text-gray-700 focus:border-pastel-purple focus:outline-none focus:ring-1 focus:ring-pastel-purple bg-white"
        >
          <optgroup label="Neural2 (최고 품질)">
            {VOICE_OPTIONS.filter((v) => v.quality === 'Neural2').map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Wavenet (좋은 품질)">
            {VOICE_OPTIONS.filter((v) => v.quality === 'Wavenet').map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
              </option>
            ))}
          </optgroup>
        </select>
        {currentOption && (
          <p className="mt-1 text-sm text-gray-500">
            {currentOption.gender} / {currentOption.quality} 음성
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="rounded-full border border-pastel-purple px-4 py-2 text-sm font-medium text-pastel-purple hover:bg-pastel-purple-light transition-all disabled:opacity-50"
        >
          {testing ? '재생 중...' : '미리 듣기'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || selectedVoice === currentVoice}
          className="rounded-full bg-pastel-purple px-4 py-2 text-sm font-medium text-white hover:bg-pastel-purple-dark transition-all disabled:opacity-50"
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
