'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, DollarSign } from 'lucide-react'

interface PaymentNotificationProps {
  show: boolean
  type: 'success' | 'error' | 'processing'
  message: string
  amount?: string
  onClose?: () => void
}

export default function PaymentNotification({ 
  show, 
  type, 
  message, 
  amount, 
  onClose 
}: PaymentNotificationProps) {
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    setIsVisible(show)
    
    if (show && type === 'success') {
      // Auto-hide success notifications after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [show, type, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'processing':
        return <DollarSign className="w-5 h-5 text-blue-400 animate-pulse" />
      default:
        return <DollarSign className="w-5 h-5 text-gray-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/50'
      case 'error':
        return 'bg-red-500/20 border-red-500/50'
      case 'processing':
        return 'bg-blue-500/20 border-blue-500/50'
      default:
        return 'bg-gray-500/20 border-gray-500/50'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`${getBgColor()} border rounded-xl p-4 backdrop-blur-sm shadow-lg max-w-sm`}>
            <div className="flex items-center space-x-3">
              {getIcon()}
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{message}</p>
                {amount && (
                  <p className="text-gray-300 text-xs mt-1">Amount: ${amount}</p>
                )}
              </div>
              {type !== 'processing' && onClose && (
                <button
                  onClick={() => {
                    setIsVisible(false)
                    onClose()
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}