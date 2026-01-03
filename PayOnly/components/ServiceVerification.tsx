'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, ChevronRight, Loader2, AlertCircle, DollarSign } from 'lucide-react'
import { verifyService, ServiceData } from '@/lib/envio'
import { useRouter } from 'next/navigation'
import { useFlexPassSession } from '@/hooks/useFlexPassSession'
import { useAccount } from 'wagmi'
import { USDC_CONTRACT_ADDRESS } from '@/lib/contracts'

interface ServiceVerificationProps {
  serviceId: string
  onClose: () => void
}

export default function ServiceVerification({ serviceId, onClose }: ServiceVerificationProps) {
  const [service, setService] = useState<ServiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sliderValue, setSliderValue] = useState(0)
  const [step, setStep] = useState<'verify' | 'approve' | 'start'>('verify')
  
  const router = useRouter()
  const { isConnected } = useAccount()
  const {
    approveUSDC,
    startSession,
    calculateEstimatedCost,
    canStartSession,
    usdcBalance,
    usdcAllowance,
    usdcDecimals,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: contractError,
    currentSession
  } = useFlexPassSession()

  useEffect(() => {
    const loadService = async () => {
      try {
        setLoading(true)
        const serviceData = await verifyService(serviceId)
        setService(serviceData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify service')
      } finally {
        setLoading(false)
      }
    }

    loadService()
  }, [serviceId])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Handle successful transactions
  useEffect(() => {
    console.log('🔄 Transaction status changed:', { isSuccess, step, currentSession })
    
    if (isSuccess && step === 'approve') {
      console.log('✅ USDC approval successful, moving to start step')
      setStep('start')
    } else if (isSuccess && step === 'start' && currentSession) {
      console.log('✅ Session start successful, navigating to session page')
      console.log('Session data:', currentSession)
      
      // Save session to localStorage for active services page
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('flexpass-active-sessions')
          const sessions = saved ? JSON.parse(saved) : []
          
          const sessionData = {
            sessionId: currentSession.sessionId,
            provider: currentSession.provider,
            customer: currentSession.customer,
            startTime: currentSession.startTime,
            isActive: currentSession.isActive,
            serviceName: service?.name,
            serviceType: service?.type === 'GYM' ? 0 : service?.type === 'WIFI' ? 1 : service?.type === 'POWER' ? 2 : 3,
            rate: service?.rate
          }
          
          // Add session if it doesn't exist
          if (!sessions.find((s: any) => s.sessionId === currentSession.sessionId)) {
            sessions.push(sessionData)
            localStorage.setItem('flexpass-active-sessions', JSON.stringify(sessions))
            console.log('💾 Session saved to localStorage')
          }
        } catch (error) {
          console.error('Error saving session:', error)
        }
      }
      
      // Create a shorter session ID for the URL (first 8 characters after 0x)
      const shortSessionId = currentSession.sessionId.slice(2, 10)
      const sessionUrl = `/session/${shortSessionId}?serviceId=${serviceId}`
      
      console.log('🔗 Navigating to:', sessionUrl)
      
      // Navigate to session page
      router.push(sessionUrl)
    }
  }, [isSuccess, step, currentSession, router, serviceId, service])

  const handleAuthorize = async () => {
    if (!service || !isConnected || sliderValue < 90) return

    console.log('🚀 Starting authorization process...')
    console.log('Service:', service)
    console.log('Service ID (should be provider address):', serviceId)
    console.log('Connected:', isConnected)
    console.log('Slider value:', sliderValue)

    // Check if serviceId is a valid Ethereum address (provider address)
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(serviceId)
    console.log('Is serviceId a valid address?', isValidAddress)

    if (!isValidAddress) {
      console.error('❌ ServiceId is not a valid Ethereum address:', serviceId)
      alert('Invalid service provider address. Please scan a valid merchant QR code.')
      return
    }

    // For recurring payments, approve for estimated 24 hours of usage
    const estimatedHours = 24
    const estimatedCost = calculateEstimatedCost(service.rate, estimatedHours * 60)
    console.log('Estimated cost for 24 hours:', estimatedCost)
    console.log('Can start session:', canStartSession(estimatedCost))
    console.log('USDC Balance:', usdcBalance)
    console.log('USDC Allowance:', usdcAllowance)
    
    if (!canStartSession(estimatedCost)) {
      // Need to approve USDC first - approve for 24 hours of usage
      console.log('❌ Need to approve USDC for recurring payments (24h estimate)')
      setStep('approve')
      try {
        console.log('💰 Approving USDC for recurring payments...')
        await approveUSDC(estimatedCost)
      } catch (err) {
        console.error('❌ Approval failed:', err)
      }
    } else {
      // Can start session directly
      console.log('✅ Starting session directly...')
      setStep('start')
      try {
        console.log('🎯 Calling startSession with provider address:', serviceId)
        await startSession(serviceId)
      } catch (err) {
        console.error('❌ Session start failed:', err)
      }
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(e.target.value))
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      >
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full border border-gray-700">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="w-6 h-6 text-electric-blue animate-spin" />
            <span className="text-white font-medium">Verifying Service...</span>
          </div>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      >
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full border border-red-500/50">
          <div className="text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Verification Failed</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-800 border border-gray-600 rounded-xl text-white font-medium hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (!service) return null

  const estimatedCost = calculateEstimatedCost(service.rate, 60)
  const hasBalance = parseFloat(usdcBalance) >= parseFloat(estimatedCost)
  const hasAllowance = parseFloat(usdcAllowance) >= parseFloat(estimatedCost)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose} // Click backdrop to close
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[85vh] border border-gray-700 relative flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        {/* Close Button - Fixed position at top */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-all duration-200 z-20 border border-gray-600 shadow-lg"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 py-8">
          {/* Service Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">{service.icon}</div>
            <h2 className="text-2xl font-bold text-white mb-1">{service.name}</h2>
            <p className="text-gray-400">{service.description}</p>
          </div>

          {/* Verification Badge */}
          <div className="flex items-center justify-center space-x-2 mb-6 p-3 bg-neon-green/10 border border-neon-green/30 rounded-xl">
            <Shield className="w-5 h-5 text-neon-green" />
            <span className="text-neon-green font-medium">
              {service.verified ? 'Verified by FlexPass' : 'Custom Service'}
            </span>
          </div>

          {/* Rate Information */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Rate</span>
              <span className="text-white font-space text-xl">${service.rate}{service.rateUnit}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Provider</span>
              <span className="text-white font-medium">{service.provider}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Est. Cost (24hr)</span>
              <span className="text-white font-medium">${calculateEstimatedCost(service.rate, 24 * 60)}</span>
            </div>
          </div>

          {/* USDC Balance Check */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-3">
              <DollarSign className="w-5 h-5 text-electric-blue" />
              <span className="text-white font-medium">USDC Balance</span>
              <span className="text-xs text-gray-400">({usdcDecimals} decimals)</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Available</span>
                <span className={`font-medium ${hasBalance ? 'text-green-400' : 'text-red-400'}`}>
                  ${parseFloat(usdcBalance).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Allowance</span>
                <span className={`font-medium ${hasAllowance ? 'text-green-400' : 'text-yellow-400'}`}>
                  ${parseFloat(usdcAllowance).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Contract</span>
                <span className="text-gray-400 text-xs font-mono">
                  {USDC_CONTRACT_ADDRESS.slice(0, 6)}...{USDC_CONTRACT_ADDRESS.slice(-4)}
                </span>
              </div>
            </div>
            
            {!hasBalance && (
              <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-xs">
                  ⚠️ Insufficient USDC balance. Please add funds to your wallet.
                </p>
              </div>
            )}
          </div>

          {/* Authorization Slider */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-medium">Slide to Authorize</span>
              <span className="text-gray-400 text-sm">{sliderValue}%</span>
            </div>
            
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={handleSliderChange}
                disabled={!hasBalance}
                className="w-full h-12 bg-gray-800 rounded-xl appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, ${service.color} 0%, ${service.color} ${sliderValue}%, #374151 ${sliderValue}%, #374151 100%)`
                }}
              />
              
              <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                <span className="text-white font-medium">
                  {sliderValue < 90 ? 'Slide to Authorize' : 'Release to Confirm'}
                </span>
                <ChevronRight className={`w-5 h-5 transition-colors ${sliderValue >= 90 ? 'text-white' : 'text-gray-500'}`} />
              </div>
            </div>
          </div>

          {/* Authorize Button */}
          <motion.button
            onClick={handleAuthorize}
            disabled={sliderValue < 90 || !hasBalance || isPending || isConfirming}
            className={`w-full py-4 rounded-xl font-medium transition-all duration-300 ${
              sliderValue >= 90 && hasBalance && !isPending && !isConfirming
                ? `bg-gradient-to-r from-${service.color}/20 to-${service.color}/10 border-2 text-white hover:from-${service.color}/30 hover:to-${service.color}/20`
                : 'bg-gray-800 border border-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            style={{
              borderColor: sliderValue >= 90 && hasBalance ? service.color : undefined,
            }}
            whileTap={sliderValue >= 90 && hasBalance ? { scale: 0.98 } : {}}
          >
            {isPending || isConfirming ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {step === 'approve' ? 'Approving USDC...' : 'Starting Session...'}
                </span>
              </div>
            ) : (
              <>
                {step === 'approve' ? '🔄 Setup Recurring Payments' : '🚀 Start Pay-As-You-Go Session'}
              </>
            )}
          </motion.button>

          {/* Debug Info */}
          {contractError && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
              <h4 className="text-red-400 font-medium mb-2">❌ Transaction Failed</h4>
              <details className="text-red-300 text-xs">
                <summary className="cursor-pointer">Click to see error details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {JSON.stringify(contractError, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Transaction Status */}
          {hash && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-xl">
              <h4 className="text-green-400 font-medium mb-2">📝 Transaction Status</h4>
              <div className="text-green-300 text-xs space-y-1">
                <div>Hash: {hash.slice(0, 10)}...{hash.slice(-8)}</div>
                <div>Status: {isPending ? 'Pending...' : isConfirming ? 'Confirming...' : isSuccess ? 'Success!' : 'Unknown'}</div>
                <div>Step: {step}</div>
              </div>
              {isSuccess && step === 'start' && (
                <button
                  onClick={() => {
                    const shortSessionId = currentSession?.sessionId.slice(2, 10)
                    router.push(`/session/${shortSessionId}?serviceId=${serviceId}`)
                  }}
                  className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs"
                >
                  Go to Session
                </button>
              )}
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full py-3 mt-4 bg-gray-800 border border-gray-600 rounded-xl text-gray-300 font-medium hover:bg-gray-700 hover:text-white transition-all duration-200"
          >
            Cancel
          </button>

          {/* Security Notice */}
          <p className="text-xs text-gray-500 text-center mt-4">
            {step === 'approve' 
              ? '🔄 Setting up recurring payments. You need to approve USDC spending for automatic charging during your session.'
              : '💳 Recurring payments are active. You will be charged automatically every minute while using the service. You can end the session at any time.'
            }
          </p>
        </div>
      </motion.div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid ${service.color};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid ${service.color};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </motion.div>
  )
}