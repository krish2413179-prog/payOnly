'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Wallet, Zap, Wifi, Dumbbell, Store } from 'lucide-react'
import { addCustomService } from '@/lib/envio'

interface AddCustomServiceProps {
  onClose: () => void
  onServiceAdded: (serviceId: string) => void
}

export default function AddCustomService({ onClose, onServiceAdded }: AddCustomServiceProps) {
  const [walletAddress, setWalletAddress] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [serviceType, setServiceType] = useState<'POWER' | 'GYM' | 'WIFI' | 'CUSTOM'>('CUSTOM')
  const [rate, setRate] = useState('0.10')
  const [rateUnit, setRateUnit] = useState('/min')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const serviceTypes = [
    { id: 'CUSTOM', name: 'Custom Service', icon: Store, color: 'text-purple-400' },
    { id: 'GYM', name: 'Gym/Fitness', icon: Dumbbell, color: 'text-gold' },
    { id: 'POWER', name: 'EV Charging', icon: Zap, color: 'text-neon-green' },
    { id: 'WIFI', name: 'WiFi/Internet', icon: Wifi, color: 'text-electric-blue' },
  ]

  const rateUnits = [
    { value: '/min', label: 'per minute' },
    { value: '/hour', label: 'per hour' },
    { value: '/kWh', label: 'per kWh' },
    { value: '/GB', label: 'per GB' },
    { value: '/session', label: 'per session' },
  ]

  const isValidWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const handleSubmit = async () => {
    setError('')
    
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address')
      return
    }
    
    if (!isValidWalletAddress(walletAddress)) {
      setError('Please enter a valid Ethereum wallet address (0x...)')
      return
    }
    
    if (!serviceName.trim()) {
      setError('Please enter a service name')
      return
    }
    
    if (!rate || parseFloat(rate) <= 0) {
      setError('Please enter a valid rate')
      return
    }

    setLoading(true)
    
    try {
      const customService = addCustomService(
        walletAddress.trim(),
        serviceName.trim(),
        serviceType,
        rate,
        rateUnit
      )
      
      onServiceAdded(customService.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custom service')
    } finally {
      setLoading(false)
    }
  }

  const handleWalletAddressChange = (value: string) => {
    setWalletAddress(value)
    setError('')
    
    // Auto-generate service name if empty
    if (!serviceName && value.length >= 6) {
      const shortAddress = `${value.slice(0, 6)}...${value.slice(-4)}`
      setServiceName(`Wallet ${shortAddress}`)
    }
  }

  return (
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
        className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Wallet className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Add Custom Service</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Wallet Address */}
          <div>
            <label className="block text-gray-400 text-sm mb-3">
              Wallet Address *
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => handleWalletAddressChange(e.target.value)}
              placeholder="0x742d35Cc6634C0532925a3b8D404d3aABb8c4532"
              className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter the Ethereum wallet address that will receive payments
            </p>
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
              placeholder="My Custom Service"
              className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-gray-400 text-sm mb-3">
              Service Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {serviceTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setServiceType(type.id as any)}
                  className={`p-3 rounded-xl border transition-all duration-200 flex items-center space-x-3 ${
                    serviceType === type.id
                      ? 'bg-gray-800 border-purple-400 text-white'
                      : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <type.icon className={`w-5 h-5 ${serviceType === type.id ? 'text-purple-400' : type.color}`} />
                  <span className="text-sm font-medium">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-3">
                Rate *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.10"
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-3">
                Unit
              </label>
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value)}
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white focus:border-purple-400 focus:outline-none transition-colors"
              >
                {rateUnits.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          {walletAddress && serviceName && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-2">Preview:</p>
              <div className="flex items-center space-x-3">
                {serviceTypes.find(t => t.id === serviceType)?.icon && (
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    {(() => {
                      const IconComponent = serviceTypes.find(t => t.id === serviceType)!.icon
                      return <IconComponent className="w-5 h-5 text-purple-400" />
                    })()}
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{serviceName}</p>
                  <p className="text-gray-400 text-sm">${rate}{rateUnit}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !walletAddress.trim() || !serviceName.trim()}
            className="flex-1 py-3 bg-purple-500 text-white font-medium rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Service'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Custom services are saved locally and can be accessed via wallet address or service name
        </p>
      </motion.div>
    </motion.div>
  )
}