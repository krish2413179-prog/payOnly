'use client'

import { useState, useEffect, useCallback } from 'react'

export interface WiFiInfo {
  isConnected: boolean
  connectionType: string
  effectiveType: string
  downlink?: number
  rtt?: number
  ssid?: string
  signalStrength?: number
}

export interface UseWiFiDetectorOptions {
  checkInterval?: number
  onConnectionChange?: (connected: boolean) => void
  onQualityChange?: (quality: 'excellent' | 'good' | 'fair' | 'poor') => void
}

export function useWiFiDetector(options: UseWiFiDetectorOptions = {}) {
  const {
    checkInterval = 5000,
    onConnectionChange,
    onQualityChange
  } = options

  const [wifiInfo, setWiFiInfo] = useState<WiFiInfo>({
    isConnected: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown'
  })
  
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  // Check if Network Information API is supported
  useEffect(() => {
    const supported = 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator
    setIsSupported(supported)
    
    if (!supported) {
      setError('Network Information API not supported')
    }
  }, [])

  // Get connection info
  const getConnectionInfo = useCallback((): WiFiInfo => {
    const baseInfo: WiFiInfo = {
      isConnected: navigator.onLine,
      connectionType: 'unknown',
      effectiveType: 'unknown'
    }

    try {
      // Try different connection API variants
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection

      if (connection) {
        baseInfo.connectionType = connection.type || connection.effectiveType || 'unknown'
        baseInfo.effectiveType = connection.effectiveType || 'unknown'
        baseInfo.downlink = connection.downlink
        baseInfo.rtt = connection.rtt

        // Estimate if it's WiFi based on connection type
        const wifiTypes = ['wifi', 'ethernet']
        baseInfo.isConnected = navigator.onLine && 
          (wifiTypes.includes(connection.type) || connection.effectiveType === '4g')
      }

      return baseInfo
    } catch (err) {
      console.error('Error getting connection info:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return baseInfo
    }
  }, [])

  // Calculate connection quality
  const getConnectionQuality = useCallback((info: WiFiInfo): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (!info.isConnected) return 'poor'
    
    // Base quality on effective type and downlink speed
    if (info.effectiveType === '4g' && (info.downlink || 0) > 10) return 'excellent'
    if (info.effectiveType === '4g' && (info.downlink || 0) > 5) return 'good'
    if (info.effectiveType === '3g' || (info.downlink || 0) > 1) return 'fair'
    
    return 'poor'
  }, [])

  // Perform speed test
  const performSpeedTest = useCallback(async (): Promise<{ downloadSpeed: number, latency: number }> => {
    try {
      const startTime = performance.now()
      
      // Download a small test file (1KB)
      const testUrl = 'data:text/plain;base64,' + btoa('x'.repeat(1024))
      const response = await fetch(testUrl)
      await response.text()
      
      const endTime = performance.now()
      const latency = endTime - startTime
      
      // Estimate download speed (very rough)
      const downloadSpeed = (1024 * 8) / (latency / 1000) // bits per second
      
      return {
        downloadSpeed: downloadSpeed / 1000000, // Mbps
        latency
      }
    } catch (error) {
      console.error('Speed test failed:', error)
      return { downloadSpeed: 0, latency: 999 }
    }
  }, [])

  // Check WiFi status
  const checkWiFiStatus = useCallback(async () => {
    try {
      const info = getConnectionInfo()
      const quality = getConnectionQuality(info)
      
      // Trigger callbacks if values changed
      if (info.isConnected !== wifiInfo.isConnected) {
        onConnectionChange?.(info.isConnected)
      }
      
      const currentQuality = getConnectionQuality(wifiInfo)
      if (quality !== currentQuality) {
        onQualityChange?.(quality)
      }
      
      setWiFiInfo(info)
      setLastChecked(new Date())
      setError(null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check WiFi status')
    }
  }, [wifiInfo.isConnected, getConnectionInfo, getConnectionQuality, onConnectionChange, onQualityChange])

  // Set up periodic checking
  useEffect(() => {
    // Initial check
    checkWiFiStatus()
    
    // Set up interval
    const interval = setInterval(checkWiFiStatus, checkInterval)
    
    // Listen to online/offline events
    const handleOnline = () => checkWiFiStatus()
    const handleOffline = () => checkWiFiStatus()
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Listen to connection change events
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', checkWiFiStatus)
    }
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (connection) {
        connection.removeEventListener('change', checkWiFiStatus)
      }
    }
  }, [checkInterval, checkWiFiStatus])

  // Manual refresh
  const refresh = useCallback(() => {
    checkWiFiStatus()
  }, [checkWiFiStatus])

  // Get signal strength (mock implementation)
  const getSignalStrength = useCallback((): number => {
    if (!wifiInfo.isConnected) return 0
    
    // Mock signal strength based on connection quality
    const quality = getConnectionQuality(wifiInfo)
    switch (quality) {
      case 'excellent': return 90 + Math.random() * 10
      case 'good': return 70 + Math.random() * 20
      case 'fair': return 40 + Math.random() * 30
      case 'poor': return Math.random() * 40
      default: return 0
    }
  }, [wifiInfo, getConnectionQuality])

  return {
    // State
    wifiInfo: {
      ...wifiInfo,
      signalStrength: getSignalStrength()
    },
    isSupported,
    error,
    lastChecked,
    
    // Computed
    quality: getConnectionQuality(wifiInfo),
    isWiFiConnected: wifiInfo.isConnected && ['wifi', 'ethernet'].includes(wifiInfo.connectionType),
    
    // Actions
    refresh,
    performSpeedTest,
    checkWiFiStatus
  }
}