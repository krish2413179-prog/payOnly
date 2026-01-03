'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap, MapPin, Wifi, AlertTriangle, CheckCircle, X, Settings } from 'lucide-react'
import { verifyService, ServiceData } from '@/lib/envio'
import { useBatterySensor } from '@/hooks/useBatterySensor'
import { useGeoFence } from '@/hooks/useGeoFence'
import { useFlexPassSession } from '@/hooks/useFlexPassSession'
import RecurringPaymentManager from '@/components/RecurringPaymentManager'
import PaymentNotification from '@/components/PaymentNotification'

interface SessionPageProps {
  params: { id: string }
}

export default function SessionPage({ params }: SessionPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  const [service, setService] = useState<ServiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionStartTime] = useState(Date.now())
  const [currentCost, setCurrentCost] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [showEndModal, setShowEndModal] = useState(false)
  const [endReason, setEndReason] = useState<string>('')
  const [recurringCharges, setRecurringCharges] = useState<number>(0)
  const [lastPaymentTime, setLastPaymentTime] = useState<Date | null>(null)
  const [showPaymentNotification, setShowPaymentNotification] = useState(false)
  const [currentConditions, setCurrentConditions] = useState<Record<string, any>>({})
  const [paymentNotification, setPaymentNotification] = useState<{
    type: 'success' | 'error' | 'processing'
    message: string
    amount?: string
  }>({ type: 'success', message: '' })

  // Import the FlexPass session hook
  const { endSession, isPending, isConfirming, isSuccess } = useFlexPassSession()

  // Hardware sensors
  const battery = useBatterySensor()
  const geoFence = useGeoFence({
    targetLat: 37.7749, // Mock coordinates (San Francisco)
    targetLng: -122.4194,
    fenceRadius: 50,
  })

  // Load service data
  useEffect(() => {
    const loadService = async () => {
      if (!serviceId) {
        router.push('/')
        return
      }

      try {
        const serviceData = await verifyService(serviceId)
        setService(serviceData)
      } catch (error) {
        console.error('Failed to load service:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    loadService()
  }, [serviceId, router])

  // Cost calculation - now includes recurring charges
  useEffect(() => {
    if (!service || !isActive) return

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - sessionStartTime) / (1000 * 60)
      const rate = parseFloat(service.rate)
      
      let cost = 0
      if (service.rateUnit === '/min') {
        cost = elapsedMinutes * rate
      } else if (service.rateUnit === '/kWh') {
        // Mock kWh consumption (0.1 kWh per minute for demo)
        cost = elapsedMinutes * 0.1 * rate
      }
      
      setCurrentCost(cost)
    }, 1000)

    return () => clearInterval(interval)
  }, [service, sessionStartTime, isActive])

  // Handle recurring payment events
  const handlePaymentCharged = useCallback((amount: string, minutes: number) => {
    console.log('💰 Payment charged:', amount, 'for', minutes, 'minutes')
    setRecurringCharges(prev => prev + 1)
    setLastPaymentTime(new Date())
    
    // Show success notification
    setPaymentNotification({
      type: 'success',
      message: `Payment processed for ${minutes} minute${minutes > 1 ? 's' : ''}`,
      amount
    })
    setShowPaymentNotification(true)
  }, [])

  const handlePaymentFailed = useCallback((error: string) => {
    console.error('❌ Payment failed:', error)
    setEndReason(`Payment failed: ${error}`)
    
    // Show error notification
    setPaymentNotification({
      type: 'error',
      message: 'Payment failed - session will end',
      amount: undefined
    })
    setShowPaymentNotification(true)
    
    setShowEndModal(true)
    setIsActive(false)
  }, [])

  // Handle condition changes from payment agent
  const handleConditionChanged = useCallback((condition: string, value: any) => {
    console.log('🔄 Condition changed:', condition, value)
    setCurrentConditions(prev => ({
      ...prev,
      [condition]: value,
      lastUpdated: Date.now()
    }))
  }, [])

  // Real hardware monitoring - no simulation
  useEffect(() => {
    if (!service || !isActive) return

    // Power service: Monitor battery charging status
    if (service.type === 'POWER' && battery.isSupported && !battery.isCharging) {
      setEndReason('Device unplugged - charging stopped')
      setShowEndModal(true)
      setIsActive(false)
    }
    
    // Gym service: Monitor geofence
    else if (service.type === 'GYM' && geoFence.isSupported && !geoFence.isInsideFence) {
      setEndReason(`Left gym area - ${geoFence.distanceInMeters}m away`)
      setShowEndModal(true)
      setIsActive(false)
    }
    
    // WiFi service: Monitor network connectivity (simplified)
    else if (service.type === 'WIFI' && !navigator.onLine) {
      setEndReason('Network connection lost')
      setShowEndModal(true)
      setIsActive(false)
    }
  }, [service, battery.isCharging, battery.isSupported, geoFence.isInsideFence, geoFence.isSupported, geoFence.distanceInMeters, isActive])

  const handleEndSession = useCallback(async () => {
    setIsActive(false)
    setEndReason('Session ended manually')
    
    // End session on smart contract
    try {
      // Convert the session ID back to bytes32 format
      const sessionIdBytes32 = `0x${params.id.padStart(64, '0')}`
      await endSession(sessionIdBytes32)
      setShowEndModal(true)
    } catch (error) {
      console.error('Failed to end session:', error)
      setShowEndModal(true)
    }
  }, [endSession, params.id])

  const handleCloseSession = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-white font-medium">Service not found</p>
        </div>
      </div>
    )
  }

  const getServiceIcon = () => {
    switch (service.type) {
      case 'POWER': return Zap
      case 'GYM': return MapPin
      case 'WIFI': return Wifi
      default: return Zap
    }
  }

  const ServiceIcon = getServiceIcon()
  const isConnected = isActive

  return (
    <div className="min-h-screen bg-void relative overflow-hidden">
      {/* Payment Notifications */}
      <PaymentNotification
        show={showPaymentNotification}
        type={paymentNotification.type}
        message={paymentNotification.message}
        amount={paymentNotification.amount}
        onClose={() => setShowPaymentNotification(false)}
      />

      {/* Recurring Payment Manager - handles automatic charging */}
      <RecurringPaymentManager
        sessionId={`0x${params.id.padStart(64, '0')}`}
        serviceType={service.type as 'WIFI' | 'GYM' | 'POWER' | 'CUSTOM'}
        providerAddress={serviceId || '0x0000000000000000000000000000000000000000'}
        rate={service.rate}
        isActive={isActive}
        onPaymentCharged={handlePaymentCharged}
        onPaymentFailed={handlePaymentFailed}
        onConditionChanged={handleConditionChanged}
      />

      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Header */}
      <div className="relative z-10 pt-12 pb-6 px-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">{service.name}</h1>
            <p className="text-gray-400 text-sm">{service.provider}</p>
          </div>
          
          <Link
            href="/services"
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Active Services"
          >
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6">
        {/* Status Indicator */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* Pulsing Ring */}
            <div className={`absolute inset-0 rounded-full animate-heartbeat ${
              isConnected ? 'bg-neon-green/20' : 'bg-red-500/20'
            }`} style={{ transform: 'scale(2)' }} />
            
            {/* Main Circle */}
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center relative ${
              isConnected 
                ? `border-neon-green bg-neon-green/10` 
                : `border-red-500 bg-red-500/10`
            }`}>
              <ServiceIcon className={`w-12 h-12 ${isConnected ? 'text-neon-green' : 'text-red-500'}`} />
              
              {/* Status Dot */}
              <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-void ${
                isConnected ? 'bg-neon-green' : 'bg-red-500'
              }`} />
            </div>
          </div>
          
          <div className="mt-4">
            <p className={`text-lg font-medium ${isConnected ? 'text-neon-green' : 'text-red-500'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
            <p className="text-gray-400 text-sm">
              {isConnected ? (isActive ? '🔄 Recurring payments active' : endReason) : endReason}
            </p>
          </div>
        </div>

        {/* Live Receipt */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 mb-8">
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-2">Current Cost</p>
            <p className="text-4xl font-space font-bold text-white">
              ${currentCost.toFixed(2)}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Rate: ${service.rate}{service.rateUnit}
            </p>
          </div>

          {/* Session Details */}
          <div className="space-y-3 border-t border-gray-700 pt-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Session ID</span>
              <span className="text-white font-mono text-sm">{params.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Started</span>
              <span className="text-white">{new Date(sessionStartTime).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Recurring Charges</span>
              <span className="text-white">{recurringCharges}</span>
            </div>
            {lastPaymentTime && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Payment</span>
                <span className="text-white">{lastPaymentTime.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hardware Status */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {/* Real-time Conditions Monitor */}
          <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-neon-green rounded-full animate-pulse"></div>
                <span className="text-white font-medium">Smart Payment Conditions</span>
              </div>
              <span className="text-xs text-gray-400">
                {currentConditions.lastUpdated ? 
                  new Date(currentConditions.lastUpdated).toLocaleTimeString() : 
                  'Initializing...'
                }
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              {service.type === 'WIFI' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">WiFi Connected</span>
                    <span className={currentConditions.wifiConnected ? 'text-green-400' : 'text-red-400'}>
                      {currentConditions.wifiConnected ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Signal Strength</span>
                    <span className="text-white">{currentConditions.signalStrength || 0}%</span>
                  </div>
                </>
              )}
              
              {service.type === 'GYM' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">In Gym Zone</span>
                    <span className={currentConditions.inGymZone ? 'text-green-400' : 'text-red-400'}>
                      {currentConditions.inGymZone ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Distance</span>
                    <span className="text-white">{Math.round(currentConditions.distanceToGym || 0)}m</span>
                  </div>
                </>
              )}
              
              {service.type === 'POWER' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Charging</span>
                    <span className={currentConditions.batteryCharging ? 'text-green-400' : 'text-red-400'}>
                      {currentConditions.batteryCharging ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Battery Level</span>
                    <span className="text-white">{currentConditions.batteryLevel || 0}%</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between col-span-2 pt-2 border-t border-gray-600">
                <span className="text-gray-400">Agent Status</span>
                <span className={`${
                  currentConditions.agentStatus === 'running' ? 'text-green-400' : 
                  currentConditions.agentStatus === 'error' ? 'text-red-400' : 
                  'text-yellow-400'
                }`}>
                  {currentConditions.agentStatus || 'initializing'}
                </span>
              </div>
            </div>
          </div>

          {service.type === 'POWER' && (
            <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-neon-green" />
                  <span className="text-white font-medium">Battery Status</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">
                    {battery.isSupported ? (battery.isCharging ? 'Charging' : 'Not Charging') : 'Unavailable'}
                  </p>
                  {battery.isSupported && (
                    <p className="text-gray-400 text-sm">{battery.level}%</p>
                  )}
                </div>
              </div>
              {!battery.isSupported && (
                <p className="text-yellow-500 text-xs mt-2">
                  ⚠️ Battery API not supported on this device
                </p>
              )}
            </div>
          )}

          {service.type === 'GYM' && (
            <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gold" />
                  <span className="text-white font-medium">Location Status</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">
                    {geoFence.isSupported ? (geoFence.isInsideFence ? 'Inside Gym' : 'Outside Gym') : 'Unavailable'}
                  </p>
                  {geoFence.isSupported && (
                    <p className="text-gray-400 text-sm">{geoFence.distanceInMeters}m away</p>
                  )}
                </div>
              </div>
              {!geoFence.isSupported && (
                <p className="text-yellow-500 text-xs mt-2">
                  ⚠️ Geolocation not supported or permission denied
                </p>
              )}
              {geoFence.error && (
                <p className="text-red-500 text-xs mt-2">
                  ⚠️ {geoFence.error}
                </p>
              )}
            </div>
          )}

          {service.type === 'WIFI' && (
            <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Wifi className="w-5 h-5 text-electric-blue" />
                  <span className="text-white font-medium">Network Status</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">
                    {navigator.onLine ? 'Connected' : 'Disconnected'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {navigator.onLine ? 'High Speed' : 'No Connection'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* End Session Button */}
        {isActive && (
          <motion.button
            onClick={handleEndSession}
            disabled={isPending || isConfirming}
            className="w-full py-4 bg-red-500/20 border-2 border-red-500/50 rounded-xl text-red-400 font-medium hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
            whileTap={{ scale: 0.98 }}
          >
            {isPending || isConfirming ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                <span>Ending Session...</span>
              </div>
            ) : (
              'End Session'
            )}
          </motion.button>
        )}
      </div>

      {/* End Session Modal */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full border border-gray-700 text-center"
            >
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-neon-green mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Session Ended</h3>
                <p className="text-gray-400">{endReason}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                <p className="text-gray-400 text-sm mb-1">Final Cost</p>
                <p className="text-3xl font-space font-bold text-white">${currentCost.toFixed(2)}</p>
              </div>

              <button
                onClick={handleCloseSession}
                className="w-full py-3 bg-electric-blue text-white font-medium rounded-xl hover:bg-electric-blue/80 transition-colors"
              >
                Return to Scanner
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}