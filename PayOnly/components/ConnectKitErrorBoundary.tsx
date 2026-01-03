'use client'

import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ConnectKitErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a ConnectKit DOM error
    if (error.message.includes('removeChild') || error.message.includes('Node')) {
      console.warn('ConnectKit DOM error caught and handled:', error.message)
      return { hasError: false } // Don't show error UI for DOM cleanup issues
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log ConnectKit errors but don't crash the app
    if (error.message.includes('removeChild') || error.message.includes('Node')) {
      console.warn('ConnectKit DOM cleanup error (handled):', error, errorInfo)
      return
    }
    
    console.error('ConnectKit Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-red-400 text-sm">
            Wallet connection error. Please refresh the page.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}