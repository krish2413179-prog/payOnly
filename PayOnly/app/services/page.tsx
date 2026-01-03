'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useReadContract } from 'wagmi'
import { ArrowLeft, Clock, DollarSign, MapPin, Zap, Wifi, Settings, Play, Square, Trash2 } from 'lucide-react'
import { FLEXPASS_CONTRACT_ADDRESS, FLEXPASS_ABI, SERVICE_TYPE_NAMES } from '@/lib/contracts'
import { useFlexPassSession } from '@/hooks/useFlexPassSession'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ActiveSession {
  sessionId: string
  provider: string
  customer: string
  startTime: number
  isActive: boolean
  serviceName?: string
  serviceType?: number
  rate?: string
}

export default function ActiveServicesPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { endSession, isPending, currentSession } = useFlexPassSession()
  
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)

  // Load active sessions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('flexpass-active-sessions')
        if (saved) {
          const sessions = JSON.parse(saved)
          setActiveSessions(sessions.filter((s: ActiveSession) => s.isActive))
        }
      } catch (error) {
        console.error('Error loading active sessions:', error)
      } finally {
        setLoading(false)
      }
    }
  }, [])

  // Save sessions to localStorage
  const saveActiveSessions = (sessions: ActiveSession[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('flexpass-active-sessions', JSON.stringify(sessions))
      } catch (error) {
        console.error('Error saving active sessions:', error)
      }
    }
  }

  // Add current session if it exists
  useEffect(() => {
    if (currentSession && !activeSessions.find(s => s.sessionId === currentSession.sessionId)) {
      const newSession: ActiveSession = {
        sessionId: currentSession.sessionId,
        provider: currentSession.provider,
        customer: currentSession.customer,
        startTime: currentSession.startTime,
        isActive: currentSession.isActive
      }
      const updatedSessions = [...activeSessions, newSession]
      setActiveSessions(updatedSessions)
      saveActiveSessions(updatedSessions)
    }
  }, [currentSession, activeSessions])

  const getServiceIcon = (serviceType?: number) => {
    switch (serviceType) {
      case 0: return Zap // GYM
      case 1: return Wifi // WIFI  
      case 2: return Zap // POWER
      case 3: return Settings // CUSTOM
      default: return Settings
    }
  }

  const getServiceColor = (serviceType?: number) => {
    switch (serviceType) {
      case 0: return 'text-gold' // GYM
      case 1: return 'text-electric-blue' // WIFI
      case 2: return 'text-neon-green' // POWER
      case 3: return 'text-purple-400' // CUSTOM
      default: return 'text-gray-400'
    }
  }

  const calculateSessionCost = (session: ActiveSession) => {
    if (!session.rate) return '0.00'
    const elapsedMinutes = (Date.now() - session.startTime) / (1000 * 60)
    const rate = parseFloat(session.rate)
    return (elapsedMinutes * rate).toFixed(2)
  }

  const formatDuration = (startTime: number) => {
    const elapsed = Date.now() - startTime
    const minutes = Math.floor(elapsed / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      await endSession(sessionId)
      
      // Update local state
      const updatedSessions = activeSessions.map(session => 
        session.sessionId === sessionId 
          ? { ...session, isActive: false }
          : session
      ).filter(session => session.isActive)
      
      setActiveSessions(updatedSessions)
      saveActiveSessions(updatedSessions)
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const handleViewSession = (sessionId: string) => {
    const shortSessionId = sessionId.slice(2, 10)
    router.push(`/session/${shortSessionId}`)
  }

  const removeSession = (sessionId: string) => {
    const updatedSessions = activeSessions.filter(session => session.sessionId !== sessionId)
    setActiveSessions(updatedSessions)
    saveActiveSessions(updatedSessions)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-6">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 text-center">
          <Settings className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet Required</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to view your active FlexPass services.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-electric-blue hover:text-electric-blue/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scanner</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Header */}
      <div className="relative z-10 pt-12 pb-6 px-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href="/"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Scanner</span>
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Active Services</h1>
            <p className="text-gray-400">Manage your ongoing FlexPass sessions</p>
          </div>
          
          <div className="w-24" /> {/* Spacer */}
        </div>
      </div>

      <div className="relative z-10 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading active sessions...</p>
            </div>
          ) : activeSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Active Sessions</h3>
              <p className="text-gray-400 mb-6">
                You don't have any active FlexPass sessions at the moment.
              </p>
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-electric-blue text-white rounded-xl font-medium hover:bg-electric-blue/80 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start New Session</span>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  Active Sessions ({activeSessions.length})
                </h2>
                <div className="text-sm text-gray-400">
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>

              <AnimatePresence>
                {activeSessions.map((session, index) => {
                  const ServiceIcon = getServiceIcon(session.serviceType)
                  const serviceColor = getServiceColor(session.serviceType)
                  
                  return (
                    <motion.div
                      key={session.sessionId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center ${serviceColor}`}>
                            <ServiceIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium text-lg">
                              {session.serviceName || `Service ${session.sessionId.slice(2, 8)}`}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {SERVICE_TYPE_NAMES[session.serviceType || 3]}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-green-400 font-medium">Active</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Duration</span>
                          </div>
                          <p className="text-white font-medium">{formatDuration(session.startTime)}</p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Cost</span>
                          </div>
                          <p className="text-white font-medium">${calculateSessionCost(session)}</p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Provider</span>
                          </div>
                          <p className="text-white font-mono text-xs">
                            {session.provider.slice(0, 6)}...{session.provider.slice(-4)}
                          </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Started</span>
                          </div>
                          <p className="text-white text-xs">
                            {new Date(session.startTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewSession(session.sessionId)}
                          className="flex-1 py-3 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-xl font-medium hover:bg-electric-blue/30 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>View Session</span>
                        </button>
                        
                        <button
                          onClick={() => handleEndSession(session.sessionId)}
                          disabled={isPending}
                          className="flex-1 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          <Square className="w-4 h-4" />
                          <span>{isPending ? 'Ending...' : 'End Session'}</span>
                        </button>

                        <button
                          onClick={() => removeSession(session.sessionId)}
                          className="px-4 py-3 bg-gray-700/50 border border-gray-600 text-gray-400 rounded-xl hover:bg-gray-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/"
              className="p-4 bg-gray-900/30 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200 flex items-center space-x-4"
            >
              <div className="w-10 h-10 bg-electric-blue/20 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-electric-blue" />
              </div>
              <div>
                <h4 className="text-white font-medium">Start New Session</h4>
                <p className="text-gray-400 text-sm">Scan QR code to access services</p>
              </div>
            </Link>

            <Link
              href="/merchant/register"
              className="p-4 bg-gray-900/30 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200 flex items-center space-x-4"
            >
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-medium">Merchant Portal</h4>
                <p className="text-gray-400 text-sm">Register your business</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}