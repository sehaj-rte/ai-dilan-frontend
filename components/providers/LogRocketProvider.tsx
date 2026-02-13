'use client'

import { useEffect } from 'react'

export function LogRocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize LogRocket only on the client side
    if (typeof window !== 'undefined') {
      try {
        // Dynamic import to handle cases where LogRocket might not be installed yet
        import('logrocket').then((LogRocket) => {
          LogRocket.default.init('wjatyq/dilan')
          console.log('LogRocket initialized successfully')
        }).catch((error) => {
          console.warn('LogRocket not available:', error.message)
          console.log('Please install LogRocket: npm install --save logrocket')
        })
      } catch (error) {
        console.warn('Failed to initialize LogRocket:', error)
      }
    }
  }, [])

  return <>{children}</>
}
