'use client'

import { useState, useEffect } from 'react'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    
    // Cleanup function to handle ConnectKit DOM issues
    return () => {
      // Clean up any lingering modals or overlays
      try {
        const overlays = document.querySelectorAll('[data-connectkit-overlay]')
        const modals = document.querySelectorAll('[data-connectkit-modal]')
        const portals = document.querySelectorAll('[data-connectkit-portal]')
        
        ;[...overlays, ...modals, ...portals].forEach(element => {
          try {
            if (element.parentNode) {
              element.parentNode.removeChild(element)
            }
          } catch (e) {
            // Ignore errors during cleanup
          }
        })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}