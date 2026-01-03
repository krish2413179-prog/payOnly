'use client'

import { useEffect, useCallback, useState } from 'react'
import { useFlexPassSession } from '@/hooks/useFlexPassSession'
import { useAccount } from 'wagmi'
import { useWiFiDetector } from '@/hooks/useWiFiDetector'
import { useLocationDetector } from '@/hooks/useLocationDetector'
import { useBatterySensor } from '@/hooks/useBatterySensor'
import { paymentAgent, PaymentTrigger, PaymentEvent } from '@/agents/PaymentAgent'
import { envioIndexer } from '@/lib/envio-indexer'

interface RecurringPaymentManagerProps {
  sessionId: string
  serviceType: 'WIFI' | 'GYM' | 'POWER' | 'CUSTOM'
  providerAddress: string
  rate: string
  isActive: boolean
  onPaymentCharged?: (amount: string, minutes: number) => void
  onPaymentFailed?: (error: string) => void
  onConditionChanged?: (condition: string, value: any) => void
}

export default function RecurringPaymentManager({ 
  sessionId, 
  serviceType,
  providerAddress,
  rate,
  isActive, 
  onPaymentCharged, 
  onPaymentFailed,
  onConditionChanged
}: RecurringPaymentManagerProps) {
  const { chargeSession, isPending, isSuccess, error } = useFlexPassSession()
  const { address } = useAccount()
  const [lastChargeTime, setLastChargeTime] = useState<number>(Date.now())
  const [totalCharges, setTotalCharges] = useState<number>(0)
  const [agentStatus, setAgentStatus] = useState<string>('initializing')

  // Enhanced detectors
  const wifiDetector = useWiFiDetector({
    checkInterval: 30000,
    onConnectionChange: (connected) => {
      console.log('📶 WiFi connection changed:', connected)
      onConditionChanged?.('wifiConnected', connected)
    },
    onQualityChange: (quality) => {
      console.log('📶 WiFi quality changed:', quality)
      onConditionChanged?.('wifiQuality', quality)
    }
  })

  const locationDetector = useLocationDetector({
    enableHighAccuracy: true,
    trackingInterval: 60000,
    geofences: serviceType === 'GYM' ? [{
      id: 'gym-zone',
      name: 'Gym Area',
      latitude: 37.7749, // Mock gym coordinates
      longitude: -122.4194,
      radius: 100, // 100 meters
      type: 'both'
    }] : [],
    onLocationChange: (location) => {
      console.log('📍 Location changed:', location)
      onConditionChanged?.('location', location)
    },
    onGeofenceEnter: (zone) => {
      console.log('📍 Entered zone:', zone.name)
      onConditionChanged?.('enteredZone', zone.id)
    },
    onGeofenceExit: (zone) => {
      console.log('📍 Exited zone:', zone.name)
      onConditionChanged?.('exitedZone', zone.id)
    }
  })

  const battery = useBatterySensor()

  // Initialize payment agent
  useEffect(() => {
    if (!isActive || !address) return

    console.log('🤖 Initializing payment agent for session:', sessionId)
    setAgentStatus('starting')

    // Create payment trigger based on service type
    const trigger: PaymentTrigger = {
      id: `trigger-${sessionId}`,
      sessionId,
      serviceType,
      conditions: {
        timeInterval: 1, // Charge every minute
        ...(serviceType === 'WIFI' && { wifiConnected: true }),
        ...(serviceType === 'GYM' && { locationInRange: true }),
        ...(serviceType === 'POWER' && { batteryCharging: true })
      },
      lastTriggered: Date.now(),
      isActive: true
    }

    // Add trigger to payment agent
    paymentAgent.addTrigger(trigger)

    // Set up event listeners
    const handlePaymentTriggered = async (paymentEvent: PaymentEvent) => {
      if (paymentEvent.sessionId !== sessionId) return

      console.log('💰 Payment triggered by agent:', paymentEvent)
      
      try {
        // Execute blockchain transaction
        await chargeSession(sessionId)
        
        // Log to Envio indexer
        await envioIndexer.logPaymentEvent({
          sessionId: paymentEvent.sessionId,
          customerAddress: address,
          providerAddress,
          amount: paymentEvent.amount,
          reason: paymentEvent.reason,
          conditions: {
            wifiConnected: wifiDetector.isWiFiConnected,
            locationInRange: locationDetector.isInZone('gym-zone'),
            batteryCharging: battery.isCharging,
            signalStrength: wifiDetector.wifiInfo.signalStrength,
            distance: locationDetector.getDistanceTo(37.7749, -122.4194)
          },
          timestamp: paymentEvent.timestamp
        })

        setLastChargeTime(Date.now())
        setTotalCharges(prev => prev + 1)
        onPaymentCharged?.(paymentEvent.amount, 1)
        
      } catch (err) {
        console.error('❌ Payment execution failed:', err)
        onPaymentFailed?.(err instanceof Error ? err.message : 'Payment failed')
      }
    }

    const handleAgentError = (errorEvent: any) => {
      console.error('🤖 Payment agent error:', errorEvent)
      setAgentStatus('error')
      onPaymentFailed?.(`Agent error: ${errorEvent.error?.message || 'Unknown error'}`)
    }

    // Register event listeners
    paymentAgent.on('payment:triggered', handlePaymentTriggered)
    paymentAgent.on('error', handleAgentError)
    paymentAgent.on('agent:started', () => setAgentStatus('running'))
    paymentAgent.on('agent:stopped', () => setAgentStatus('stopped'))

    // Start the payment agent
    paymentAgent.start()
    setAgentStatus('running')

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up payment agent')
      paymentAgent.off('payment:triggered', handlePaymentTriggered)
      paymentAgent.off('error', handleAgentError)
      paymentAgent.removeTrigger(trigger.id)
      setAgentStatus('stopped')
    }
  }, [
    isActive, 
    address, 
    sessionId, 
    serviceType, 
    providerAddress,
    chargeSession,
    onPaymentCharged,
    onPaymentFailed,
    wifiDetector.isWiFiConnected,
    wifiDetector.wifiInfo.signalStrength,
    locationDetector,
    battery.isCharging
  ])

  // Log session start to Envio
  useEffect(() => {
    if (isActive && address) {
      envioIndexer.logSessionEvent({
        sessionId,
        customerAddress: address,
        providerAddress,
        serviceType,
        status: 'started',
        totalCost: '0',
        duration: 0,
        timestamp: Date.now()
      }).catch(console.error)
    }
  }, [isActive, address, sessionId, providerAddress, serviceType])

  // Monitor condition changes and update agent
  useEffect(() => {
    const triggerId = `trigger-${sessionId}`
    const trigger = paymentAgent.getTrigger(triggerId)
    
    if (trigger) {
      const updatedConditions = {
        ...trigger.conditions,
        ...(serviceType === 'WIFI' && { wifiConnected: wifiDetector.isWiFiConnected }),
        ...(serviceType === 'GYM' && { locationInRange: locationDetector.isInZone('gym-zone') }),
        ...(serviceType === 'POWER' && { batteryCharging: battery.isCharging })
      }

      paymentAgent.updateTrigger(triggerId, {
        conditions: updatedConditions
      })
    }
  }, [
    sessionId,
    serviceType,
    wifiDetector.isWiFiConnected,
    locationDetector,
    battery.isCharging
  ])

  // Get current conditions for display
  const getCurrentConditions = useCallback(() => {
    const conditions: Record<string, any> = {
      agentStatus,
      totalCharges,
      lastChargeTime: new Date(lastChargeTime).toLocaleTimeString()
    }

    if (serviceType === 'WIFI') {
      conditions.wifiConnected = wifiDetector.isWiFiConnected
      conditions.wifiQuality = wifiDetector.quality
      conditions.signalStrength = Math.round(wifiDetector.wifiInfo.signalStrength || 0)
    }

    if (serviceType === 'GYM') {
      conditions.locationTracking = locationDetector.isTracking
      conditions.inGymZone = locationDetector.isInZone('gym-zone')
      conditions.distanceToGym = locationDetector.getDistanceTo(37.7749, -122.4194)
    }

    if (serviceType === 'POWER') {
      conditions.batterySupported = battery.isSupported
      conditions.batteryCharging = battery.isCharging
      conditions.batteryLevel = battery.level
    }

    return conditions
  }, [
    agentStatus,
    totalCharges,
    lastChargeTime,
    serviceType,
    wifiDetector,
    locationDetector,
    battery
  ])

  // This component doesn't render anything visible in production
  // It just manages the payment logic in the background
  return (
    <div className="hidden">
      {/* Debug info - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-white z-50 max-w-xs">
          <div className="font-bold mb-2">🤖 Payment Agent Debug</div>
          <div>Session: {sessionId.slice(0, 8)}...</div>
          <div>Type: {serviceType}</div>
          <div>Status: {agentStatus}</div>
          <div>Charges: {totalCharges}</div>
          <div>Last: {new Date(lastChargeTime).toLocaleTimeString()}</div>
          
          {serviceType === 'WIFI' && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div>📶 WiFi: {wifiDetector.isWiFiConnected ? '✅' : '❌'}</div>
              <div>Quality: {wifiDetector.quality}</div>
              <div>Signal: {Math.round(wifiDetector.wifiInfo.signalStrength || 0)}%</div>
            </div>
          )}
          
          {serviceType === 'GYM' && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div>📍 Tracking: {locationDetector.isTracking ? '✅' : '❌'}</div>
              <div>In Zone: {locationDetector.isInZone('gym-zone') ? '✅' : '❌'}</div>
              <div>Distance: {Math.round(locationDetector.getDistanceTo(37.7749, -122.4194) || 0)}m</div>
            </div>
          )}
          
          {serviceType === 'POWER' && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div>🔋 Supported: {battery.isSupported ? '✅' : '❌'}</div>
              <div>Charging: {battery.isCharging ? '✅' : '❌'}</div>
              <div>Level: {battery.level}%</div>
            </div>
          )}
          
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            Blockchain: {isPending ? 'Pending...' : isSuccess ? 'Success' : error ? 'Error' : 'Ready'}
          </div>
        </div>
      )}
    </div>
  )
}