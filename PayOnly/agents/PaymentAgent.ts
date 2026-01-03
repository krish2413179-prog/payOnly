'use client'

import { EventEmitter } from 'events'

export interface PaymentTrigger {
  id: string
  sessionId: string
  serviceType: 'WIFI' | 'GYM' | 'POWER' | 'CUSTOM'
  conditions: {
    wifiConnected?: boolean
    locationInRange?: boolean
    batteryCharging?: boolean
    timeInterval?: number // minutes
  }
  lastTriggered: number
  isActive: boolean
}

export interface PaymentEvent {
  sessionId: string
  amount: string
  reason: string
  timestamp: number
  conditions: Record<string, any>
}

export class PaymentAgent extends EventEmitter {
  private triggers: Map<string, PaymentTrigger> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private isRunning: boolean = false

  constructor() {
    super()
    console.log('🤖 PaymentAgent initialized')
  }

  // Start the payment agent
  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('🚀 PaymentAgent started')
    
    // Start monitoring all active triggers
    this.triggers.forEach((trigger) => {
      if (trigger.isActive) {
        this.startMonitoring(trigger)
      }
    })
    
    this.emit('agent:started')
  }

  // Stop the payment agent
  stop() {
    if (!this.isRunning) return
    
    this.isRunning = false
    console.log('🛑 PaymentAgent stopped')
    
    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.intervals.clear()
    
    this.emit('agent:stopped')
  }

  // Add a new payment trigger
  addTrigger(trigger: PaymentTrigger) {
    console.log('➕ Adding payment trigger:', trigger.id)
    
    this.triggers.set(trigger.id, trigger)
    
    if (this.isRunning && trigger.isActive) {
      this.startMonitoring(trigger)
    }
    
    this.emit('trigger:added', trigger)
  }

  // Remove a payment trigger
  removeTrigger(triggerId: string) {
    console.log('➖ Removing payment trigger:', triggerId)
    
    const interval = this.intervals.get(triggerId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(triggerId)
    }
    
    this.triggers.delete(triggerId)
    this.emit('trigger:removed', triggerId)
  }

  // Update trigger conditions
  updateTrigger(triggerId: string, updates: Partial<PaymentTrigger>) {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) return
    
    const updatedTrigger = { ...trigger, ...updates }
    this.triggers.set(triggerId, updatedTrigger)
    
    // Restart monitoring with new conditions
    if (this.isRunning) {
      this.stopMonitoring(triggerId)
      if (updatedTrigger.isActive) {
        this.startMonitoring(updatedTrigger)
      }
    }
    
    this.emit('trigger:updated', updatedTrigger)
  }

  // Start monitoring a specific trigger
  private startMonitoring(trigger: PaymentTrigger) {
    console.log('👁️ Starting monitoring for trigger:', trigger.id)
    
    // Set up interval based on service type
    const checkInterval = this.getCheckInterval(trigger.serviceType)
    
    const interval = setInterval(async () => {
      await this.checkTriggerConditions(trigger)
    }, checkInterval)
    
    this.intervals.set(trigger.id, interval)
  }

  // Stop monitoring a specific trigger
  private stopMonitoring(triggerId: string) {
    const interval = this.intervals.get(triggerId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(triggerId)
    }
  }

  // Check if trigger conditions are met
  private async checkTriggerConditions(trigger: PaymentTrigger) {
    try {
      console.log('🔍 Checking conditions for trigger:', trigger.id)
      
      const conditions = await this.evaluateConditions(trigger)
      const shouldTrigger = this.shouldTriggerPayment(trigger, conditions)
      
      if (shouldTrigger) {
        await this.triggerPayment(trigger, conditions)
      }
      
    } catch (error) {
      console.error('❌ Error checking trigger conditions:', error)
      this.emit('error', { triggerId: trigger.id, error })
    }
  }

  // Evaluate current conditions
  private async evaluateConditions(trigger: PaymentTrigger): Promise<Record<string, any>> {
    const conditions: Record<string, any> = {}
    
    // Check WiFi connection
    if (trigger.conditions.wifiConnected !== undefined) {
      conditions.wifiConnected = await this.checkWiFiConnection()
    }
    
    // Check location
    if (trigger.conditions.locationInRange !== undefined) {
      conditions.locationInRange = await this.checkLocationInRange(trigger.sessionId)
    }
    
    // Check battery charging
    if (trigger.conditions.batteryCharging !== undefined) {
      conditions.batteryCharging = await this.checkBatteryCharging()
    }
    
    // Check time interval
    if (trigger.conditions.timeInterval !== undefined) {
      const timeSinceLastTrigger = Date.now() - trigger.lastTriggered
      const intervalMs = trigger.conditions.timeInterval * 60 * 1000
      conditions.timeIntervalMet = timeSinceLastTrigger >= intervalMs
    }
    
    conditions.timestamp = Date.now()
    return conditions
  }

  // Determine if payment should be triggered
  private shouldTriggerPayment(trigger: PaymentTrigger, conditions: Record<string, any>): boolean {
    // WiFi service: trigger when connected
    if (trigger.serviceType === 'WIFI') {
      return conditions.wifiConnected === true && conditions.timeIntervalMet === true
    }
    
    // GYM service: trigger when in location range
    if (trigger.serviceType === 'GYM') {
      return conditions.locationInRange === true && conditions.timeIntervalMet === true
    }
    
    // POWER service: trigger when battery is charging
    if (trigger.serviceType === 'POWER') {
      return conditions.batteryCharging === true && conditions.timeIntervalMet === true
    }
    
    // CUSTOM service: trigger based on time interval only
    if (trigger.serviceType === 'CUSTOM') {
      return conditions.timeIntervalMet === true
    }
    
    return false
  }

  // Trigger payment
  private async triggerPayment(trigger: PaymentTrigger, conditions: Record<string, any>) {
    console.log('💰 Triggering payment for session:', trigger.sessionId)
    
    const paymentEvent: PaymentEvent = {
      sessionId: trigger.sessionId,
      amount: '0.10', // This would be calculated based on service rate
      reason: this.getPaymentReason(trigger.serviceType, conditions),
      timestamp: Date.now(),
      conditions
    }
    
    // Update last triggered time
    trigger.lastTriggered = Date.now()
    this.triggers.set(trigger.id, trigger)
    
    // Emit payment event
    this.emit('payment:triggered', paymentEvent)
    
    // Send to Envio indexer
    await this.sendToEnvioIndexer(paymentEvent)
  }

  // Check WiFi connection status
  private async checkWiFiConnection(): Promise<boolean> {
    try {
      // Check if online
      if (!navigator.onLine) return false
      
      // Check connection type if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        return connection.type === 'wifi' || connection.effectiveType === '4g'
      }
      
      // Fallback: assume connected if online
      return navigator.onLine
    } catch (error) {
      console.error('Error checking WiFi:', error)
      return false
    }
  }

  // Check if location is in range
  private async checkLocationInRange(sessionId: string): Promise<boolean> {
    try {
      if (!navigator.geolocation) return false
      
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Mock target location (would be stored per session)
            const targetLat = 37.7749
            const targetLng = -122.4194
            const maxDistance = 100 // meters
            
            const distance = this.calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              targetLat,
              targetLng
            )
            
            resolve(distance <= maxDistance)
          },
          () => resolve(false),
          { timeout: 5000 }
        )
      })
    } catch (error) {
      console.error('Error checking location:', error)
      return false
    }
  }

  // Check battery charging status
  private async checkBatteryCharging(): Promise<boolean> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        return battery.charging
      }
      return false
    } catch (error) {
      console.error('Error checking battery:', error)
      return false
    }
  }

  // Calculate distance between two coordinates
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  // Get check interval based on service type
  private getCheckInterval(serviceType: string): number {
    switch (serviceType) {
      case 'WIFI': return 30000 // 30 seconds
      case 'GYM': return 60000 // 1 minute
      case 'POWER': return 15000 // 15 seconds
      default: return 60000 // 1 minute
    }
  }

  // Get payment reason based on service type and conditions
  private getPaymentReason(serviceType: string, conditions: Record<string, any>): string {
    switch (serviceType) {
      case 'WIFI':
        return conditions.wifiConnected ? 'WiFi usage detected' : 'WiFi disconnected'
      case 'GYM':
        return conditions.locationInRange ? 'In gym area' : 'Left gym area'
      case 'POWER':
        return conditions.batteryCharging ? 'Battery charging' : 'Charging stopped'
      default:
        return 'Time-based usage'
    }
  }

  // Send payment event to Envio indexer
  private async sendToEnvioIndexer(paymentEvent: PaymentEvent) {
    try {
      const envioUrl = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL
      if (!envioUrl) {
        console.warn('⚠️ Envio GraphQL URL not configured')
        return
      }

      // This would be a GraphQL mutation to log the payment event
      const mutation = `
        mutation LogPaymentEvent($input: PaymentEventInput!) {
          logPaymentEvent(input: $input) {
            id
            sessionId
            amount
            reason
            timestamp
          }
        }
      `

      const response = await fetch(envioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: paymentEvent
          }
        })
      })

      if (response.ok) {
        console.log('✅ Payment event sent to Envio indexer')
      } else {
        console.error('❌ Failed to send to Envio indexer:', response.statusText)
      }
    } catch (error) {
      console.error('❌ Error sending to Envio indexer:', error)
    }
  }

  // Get all active triggers
  getActiveTriggers(): PaymentTrigger[] {
    return Array.from(this.triggers.values()).filter(t => t.isActive)
  }

  // Get trigger by ID
  getTrigger(triggerId: string): PaymentTrigger | undefined {
    return this.triggers.get(triggerId)
  }

  // Get agent status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTriggers: this.getActiveTriggers().length,
      totalTriggers: this.triggers.size
    }
  }
}

// Global payment agent instance
export const paymentAgent = new PaymentAgent()