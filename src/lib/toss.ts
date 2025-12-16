// Toss Payments API Client

import type {
  TossBillingKeyResponse,
  TossPaymentResponse,
  TossErrorResponse,
} from '@/types/payment'

const TOSS_API_URL = 'https://api.tosspayments.com/v1'

// Get Basic Auth header
function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    throw new Error('TOSS_SECRET_KEY is not configured')
  }
  const encoded = Buffer.from(`${secretKey}:`).toString('base64')
  return `Basic ${encoded}`
}

// Issue billing key from auth key
export async function issueBillingKey(
  authKey: string,
  customerKey: string
): Promise<TossBillingKeyResponse> {
  const response = await fetch(`${TOSS_API_URL}/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authKey,
      customerKey,
    }),
  })

  if (!response.ok) {
    const error: TossErrorResponse = await response.json()
    throw new Error(error.message || 'Failed to issue billing key')
  }

  return response.json()
}

// Approve recurring payment with billing key
export async function approveBillingPayment(
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string
): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey,
      amount,
      orderId,
      orderName,
    }),
  })

  if (!response.ok) {
    const error: TossErrorResponse = await response.json()
    throw new Error(error.message || 'Failed to approve payment')
  }

  return response.json()
}

// Cancel payment
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string
): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cancelReason,
    }),
  })

  if (!response.ok) {
    const error: TossErrorResponse = await response.json()
    throw new Error(error.message || 'Failed to cancel payment')
  }

  return response.json()
}

// Get payment details
export async function getPayment(paymentKey: string): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
    },
  })

  if (!response.ok) {
    const error: TossErrorResponse = await response.json()
    throw new Error(error.message || 'Failed to get payment')
  }

  return response.json()
}

// Generate unique order ID
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `order_${timestamp}_${random}`
}

// Get card company name in Korean
export function getCardCompanyName(issuerCode: string): string {
  const cardCompanies: Record<string, string> = {
    '3K': '기업BC',
    '46': '광주',
    '71': '롯데',
    '30': 'KDB산업',
    '31': 'BC',
    '51': '삼성',
    '38': '새마을',
    '41': '신한',
    '62': '신협',
    '36': '씨티',
    '33': '우리',
    '37': '우체국',
    '39': '저축',
    '35': '전북',
    '42': '제주',
    '15': '카카오뱅크',
    '3A': '케이뱅크',
    '24': '토스뱅크',
    '21': '하나',
    '61': '현대',
    '11': 'KB국민',
    '91': 'NH농협',
    '34': 'Sh수협',
  }
  return cardCompanies[issuerCode] || '기타'
}
