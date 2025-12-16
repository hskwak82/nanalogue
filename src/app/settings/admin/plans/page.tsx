'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui'
import type { SubscriptionPlan } from '@/app/api/admin/plans/route'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

interface EditingPlan {
  id: string
  name: string
  price: number
  features: string[]
}

export default function AdminPlansPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingPlan | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans')
      if (!response.ok) {
        throw new Error('Failed to fetch plans')
      }
      const data = await response.json()
      setPlans(data.plans)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditing({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      features: [...plan.features],
    })
  }

  const handleCancel = () => {
    setEditing(null)
  }

  const handleSave = async () => {
    if (!editing) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })

      if (!response.ok) {
        throw new Error('Failed to update plan')
      }

      await fetchPlans()
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleFeatureChange = (index: number, value: string) => {
    if (!editing) return
    const newFeatures = [...editing.features]
    newFeatures[index] = value
    setEditing({ ...editing, features: newFeatures })
  }

  const handleAddFeature = () => {
    if (!editing) return
    setEditing({ ...editing, features: [...editing.features, ''] })
  }

  const handleRemoveFeature = (index: number) => {
    if (!editing) return
    const newFeatures = editing.features.filter((_, i) => i !== index)
    setEditing({ ...editing, features: newFeatures })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        플랜을 불러오는데 실패했습니다: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isEditing = editing?.id === plan.id

          return (
            <div
              key={plan.id}
              className={`rounded-xl bg-white p-6 shadow-sm border ${
                plan.id === 'pro' ? 'border-indigo-200' : 'border-gray-100'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="text-lg font-bold text-gray-900 border border-gray-200 rounded px-2 py-1"
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  )}
                  <p className="text-sm text-gray-500">{plan.id}</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="mb-6">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₩</span>
                    <input
                      type="number"
                      value={editing.price}
                      onChange={(e) => setEditing({ ...editing, price: parseInt(e.target.value) || 0 })}
                      className="text-3xl font-bold text-gray-900 border border-gray-200 rounded px-2 py-1 w-32"
                    />
                    <span className="text-gray-500">/월</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price === 0 ? '무료' : formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && <span className="text-gray-500">/월</span>}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">기능</p>
                {isEditing ? (
                  <div className="space-y-2">
                    {editing.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => handleFeatureChange(index, e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1"
                        />
                        <button
                          onClick={() => handleRemoveFeature(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddFeature}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      + 기능 추가
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckIcon className="h-4 w-4 text-green-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Status */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    plan.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {plan.is_active ? '활성' : '비활성'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">참고</p>
        <p>플랜 ID(free, pro)는 변경할 수 없습니다. 가격이나 기능 목록을 수정하면 즉시 반영됩니다.</p>
      </div>
    </div>
  )
}
