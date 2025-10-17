// LogRocket utility functions for the application

/**
 * Identify a user in LogRocket for better session tracking
 * @param userId - Unique user identifier
 * @param userInfo - Additional user information
 */
export const identifyUser = async (userId: string, userInfo?: { 
  name?: string; 
  email?: string; 
  [key: string]: any 
}) => {
  try {
    const LogRocket = await import('logrocket')
    LogRocket.default.identify(userId, userInfo)
    console.log('LogRocket user identified:', userId)
  } catch (error) {
    console.warn('LogRocket identify failed:', error)
  }
}

/**
 * Track a custom event in LogRocket
 * @param eventName - Name of the event
 * @param properties - Event properties
 */
export const trackEvent = async (eventName: string, properties?: { [key: string]: any }) => {
  try {
    const LogRocket = await import('logrocket')
    LogRocket.default.track(eventName, properties)
    console.log('LogRocket event tracked:', eventName, properties)
  } catch (error) {
    console.warn('LogRocket track failed:', error)
  }
}

/**
 * Add tags to the current LogRocket session
 * @param tags - Array of tags or object with tag key-value pairs
 */
export const addSessionTags = async (tags: string[] | { [key: string]: string }) => {
  try {
    const LogRocket = await import('logrocket')
    // LogRocket doesn't have addTag method, use track with custom properties instead
    if (Array.isArray(tags)) {
      LogRocket.default.track('session_tags', { tags: tags.join(', ') })
    } else {
      LogRocket.default.track('session_tags', tags)
    }
    console.log('LogRocket tags tracked:', tags)
  } catch (error) {
    console.warn('LogRocket track tags failed:', error)
  }
}

/**
 * Capture an exception in LogRocket
 * @param error - Error object or message
 * @param extra - Additional context
 */
export const captureException = async (error: Error | string, extra?: { [key: string]: any }) => {
  try {
    const LogRocket = await import('logrocket')
    const errorObj = typeof error === 'string' ? new Error(error) : error
    LogRocket.default.captureException(errorObj, extra)
    console.log('LogRocket exception captured:', error)
  } catch (logRocketError) {
    console.warn('LogRocket captureException failed:', logRocketError)
  }
}

/**
 * Get the current LogRocket session URL
 * @returns Promise<string | null> - Session URL or null if LogRocket is not available
 */
export const getSessionURL = async (): Promise<string | null> => {
  try {
    const LogRocket = await import('logrocket')
    return LogRocket.default.sessionURL || null
  } catch (error) {
    console.warn('LogRocket getSessionURL failed:', error)
    return null
  }
}
