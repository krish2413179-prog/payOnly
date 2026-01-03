'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import QrScanner from 'qr-scanner'
import { Camera, X, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (data: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [error, setError] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    const initScanner = async () => {
      if (!videoRef.current) return

      try {
        // Check if camera is available
        const hasCamera = await QrScanner.hasCamera()
        setHasCamera(hasCamera)

        if (!hasCamera) {
          setError('No camera found on this device')
          return
        }

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            console.log('QR Code detected:', result.data)
            onScan(result.data)
            scanner.stop()
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment', // Use back camera if available
          }
        )

        setQrScanner(scanner)
        await scanner.start()
        setIsScanning(true)
      } catch (err) {
        console.error('Scanner initialization error:', err)
        setError('Failed to access camera. Please allow camera permissions.')
      }
    }

    initScanner()

    return () => {
      if (qrScanner) {
        qrScanner.stop()
        qrScanner.destroy()
      }
    }
  }, [onScan])

  const handleClose = () => {
    if (qrScanner) {
      qrScanner.stop()
      qrScanner.destroy()
    }
    onClose()
  }

  if (!hasCamera || error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      >
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full border border-gray-700 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Camera Access Required</h3>
          <p className="text-gray-400 mb-6">
            {error || 'Please allow camera access to scan QR codes'}
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gray-800 border border-gray-600 rounded-xl text-white font-medium hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      {/* Video Stream */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
            <p className="text-gray-300 text-sm">Point camera at FlexPass QR code</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanning Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative">
            {/* Scanner Frame */}
            <div className="w-64 h-64 relative">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-electric-blue" />
              <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-electric-blue" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-electric-blue" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-electric-blue" />
              
              {/* Scanning Line */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="scanner-overlay absolute inset-0" />
              </div>
            </div>
            
            {/* Instructions */}
            <div className="text-center mt-6">
              <p className="text-white font-medium mb-2">
                {isScanning ? 'Scanning...' : 'Initializing camera...'}
              </p>
              <p className="text-gray-300 text-sm">
                Align QR code within the frame
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center space-x-2 text-gray-300">
            <Camera className="w-5 h-5" />
            <span className="text-sm">Camera active - Looking for QR codes</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}