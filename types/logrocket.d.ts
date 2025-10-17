declare global {
  interface Window {
    LogRocket?: {
      init: (appId: string) => void
      identify: (userId: string, userInfo?: Record<string, any>) => void
      track: (eventName: string, properties?: Record<string, any>) => void
      captureMessage: (message: string, options?: Record<string, any>) => void
    }
  }
}

export {}
