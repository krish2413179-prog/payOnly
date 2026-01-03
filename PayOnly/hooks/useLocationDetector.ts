'use client'

import { useState, useEffect, useCallback } from 'react'

export interface LocationInfo {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: number
}

export interface GeofenceZone {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number // meters
  type: 'enter' | 'exit' | 'both'
}

export interface UseLocationDetectorOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  trackingInterval?: number
  geofences?: GeofenceZone[]
  onLocationChange?: (location: LocationInfo) => void
  onGeofenceEnter?: (zone: GeofenceZone, location: LocationInfo) => void
  onGeofenceExit?: (zone: GeofenceZone, location: LocationInfo) => void
}

export function useLocationDetector(options: UseLocationDetectorOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    trackingInterval = 30000,
    geofences = [],
    onLocationChange,
    onGeofenceEnter,
    onGeofenceExit
  } = options

  const [location, setLocation] = useState<LocationInfo | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [insideZones, setInsideZones] = useState<Set<string>>(new Set())
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Check if Geolocation API is supported
  useEffect(() => {
    const supported = 'geolocation' in navigator
    setIsSupported(supported)
    
    if (!supported) {
      setError('Geolocation API not supported')
    }
  }, [])

  // Check permission status
  const checkPermission = useCallback(async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        setPermissionStatus(permission.state)
        
        // Listen for permission changes
        permission.onchange = () => {
          setPermissionStatus(permission.state)
        }
      }
    } catch (err) {
      console.error('Error checking geolocation permission:', err)
    }
  }, [])

  // Calculate distance between two points
  const calculateDistance = useCallback((
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number => {
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
  }, [])

  // Check geofences
  const checkGeofences = useCallback((newLocation: LocationInfo) => {
    const currentlyInside = new Set<string>()
    
    geofences.forEach(zone => {
      const distance = calculateDistance(
        newLocation.latitude, newLocation.longitude,
        zone.latitude, zone.longitude
      )
      
      const isInside = distance <= zone.radius
      
      if (isInside) {
        currentlyInside.add(zone.id)
        
        // Check if just entered
        if (!insideZones.has(zone.id) && (zone.type === 'enter' || zone.type === 'both')) {
          console.log('📍 Entered geofence:', zone.name)
          onGeofenceEnter?.(zone, newLocation)
        }
      } else {
        // Check if just exited
        if (insideZones.has(zone.id) && (zone.type === 'exit' || zone.type === 'both')) {
          console.log('📍 Exited geofence:', zone.name)
          onGeofenceExit?.(zone, newLocation)
        }
      }
    })
    
    setInsideZones(currentlyInside)
  }, [geofences, insideZones, calculateDistance, onGeofenceEnter, onGeofenceExit])

  // Get current location
  const getCurrentLocation = useCallback((): Promise<LocationInfo> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationInfo: LocationInfo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp
          }
          
          resolve(locationInfo)
        },
        (error) => {
          let errorMessage = 'Unknown location error'
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              setPermissionStatus('denied')
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      )
    })
  }, [isSupported, enableHighAccuracy, timeout, maximumAge])

  // Update location
  const updateLocation = useCallback(async () => {
    try {
      const newLocation = await getCurrentLocation()
      
      setLocation(newLocation)
      setLastChecked(new Date())
      setError(null)
      
      // Check geofences
      checkGeofences(newLocation)
      
      // Trigger callback
      onLocationChange?.(newLocation)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location'
      setError(errorMessage)
      console.error('Location update failed:', err)
    }
  }, [getCurrentLocation, checkGeofences, onLocationChange])

  // Start tracking
  const startTracking = useCallback(() => {
    if (!isSupported || isTracking) return
    
    console.log('📍 Starting location tracking')
    setIsTracking(true)
    
    // Initial location update
    updateLocation()
    
    // Set up interval for continuous tracking
    const interval = setInterval(updateLocation, trackingInterval)
    
    return () => {
      clearInterval(interval)
      setIsTracking(false)
    }
  }, [isSupported, isTracking, updateLocation, trackingInterval])

  // Stop tracking
  const stopTracking = useCallback(() => {
    console.log('📍 Stopping location tracking')
    setIsTracking(false)
  }, [])

  // Check if location is in specific zone
  const isInZone = useCallback((zoneId: string): boolean => {
    return insideZones.has(zoneId)
  }, [insideZones])

  // Get distance to specific point
  const getDistanceTo = useCallback((targetLat: number, targetLng: number): number | null => {
    if (!location) return null
    
    return calculateDistance(
      location.latitude, location.longitude,
      targetLat, targetLng
    )
  }, [location, calculateDistance])

  // Get all zones user is currently inside
  const getCurrentZones = useCallback((): GeofenceZone[] => {
    return geofences.filter(zone => insideZones.has(zone.id))
  }, [geofences, insideZones])

  // Initialize
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // Auto-start tracking if geofences are provided
  useEffect(() => {
    if (geofences.length > 0 && !isTracking && permissionStatus === 'granted') {
      const cleanup = startTracking()
      return cleanup
    }
  }, [geofences.length, isTracking, permissionStatus, startTracking])

  return {
    // State
    location,
    isSupported,
    isTracking,
    error,
    permissionStatus,
    lastChecked,
    
    // Geofence state
    insideZones: Array.from(insideZones),
    currentZones: getCurrentZones(),
    
    // Actions
    getCurrentLocation,
    startTracking,
    stopTracking,
    updateLocation,
    checkPermission,
    
    // Utilities
    isInZone,
    getDistanceTo,
    calculateDistance
  }
}