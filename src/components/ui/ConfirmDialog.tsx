'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react'
import { ExclamationTriangleIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

// Types
interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

// Context
const ConfirmContext = createContext<ConfirmContextValue | null>(null)

// Hook
export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

// Provider
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolveRef.current?.(true)
    resolveRef.current = null
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }

  const variantStyles = {
    danger: {
      icon: <TrashIcon className="w-6 h-6 text-red-500" />,
      iconBg: 'bg-red-100',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />,
      iconBg: 'bg-yellow-100',
      confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    default: {
      icon: <QuestionMarkCircleIcon className="w-6 h-6 text-gray-500" />,
      iconBg: 'bg-gray-100',
      confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
  }

  const variant = options?.variant || 'default'
  const style = variantStyles[variant]

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Dialog Modal */}
      {isOpen && options && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full animate-scale-in">
            <div className="p-6">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center mx-auto mb-4`}>
                {style.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {options.title}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {options.message}
              </p>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {options.cancelText || '취소'}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${style.confirmBtn}`}
                >
                  {options.confirmText || '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
