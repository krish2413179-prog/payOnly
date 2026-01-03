'use client'

import { useState, useEffect } from 'react'

interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
  addEventListener(type: 'chargingchange' | 'chargingtimechange' | 'dischargingtimechange' | 'levelchange', listener: EventListener): void
  removeEventListener(type: 'chargingchange' | 'chargingtimechange' | 'dischargingtimechange' | 'levelchange', listener: EventListener): void
}

interface NavigatorWithBattery extends Navigator {
  getBattery(): Promise<BatteryManager>
}

interface BatterySensorState {
  isCharging: boolean
  level: number
  isSupported: boolean
  chargingTime: number
  dischargingTime: number
}

export function useBatterySensor(): BatterySensorState {
  const [batteryState, setBatteryState] = useState<BatterySensorState>({
    isCharging: false,
    level: 0,
    isSupported: false,
    chargingTime: 0,
    dischargingTime: 0,
  })

  useEffect(() => {
    let battery: BatteryManager | null = null

    const updateBatteryInfo = (batteryManager: BatteryManager) => {
      setBatteryState({
        isCharging: batteryManager.charging,
        level: Math.round(batteryManager.level * 100),
        isSupported: true,
        chargingTime: batteryManager.chargingTime,
        dischargingTime: batteryManager.dischargingTime,
      })
    }

    const handleChargingChange = () => {
      if (battery) {
        updateBatteryInfo(battery)
      }
    }

    const handleLevelChange = () => {
      if (battery) {
        updateBatteryInfo(battery)
      }
    }

    const initBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          battery = await (navigator as NavigatorWithBattery).getBattery()
          updateBatteryInfo(battery)

          // Add event listeners
          battery.addEventListener('chargingchange', handleChargingChange)
          battery.addEventListener('levelchange', handleLevelChange)
          battery.addEventListener('chargingtimechange', handleChargingChange)
          battery.addEventListener('dischargingtimechange', handleChargingChange)
        } else {
          console.warn('Battery Status API not supported')
          setBatteryState(prev => ({ ...prev, isSupported: false }))
        }
      } catch (error) {
        console.error('Error accessing battery information:', error)
        setBatteryState(prev => ({ ...prev, isSupported: false }))
      }
    }

    initBattery()

    return () => {
      if (battery) {
        battery.removeEventListener('chargingchange', handleChargingChange)
        battery.removeEventListener('levelchange', handleLevelChange)
        battery.removeEventListener('chargingtimechange', handleChargingChange)
        battery.removeEventListener('dischargingtimechange', handleChargingChange)
      }
    }
  }, [])

  return batteryState
}