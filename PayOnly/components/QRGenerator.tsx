'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { Download, RefreshCw } from 'lucide-react'
import { generateMockQR } from '@/lib/envio'

interface QRGeneratorProps {
  onClose: () => void
}

export default function QRGenerator({ onClose }: QRGeneratorProps) {
  const [selectedService, setSelectedService] = useState<string>('0xGym')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const services = [
    { id: '0xGym', name: "Gold's Gym Premium", rate: '$0.10/min', color: 'text-gold', icon: '🏋️' },
    { id: '0xPower', name: 'Tesla Supercharger', rate: '$0.25/kWh', color: 'text-neon-green', icon: '⚡' },
    { id: '0xWiFi', name: 'WeWork Guest Network', rate: '$0.05/min', color: 'text-electric-blue', icon: '📶' },
  ]

  const generateQR = async (serviceId: string) => {
    setLoading(true)
    try {
      const qrData = generateMockQR(serviceId)
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#0a0a0a'
        },
        errorCorrectionLevel: 'M'
      })
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateQR(selectedService)
  }, [selectedService])

  const downloadQR = () => {
    if (qrDataUrl) {
      const link = document.createElement('a')
      link.download = `flexpass-${selectedService}.png`
      link.href = qrDataUrl
      link.click()
    }
  }

  const selectedServiceData = services.find(s => s.id === selectedService)

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
        className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Generate QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Service Selection */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">Select Service</p>
          <div className="space-y-2">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`w-full p-3 rounded-xl border transition-all duration-200 flex items-center space-x-3 ${
                  selectedService === service.id
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <span className="text-xl">{service.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-gray-400">{service.rate}</p>
                </div>
                {selectedService === service.id && (
                  <div className="w-2 h-2 bg-electric-blue rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="text-center mb-6">
          <div className="bg-white p-4 rounded-xl inline-block mb-4">
            {loading ? (
              <div className="w-[300px] h-[300px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-gray-600 animate-spin" />
              </div>
            ) : (
              <img src={qrDataUrl} alt="FlexPass QR Code" className="w-[300px] h-[300px]" />
            )}
          </div>
          
          {selectedServiceData && (
            <div className="text-center">
              <p className="text-white font-medium">{selectedServiceData.name}</p>
              <p className="text-gray-400 text-sm">{selectedServiceData.rate}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={() => generateQR(selectedService)}
            disabled={loading}
            className="flex-1 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
          
          <button
            onClick={downloadQR}
            disabled={loading || !qrDataUrl}
            className="flex-1 py-3 bg-electric-blue text-white font-medium rounded-xl hover:bg-electric-blue/80 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Print or display this QR code for users to scan with FlexPass
        </p>
      </motion.div>
    </motion.div>
  )
}