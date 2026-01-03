'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { QRCodeSVG } from 'qrcode.react'
import { 
  Store, 
  Wallet, 
  Copy, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  Zap,
  Wifi,
  Dumbbell,
  Settings,
  TestTube
} from 'lucide-react'
import { FLEXPASS_CONTRACT_ADDRESS, FLEXPASS_ABI, ServiceType, SERVICE_TYPE_NAMES, usdcToWei, MOCK_CONTRACT_ADDRESS } from '@/lib/contracts'
import { ConnectKitButton } from 'connectkit'
import ClientOnly from '@/components/ClientOnly'
import Link from 'next/link'

export default function MerchantRegisterPage() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const [serviceName, setServiceName] = useState('')
  const [ratePerMinute, setRatePerMinute] = useState('0.10')
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.GYM)
  const [isRegistered, setIsRegistered] = useState(false)
  const [qrData, setQrData] = useState('')
  const [mockMode, setMockMode] = useState(false) // Start with live mode now that contract is deployed

  const serviceTypeOptions = [
    { value: ServiceType.GYM, label: 'Gym/Fitness', icon: Dumbbell, color: 'text-gold' },
    { value: ServiceType.WIFI, label: 'WiFi/Internet', icon: Wifi, color: 'text-electric-blue' },
    { value: ServiceType.POWER, label: 'EV Charging', icon: Zap, color: 'text-neon-green' },
    { value: ServiceType.CUSTOM, label: 'Custom Service', icon: Settings, color: 'text-purple-400' },
  ]

  const handleRegisterService = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    if (!serviceName.trim()) {
      alert('Please enter a service name')
      return
    }

    if (!ratePerMinute || parseFloat(ratePerMinute) <= 0) {
      alert('Please enter a valid rate per minute')
      return
    }

    try {
      if (mockMode) {
        // Mock registration for testing
        setTimeout(() => {
          const qrPayload = JSON.stringify({
            hash: address,
            type: Object.keys(ServiceType)[serviceType]
          })
          setQrData(qrPayload)
          setIsRegistered(true)
        }, 2000)
        return
      }

      const rateInWei = usdcToWei(ratePerMinute)
      
      // Call the smart contract
      writeContract({
        address: FLEXPASS_CONTRACT_ADDRESS, // Using real deployed contract
        abi: FLEXPASS_ABI,
        functionName: 'registerService',
        args: [serviceName.trim(), rateInWei, serviceType],
      })
    } catch (err) {
      console.error('Registration error:', err)
      alert('Failed to register service. Please try again.')
    }
  }

  // Handle successful registration
  if (isSuccess && !isRegistered) {
    const qrPayload = JSON.stringify({
      hash: address,
      type: Object.keys(ServiceType)[serviceType] // Convert enum to string
    })
    setQrData(qrPayload)
    setIsRegistered(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const downloadQR = () => {
    const svg = document.querySelector('#merchant-qr-code')
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        
        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = `flexpass-${serviceName.replace(/\s+/g, '-').toLowerCase()}-qr.png`
        downloadLink.href = pngFile
        downloadLink.click()
      }
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-6">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 text-center">
          <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet Required</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to register as a FlexPass service provider.
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
            <h1 className="text-3xl font-bold text-white">Merchant Portal</h1>
            <p className="text-gray-400">Register your service on FlexPass</p>
          </div>
          
          {/* Wallet Connection Button */}
          <ClientOnly fallback={
            <div className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-600 text-gray-400 text-sm">
              Loading...
            </div>
          }>
            <ConnectKitButton.Custom>
              {({ isConnected, isConnecting, show, address }) => {
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
          </ClientOnly>
        </div>
      </div>

      <div className="relative z-10 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Live Mode Toggle */}
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <h4 className="text-green-400 font-medium">Live Mode - Contract Deployed</h4>
                  <p className="text-gray-400 text-sm">Connected to FlexPass contract on Sepolia testnet</p>
                </div>
              </div>
              <button
                onClick={() => setMockMode(!mockMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !mockMode 
                    ? 'bg-green-500 text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {!mockMode ? 'Live Mode' : 'Demo Mode'}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isRegistered ? (
              <motion.div
                key="registration-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gray-900/50 border border-gray-700 rounded-2xl p-8"
              >
                {/* Connected Wallet Info */}
                <div className="mb-8 p-4 bg-gray-800/50 border border-gray-600 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Connected Wallet</p>
                      <p className="text-gray-400 font-mono text-sm">{address}</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Registration Form */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <Store className="w-6 h-6 text-purple-400" />
                      <h2 className="text-2xl font-bold text-white">Service Registration</h2>
                    </div>

                    {/* Service Name */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-3">
                        Service Name *
                      </label>
                      <input
                        type="text"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="Gold's Gym Downtown"
                        className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Rate per Minute */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-3">
                        Rate per Minute (USDC) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ratePerMinute}
                          onChange={(e) => setRatePerMinute(e.target.value)}
                          placeholder="0.10"
                          className="w-full pl-8 pr-4 py-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Users will be charged this amount per minute of usage
                      </p>
                    </div>

                    {/* Service Type */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-3">
                        Service Type *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {serviceTypeOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setServiceType(option.value)}
                            className={`p-4 rounded-xl border transition-all duration-200 flex items-center space-x-3 ${
                              serviceType === option.value
                                ? 'bg-gray-800 border-purple-400 text-white'
                                : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-gray-500'
                            }`}
                          >
                            <option.icon className={`w-5 h-5 ${serviceType === option.value ? 'text-purple-400' : option.color}`} />
                            <span className="text-sm font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Register Button */}
                    <button
                      onClick={handleRegisterService}
                      disabled={(isPending || isConfirming) && !mockMode || !serviceName.trim() || !ratePerMinute}
                      className="w-full py-4 bg-purple-500 text-white font-medium rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {(isPending || isConfirming) && !mockMode ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{isPending ? 'Confirming Transaction...' : 'Registering Service...'}</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-5 h-5" />
                          <span>{mockMode ? 'Register Service (Demo)' : 'Register Service'}</span>
                        </>
                      )}
                    </button>

                    {error && (
                      <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <div>
                          <p className="text-red-400 text-sm font-medium">Transaction Failed</p>
                          <p className="text-red-300 text-xs mt-1">
                            {error.message.includes('Invalid address') 
                              ? 'Contract not deployed. Using demo mode instead.' 
                              : error.message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white">Service Preview</h3>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        {serviceTypeOptions.find(opt => opt.value === serviceType)?.icon && (
                          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            {(() => {
                              const IconComponent = serviceTypeOptions.find(opt => opt.value === serviceType)!.icon
                              return <IconComponent className="w-6 h-6 text-purple-400" />
                            })()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-white font-medium text-lg">
                            {serviceName || 'Your Service Name'}
                          </h4>
                          <p className="text-gray-400 text-sm">
                            {SERVICE_TYPE_NAMES[serviceType]}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Rate:</span>
                          <span className="text-white font-medium">${ratePerMinute}/min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Provider:</span>
                          <span className="text-white font-mono text-xs">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className="text-yellow-400">Pending Registration</span>
                        </div>
                      </div>
                    </div>

                    {/* Envio Integration Info */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <h4 className="text-blue-400 font-medium mb-2">🔍 Envio Integration</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Once registered, Envio will automatically index your ServiceRegistered event. 
                        When users scan your QR code, the app will instantly fetch your service name, 
                        rate, and verification status from the indexed data.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-900/50 border border-gray-700 rounded-2xl p-8"
              >
                <div className="text-center mb-8">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Service Registered Successfully!
                  </h2>
                  <p className="text-gray-400">
                    Your FlexPass service is now {mockMode ? 'ready for demo' : 'live and ready for customers'}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* QR Code */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-4">Customer QR Code</h3>
                    <div className="bg-white p-6 rounded-2xl inline-block mb-4">
                      <QRCodeSVG
                        id="merchant-qr-code"
                        value={qrData}
                        size={256}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <div className="flex space-x-3 justify-center">
                      <button
                        onClick={downloadQR}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      Print this QR code and display it for customers to scan
                    </p>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white">Service Details</h3>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Service Name</label>
                        <p className="text-white font-medium">{serviceName}</p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Rate</label>
                        <p className="text-white font-medium">${ratePerMinute} USDC per minute</p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Service Type</label>
                        <p className="text-white font-medium">{SERVICE_TYPE_NAMES[serviceType]}</p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Service Hash (Wallet Address)</label>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 p-3 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono text-sm">
                            {address}
                          </code>
                          <button
                            onClick={() => copyToClipboard(address || '')}
                            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4 text-gray-300" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Hash */}
                    {hash && !mockMode && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <h4 className="text-green-400 font-medium mb-2">✅ Transaction Confirmed</h4>
                        <p className="text-gray-400 text-xs font-mono break-all">{hash}</p>
                      </div>
                    )}

                    {!mockMode && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <h4 className="text-green-400 font-medium mb-2">🚀 Live on Sepolia</h4>
                        <p className="text-gray-400 text-xs">
                          This service will be registered on-chain and available for real customers.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Steps */}
                <div className="mt-8 p-6 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <h4 className="text-purple-400 font-medium mb-3">📋 Next Steps</h4>
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li>• Print and display your QR code where customers can easily scan it</li>
                    <li>• Customers will scan the code to start a pay-as-you-go session</li>
                    <li>• {mockMode ? 'In production, payments' : 'Payments'} will be automatically sent to your wallet address</li>
                    <li>• Monitor your earnings through your wallet or block explorer</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/*
ENVIO INTEGRATION COMMENTS:

1. EVENT INDEXING:
   When a merchant calls registerService(), the smart contract emits:
   
   event ServiceRegistered(
     address indexed provider,
     string name,
     uint256 rate,
     uint8 serviceType
   );

2. ENVIO CONFIGURATION:
   The Envio indexer should be configured to listen for ServiceRegistered events:
   
   // envio.config.yaml
   networks:
     - id: 1
       contracts:
         - name: FlexPass
           address: "0x742d35Cc6634C0532925a3b8D404d3aABb8c4532"
           abi: "./abis/FlexPass.json"
           events:
             - ServiceRegistered

3. DATA INDEXING:
   Envio will automatically index each ServiceRegistered event and store:
   - provider (wallet address)
   - name (service name)
   - rate (USDC rate per minute)
   - serviceType (enum: GYM, WIFI, POWER, CUSTOM)
   - blockNumber, transactionHash, timestamp

4. QUERY INTEGRATION:
   When a user scans a QR code with {"hash": "0x...", "type": "GYM"}:
   
   a) The app calls: verifyService(hash)
   b) Instead of using mock data, query Envio's GraphQL endpoint:
   
   query GetService($provider: String!) {
     serviceRegistered(where: { provider: $provider }) {
       name
       rate
       serviceType
       blockNumber
       timestamp
     }
   }
   
   c) Transform the indexed data into ServiceData format
   d) Display verified service information to the user

5. REAL-TIME UPDATES:
   Envio provides real-time indexing, so newly registered services
   are immediately available for scanning and verification.

6. VERIFICATION STATUS:
   Services registered on-chain and indexed by Envio are marked as
   "verified: true" since they've been validated by the smart contract.
*/