'use client'

import React, { useState, useEffect, ReactNode } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon, baseSepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider, getDefaultConfig } from 'connectkit'

const config = createConfig(
  getDefaultConfig({
    // Your dApps chains - Added Base Sepolia
    chains: [mainnet, sepolia, polygon, baseSepolia],
    transports: {
      // RPC URL for each chain
      [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`),
      [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`),
      [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`),
      [baseSepolia.id]: http(`https://sepolia.base.org`), // Base Sepolia RPC
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',

    // Required App Info
    appName: 'FlexPass',
    appDescription: 'Universal Pay-As-You-Go Access Protocol',
    appUrl: 'http://localhost:3000', // Fixed URL for development
    appIcon: 'https://flexpass.app/logo.png',
  }),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Error Boundary Component
class Web3ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Web3 Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Connection Error</h2>
            <p className="text-gray-400 mb-4">There was an issue with the Web3 connection.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/80 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Clean up any lingering ConnectKit modals or overlays
      const modals = document.querySelectorAll('[data-connectkit-modal]')
      modals.forEach(modal => {
        try {
          modal.remove()
        } catch (e) {
          // Ignore errors during cleanup
        }
      })
    }
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">Loading FlexPass...</p>
        </div>
      </div>
    )
  }

  return (
    <Web3ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider
            theme="midnight"
            mode="dark"
            options={{
              hideBalance: false,
              hideTooltips: false,
              hideQuestionMarkCTA: false,
              hideNoWalletCTA: false,
              walletConnectCTA: 'both',
              enforceSupportedChains: true,
              embedGoogleFonts: true,
              disclaimer: undefined, // Remove disclaimer to prevent DOM issues
            }}
            customTheme={{
              '--ck-connectbutton-font-size': '16px',
              '--ck-connectbutton-border-radius': '12px',
              '--ck-connectbutton-color': '#ffffff',
              '--ck-connectbutton-background': '#6366f1',
              '--ck-connectbutton-background-hover': '#5855eb',
              '--ck-primary-button-border-radius': '12px',
              '--ck-modal-background': '#111827',
              '--ck-modal-box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              '--ck-overlay-background': 'rgba(0, 0, 0, 0.8)',
              '--ck-overlay-backdrop-filter': 'blur(8px)',
            }}
          >
            {children}
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Web3ErrorBoundary>
  )
}