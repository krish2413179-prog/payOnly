'use client'

import { useState, useEffect, useCallback } from 'react'

interface GeoFenceState {
  distanceInMeters: number
  isInsideFence: boolean
  currentPosition: GeolocationPosition | null
  isSupported: boolean
  error: string | null
}

interface GeoFenceOptions {
  targetLat: number
  targetLng: number
  fenceRadius?: number // meters, default 50
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export function useGeoFence({
  targetLat,
  targetLng,
  fenceRadius = 50,
  enableHighAccuracy = true,
  timeout = 10000,
  maximumAge = 60000,
}: GeoFenceOptions): GeoFenceState {
  const [geoState, setGeoState] = useState<GeoFenceState>({
    distanceInMeters: 0,
    isInsideFence: false,
    currentPosition: null,
    isSupported: 'geolocation' in navigator,
    error: null,
  })

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }, [])

  const updatePosition = useCallback((position: GeolocationPosition) => {
    const distance = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      targetLat,
      targetLng
    )

    setGeoState(prev => ({
      ...prev,
      distanceInMeters: Math.round(distance),
      isInsideFence: distance <= fenceRadius,
      currentPosition: position,
      error: null,
    }))
  }, [targetLat, targetLng, fenceRadius, calculateDistance])

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown geolocation error'
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out'
        break
    }

    setGeoState(prev => ({
      ...prev,
      error: errorMessage,
    }))
  }, [])

  useEffect(() => {
    if (!geoState.isSupported) {
      setGeoState(prev => ({
        ...prev,
        error: 'Geolocation not supported by this browser',
      }))
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, options)

    // Watch position changes
    const watchId = navigator.geolocation.watchPosition(updatePosition, handleError, options)

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [targetLat, targetLng, enableHighAccuracy, timeout, maximumAge, geoState.isSupported, updatePosition, handleError])

  return geoState
}