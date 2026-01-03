'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scan, QrCode, Zap, Wifi, Dumbbell, Hash, X, Plus, Wallet, Store, Settings } from 'lucide-react'
import { parseFlexPassQR, getCustomServices, ServiceData } from '@/lib/envio'
import ServiceVerification from '@/components/ServiceVerification'
import QRGenerator from '@/components/QRGenerator'
import QRScanner from '@/components/QRScanner'
import AddCustomService from '@/components/AddCustomService'
import USDCDebug from '@/components/USDCDebug'
import ClientOnly from '@/components/ClientOnly'
import ConnectKitErrorBoundary from '@/components/ConnectKitErrorBoundary'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useChainId } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import Link from 'next/link'

export default function HomePage() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const [showScanner, setShowScanner] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [showHashInput, setShowHashInput] = useState(false)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [scannedData, setScannedData] = useState<{ id: string; type: string } | null>(null)
  const [showVerification, setShowVerification] = useState(false)
  const [hashInput, setHashInput] = useState('')
  const [customServices, setCustomServices] = useState<ServiceData[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])

  // Load custom services and active sessions on component mount
  useEffect(() => {
    setCustomServices(getCustomServices())
    
    // Load active sessions
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('flexpass-active-sessions')
        if (saved) {
          const sessions = JSON.parse(saved)
          setActiveSessions(sessions.filter((s: any) => s.isActive))
        }
      } catch (error) {
        console.error('Error loading active sessions:', error)
      }
    }
  }, [])

  const handleScan = useCallback((data: string) => {
    console.log('Scanned QR data:', data)
    const parsed = parseFlexPassQR(data)
    if (parsed) {
      setScannedData(parsed)
      setShowVerification(true)
      setShowScanner(false)
    } else {
      alert('Invalid FlexPass QR code. Please scan a valid FlexPass service QR code.')
    }
  }, [])

  const handleHashSubmit = () => {
    if (!hashInput.trim()) {
      alert('Please enter a service hash or wallet address')
      return
    }

    // Try to parse as FlexPass URL first
    let parsed = parseFlexPassQR(hashInput.trim())
    
    // If not a URL, treat as direct hash
    if (!parsed) {
      const hash = hashInput.trim()
      // Determine type based on hash pattern or default to CUSTOM for wallet addresses
      let type = 'GYM'
      
      // Check if it's a wallet address
      if (/^0x[a-fA-F0-9]{40}$/.test(hash)) {
        type = 'CUSTOM'
      } else if (hash.toLowerCase().includes('power') || hash === '0xPower') {
        type = 'POWER'
      } else if (hash.toLowerCase().includes('wifi') || hash === '0xWiFi') {
        type = 'WIFI'
      }
      
      parsed = { id: hash, type }
    }

    if (parsed) {
      setScannedData(parsed)
      setShowVerification(true)
      setShowHashInput(false)
      setHashInput('')
    } else {
      alert('Invalid service hash or URL')
    }
  }

  const handleCustomServiceAdded = (serviceId: string) => {
    // Refresh custom services list
    setCustomServices(getCustomServices())
    
    // Automatically open the new service
    setScannedData({ id: serviceId, type: 'CUSTOM' })
    setShowVerification(true)
  }

  const startScanning = () => {
    setShowScanner(true)
  }

  const stopScanning = () => {
    setShowScanner(false)
  }

  const openGenerator = () => {
    setShowGenerator(true)
  }

  const closeGenerator = () => {
    setShowGenerator(false)
  }

  const openHashInput = () => {
    setShowHashInput(true)
  }

  const closeHashInput = () => {
    setShowHashInput(false)
    setHashInput('')
  }

  const openAddCustom = () => {
    setShowAddCustom(true)
  }

  const closeAddCustom = () => {
    setShowAddCustom(false)
  }

  return (
    <div className="min-h-screen bg-void relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Header */}
      <div className="relative z-10 pt-16 pb-8 px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="w-32" /> {/* Spacer */}
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold font-space mb-2">FlexPass</h1>
            <p className="text-gray-400 text-lg">Universal Pay-As-You-Go Access Protocol</p>
          </motion.div>
          
          {/* Wallet Connection Button */}
          <div className="w-32 flex justify-end">
            <ClientOnly fallback={
              <div className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-600 text-gray-400 text-sm">
                Loading...
              </div>
            }>
              <ConnectKitErrorBoundary>
                <ConnectKitButton.Custom>
                  {({ isConnected, isConnecting, show, hide, address, ensName, chain }) => {
                    return (
                      <motion.button
                        onClick={show}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                          isConnected 
                            ? 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30' 
                            : 'bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500/30'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Wallet className="w-4 h-4" />
                        <span className="text-sm">
                          {isConnecting 
                            ? 'Connecting...' 
                            : isConnected 
                              ? `${address?.slice(0, 4)}...${address?.slice(-4)}` 
                              : 'Connect'
                          }
                        </span>
                      </motion.button>
                    )
                  }}
                </ConnectKitButton.Custom>
              </ConnectKitErrorBoundary>
            </ClientOnly>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="relative z-10 px-6">
        <div className="max-w-sm mx-auto">
          {/* Scanner Button */}
          <div className="relative mb-12">
            <motion.button
              onClick={startScanning}
              className="w-64 h-64 mx-auto block relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-gray-700 hover:border-electric-blue transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Pulsing rings */}
              <div className="absolute inset-0 rounded-3xl">
                <div className="absolute inset-4 border-2 border-electric-blue/30 rounded-2xl animate-pulse-ring" />
                <div className="absolute inset-8 border border-electric-blue/20 rounded-xl animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
              </div>
              
              {/* Scanner Icon */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <Scan className="w-16 h-16 text-electric-blue mb-4" />
                <span className="text-white font-medium text-lg">Scan QR Code</span>
                <span className="text-gray-400 text-sm mt-1">Point camera at service QR</span>
              </div>
            </motion.button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <motion.button
              onClick={openGenerator}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200 flex items-center space-x-4"
            >
              <QrCode className="w-6 h-6 text-electric-blue" />
              <div className="flex-1 text-left">
                <span className="text-white font-medium">Generate QR Code</span>
                <p className="text-gray-400 text-sm">Create service QR codes</p>
              </div>
            </motion.button>

            <motion.button
              onClick={openHashInput}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200 flex items-center space-x-4"
            >
              <Hash className="w-6 h-6 text-gold" />
              <div className="flex-1 text-left">
                <span className="text-white font-medium">Enter Service Hash</span>
                <p className="text-gray-400 text-sm">Manual service or wallet access</p>
              </div>
            </motion.button>

            <motion.button
              onClick={openAddCustom}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200 flex items-center space-x-4"
            >
              <Plus className="w-6 h-6 text-purple-400" />
              <div className="flex-1 text-left">
                <span className="text-white font-medium">Add Custom Service</span>
                <p className="text-gray-400 text-sm">Save wallet address as service</p>
              </div>
            </motion.button>

            {/* Active Services Link */}
            <Link href="/services">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200 flex items-center space-x-4 cursor-pointer"
              >
                <Settings className="w-6 h-6 text-green-400" />
                <div className="flex-1 text-left">
                  <span className="text-white font-medium">Active Services</span>
                  <p className="text-gray-400 text-sm">Manage ongoing sessions</p>
                </div>
                {activeSessions.length > 0 && (
                  <div className="w-6 h-6 bg-green-400 text-black rounded-full flex items-center justify-center text-xs font-bold">
                    {activeSessions.length}
                  </div>
                )}
              </motion.div>
            </Link>

            {/* Merchant Portal Link */}
            <Link href="/merchant/register">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/50 rounded-xl hover:border-purple-400 transition-all duration-200 flex items-center space-x-4 cursor-pointer"
              >
                <Store className="w-6 h-6 text-purple-400" />
                <div className="flex-1 text-left">
                  <span className="text-white font-medium">Merchant Portal</span>
                  <p className="text-gray-400 text-sm">Register your business on FlexPass</p>
                </div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              </motion.div>
            </Link>

            {/* Network Status */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl mb-6 text-center ${
                  chainId === baseSepolia.id 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    chainId === baseSepolia.id ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className={`font-medium ${
                    chainId === baseSepolia.id ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {chainId === baseSepolia.id ? 'Base Sepolia' : 'Wrong Network'}
                  </span>
                </div>
                {chainId !== baseSepolia.id && (
                  <p className="text-red-300 text-sm">
                    Please switch to Base Sepolia network to use FlexPass
                  </p>
                )}
              </motion.div>
            )}

            {/* Wallet Connection Status */}
            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-center"
              >
                <Wallet className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-yellow-400 font-medium mb-2">Wallet Not Connected</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Connect your wallet to access FlexPass services and view your USDC balance.
                </p>
                <ConnectKitButton.Custom>
                  {({ show }) => (
                    <ClientOnly>
                      <button
                        onClick={show}
                        className="px-6 py-3 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-xl font-medium hover:bg-yellow-500/30 transition-all duration-200"
                      >
                        Connect Wallet
                      </button>
                    </ClientOnly>
                  )}
                </ConnectKitButton.Custom>
              </motion.div>
            )}

            {/* USDC Debug Info - Only show when connected */}
            {isConnected && <USDCDebug />}

            {/* Custom Services List */}
            {customServices.length > 0 && (
              <div className="mt-6">
                <p className="text-center text-gray-400 text-sm mb-4">Your Custom Services</p>
                <div className="space-y-2">
                  {customServices.slice(0, 3).map((service) => (
                    <motion.button
                      key={service.id}
                      onClick={() => {
                        setScannedData({ id: service.id, type: service.type })
                        setShowVerification(true)
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="w-full p-3 bg-gray-900/30 border border-gray-700 rounded-lg hover:border-purple-400 transition-all duration-200 flex items-center space-x-3"
                    >
                      <Wallet className="w-5 h-5 text-purple-400" />
                      <div className="flex-1 text-left">
                        <span className="text-white font-medium text-sm">{service.name}</span>
                        <p className="text-gray-400 text-xs">${service.rate}{service.rateUnit}</p>
                      </div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    </motion.button>
                  ))}
                  {customServices.length > 3 && (
                    <p className="text-center text-gray-500 text-xs">
                      +{customServices.length - 3} more services
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Service Status Indicators */}
            <div className="mt-8 space-y-3">
              <p className="text-center text-gray-400 text-sm mb-4">Available Service Types</p>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-3 text-center">
                  <Dumbbell className="w-6 h-6 text-gold mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Gym Access</p>
                </div>
                
                <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-3 text-center">
                  <Zap className="w-6 h-6 text-neon-green mx-auto mb-2" />
                  <p className="text-xs text-gray-400">EV Charging</p>
                </div>
                
                <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-3 text-center">
                  <Wifi className="w-6 h-6 text-electric-blue mx-auto mb-2" />
                  <p className="text-xs text-gray-400">WiFi Access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <QRScanner
            onScan={handleScan}
            onClose={stopScanning}
          />
        )}
      </AnimatePresence>

      {/* Hash Input Modal */}
      <AnimatePresence>
        {showHashInput && (
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
              className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Enter Service Hash</h2>
                <button
                  onClick={closeHashInput}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-3">
                  Service Hash, Wallet Address, or FlexPass URL
                </label>
                <input
                  type="text"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  placeholder="0xGym, 0x742d35Cc..., or flex://connect?id=..."
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-electric-blue focus:outline-none transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && handleHashSubmit()}
                />
              </div>

              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-3">Quick Access:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setHashInput('0xGym')}
                    className="p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-center hover:border-gold transition-colors"
                  >
                    <Dumbbell className="w-5 h-5 text-gold mx-auto mb-1" />
                    <span className="text-xs text-gray-400">Gym</span>
                  </button>
                  <button
                    onClick={() => setHashInput('0xPower')}
                    className="p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-center hover:border-neon-green transition-colors"
                  >
                    <Zap className="w-5 h-5 text-neon-green mx-auto mb-1" />
                    <span className="text-xs text-gray-400">Power</span>
                  </button>
                  <button
                    onClick={() => setHashInput('0xWiFi')}
                    className="p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-center hover:border-electric-blue transition-colors"
                  >
                    <Wifi className="w-5 h-5 text-electric-blue mx-auto mb-1" />
                    <span className="text-xs text-gray-400">WiFi</span>
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeHashInput}
                  className="flex-1 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleHashSubmit}
                  disabled={!hashInput.trim()}
                  className="flex-1 py-3 bg-electric-blue text-white font-medium rounded-xl hover:bg-electric-blue/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Access Service
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Enter a service hash, wallet address, FlexPass URL, or use quick access buttons
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Service Modal */}
      <AnimatePresence>
        {showAddCustom && (
          <AddCustomService
            onClose={closeAddCustom}
            onServiceAdded={handleCustomServiceAdded}
          />
        )}
      </AnimatePresence>

      {/* QR Generator Modal */}
      <AnimatePresence>
        {showGenerator && (
          <QRGenerator onClose={closeGenerator} />
        )}
      </AnimatePresence>

      {/* Service Verification Modal */}
      <AnimatePresence>
        {showVerification && scannedData && (
          <ServiceVerification
            serviceId={scannedData.id}
            onClose={() => setShowVerification(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}