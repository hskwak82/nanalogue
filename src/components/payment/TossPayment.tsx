'use client'

import { useEffect, useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

type PaymentMode = 'billing' | 'onetime'

interface TossPaymentProps {
  onClose: () => void
  customerKey: string
  mode?: PaymentMode
  amount?: number
  orderName?: string
}

export function TossPayment({
  onClose,
  customerKey,
  mode = 'billing',
  amount = 4900,
  orderName = '나날로그 프로 구독'
}: TossPaymentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [payment, setPayment] = useState<any>(null)

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || ''

  useEffect(() => {
    async function initPayment() {
      try {
        const tossPayments = await loadTossPayments(clientKey)
        const paymentInstance = tossPayments.payment({ customerKey })
        setPayment(paymentInstance)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to init Toss:', err)
        setError(err instanceof Error ? err.message : '토스 페이먼츠 초기화 실패')
        setIsLoading(false)
      }
    }

    initPayment()
  }, [clientKey, customerKey])

  // 자동결제용 빌링키 발급
  const handleBillingAuth = async () => {
    if (!payment) {
      setError('토스 페이먼츠가 준비되지 않았습니다.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = window.location.origin

      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${baseUrl}/api/payments/billing-callback?customerKey=${customerKey}`,
        failUrl: `${baseUrl}/settings?payment_error=true`,
        customerEmail: 'customer@example.com',
        customerName: '고객',
      })
    } catch (err) {
      console.error('Billing auth error:', err)
      setError(err instanceof Error ? err.message : '카드 등록 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  // 일반 결제 (1회성)
  const handleOneTimePayment = async () => {
    if (!payment) {
      setError('토스 페이먼츠가 준비되지 않았습니다.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = window.location.origin
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

      await payment.requestPayment({
        method: 'CARD',
        amount: {
          currency: 'KRW',
          value: amount,
        },
        orderId,
        orderName,
        successUrl: `${baseUrl}/api/payments/confirm?customerKey=${customerKey}`,
        failUrl: `${baseUrl}/settings?payment_error=true`,
        customerEmail: 'customer@example.com',
        customerName: '고객',
        card: {
          useEscrow: false,
          flowMode: 'DEFAULT',
          useCardPoint: false,
          useAppCardOnly: false,
        },
      })
    } catch (err) {
      console.error('Payment error:', err)
      setError(err instanceof Error ? err.message : '결제 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handlePayment = mode === 'billing' ? handleBillingAuth : handleOneTimePayment

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {mode === 'billing' ? '결제 수단 등록' : '프로 플랜 결제'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {clientKey?.startsWith('test_') && (
          <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm mb-4">
            <p className="font-medium">테스트 모드</p>
            <p className="text-xs mt-1">
              실제 결제가 이루어지지 않습니다.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {mode === 'billing' ? (
          <p className="text-sm text-gray-600 mb-6">
            카드를 등록하면 매월 자동으로 결제됩니다.
            <br />
            <span className="text-xs text-gray-400">(자동결제 계약 필요)</span>
          </p>
        ) : (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              프로 플랜 1개월 이용권을 결제합니다.
            </p>
            <p className="text-2xl font-bold text-pastel-purple">
              ₩{amount.toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handlePayment}
            disabled={isLoading || !payment}
            className="flex-1 py-3 bg-pastel-purple text-white rounded-full hover:bg-pastel-purple-dark disabled:opacity-50"
          >
            {isLoading ? '로딩 중...' : mode === 'billing' ? '카드 등록하기' : '결제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
