'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui'
import type { PointSettingKey } from '@/types/points'

type PointSettings = Record<PointSettingKey, number>

const SETTING_LABELS: Record<PointSettingKey, { label: string; description: string }> = {
  points_enabled: { label: '포인트 시스템', description: '전체 포인트 시스템 활성화' },
  streak_enabled: { label: '스트릭 보너스', description: '연속 기록 보너스 활성화' },
  diary_write_points: { label: '일기 작성', description: '일기 작성 시 적립 포인트' },
  first_diary_bonus: { label: '첫 일기 보너스', description: '첫 일기 작성 시 1회 지급' },
  streak_7_bonus: { label: '7일 연속', description: '7일 연속 달성 보너스' },
  streak_14_bonus: { label: '14일 연속', description: '14일 연속 달성 보너스' },
  streak_30_bonus: { label: '30일 연속', description: '30일 연속 달성 보너스' },
  streak_60_bonus: { label: '60일 연속', description: '60일 연속 달성 보너스' },
  streak_100_bonus: { label: '100일 연속', description: '100일 연속 달성 보너스' },
}

export default function AdminPointsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<PointSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedSettings, setEditedSettings] = useState<PointSettings | null>(null)

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/points/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      const data = await response.json()
      setSettings(data.settings)
      setEditedSettings(data.settings)
    } catch (err) {
      toast.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleChange = (key: PointSettingKey, value: number) => {
    if (!editedSettings) return
    setEditedSettings({ ...editedSettings, [key]: value })
  }

  const handleToggle = (key: PointSettingKey) => {
    if (!editedSettings) return
    setEditedSettings({ ...editedSettings, [key]: editedSettings[key] ? 0 : 1 })
  }

  const handleSave = async () => {
    if (!editedSettings) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/points/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: editedSettings }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const data = await response.json()
      setSettings(data.settings)
      setEditedSettings(data.settings)
      toast.success('설정이 저장되었습니다.')
    } catch (err) {
      toast.error('설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = settings && editedSettings &&
    JSON.stringify(settings) !== JSON.stringify(editedSettings)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!editedSettings) {
    return (
      <div className="p-6">
        <p className="text-red-500">설정을 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">포인트 설정</h1>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            hasChanges
              ? 'bg-pastel-purple text-white hover:bg-pastel-purple-dark'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">시스템 설정</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(['points_enabled', 'streak_enabled'] as PointSettingKey[]).map((key) => (
            <div key={key} className="px-4 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">{SETTING_LABELS[key].label}</p>
                <p className="text-sm text-gray-500">{SETTING_LABELS[key].description}</p>
              </div>
              <button
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editedSettings[key] ? 'bg-pastel-purple' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editedSettings[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Basic Earning */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">기본 적립</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(['diary_write_points', 'first_diary_bonus'] as PointSettingKey[]).map((key) => (
            <div key={key} className="px-4 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">{SETTING_LABELS[key].label}</p>
                <p className="text-sm text-gray-500">{SETTING_LABELS[key].description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editedSettings[key]}
                  onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-pastel-purple/50"
                />
                <span className="text-gray-500">P</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak Bonuses */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">스트릭 보너스</h2>
          <p className="text-xs text-gray-500 mt-1">0으로 설정하면 해당 보너스가 비활성화됩니다</p>
        </div>
        <div className="divide-y divide-gray-100">
          {(['streak_7_bonus', 'streak_14_bonus', 'streak_30_bonus', 'streak_60_bonus', 'streak_100_bonus'] as PointSettingKey[]).map((key) => (
            <div key={key} className="px-4 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">{SETTING_LABELS[key].label}</p>
                <p className="text-sm text-gray-500">{SETTING_LABELS[key].description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editedSettings[key]}
                  onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
                  disabled={!editedSettings.streak_enabled}
                  className={`w-24 px-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-pastel-purple/50 ${
                    !editedSettings.streak_enabled ? 'bg-gray-100 text-gray-400' : ''
                  }`}
                />
                <span className="text-gray-500">P</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">포인트 시스템 안내</p>
        <ul className="list-disc list-inside space-y-1 text-blue-600">
          <li>1 포인트 = 1원으로 결제 시 사용 가능</li>
          <li>일기 작성 시 자동으로 포인트가 적립됩니다</li>
          <li>연속 기록 달성 시 추가 보너스가 지급됩니다</li>
        </ul>
      </div>
    </div>
  )
}
