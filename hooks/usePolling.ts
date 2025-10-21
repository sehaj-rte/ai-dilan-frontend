import { useEffect, useRef, useCallback } from 'react'

interface UsePollingOptions {
  interval?: number
  immediate?: boolean
  enabled?: boolean
}

/**
 * Custom hook for polling functionality
 * @param callback - Function to execute on each poll
 * @param options - Polling configuration options
 */
export const usePolling = (
  callback: () => void | Promise<void>,
  options: UsePollingOptions = {}
) => {
  const {
    interval = 5000, // Default 5 seconds
    immediate = true,
    enabled = true
  } = options

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (enabled) {
      intervalRef.current = setInterval(() => {
        callbackRef.current()
      }, interval)
    }
  }, [interval, enabled])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const restartPolling = useCallback(() => {
    stopPolling()
    startPolling()
  }, [startPolling, stopPolling])

  // Start polling on mount if immediate is true
  useEffect(() => {
    if (immediate && enabled) {
      // Execute immediately if requested
      callbackRef.current()
      startPolling()
    } else if (enabled) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [immediate, enabled, startPolling, stopPolling])

  // Restart polling when interval changes
  useEffect(() => {
    if (enabled) {
      restartPolling()
    }
  }, [interval, restartPolling, enabled])

  return {
    startPolling,
    stopPolling,
    restartPolling,
    isPolling: intervalRef.current !== null
  }
}

/**
 * Hook for conditional polling based on a condition
 * @param callback - Function to execute on each poll
 * @param condition - Condition to determine if polling should continue
 * @param options - Polling configuration options
 */
export const useConditionalPolling = (
  callback: () => void | Promise<void>,
  condition: () => boolean,
  options: UsePollingOptions = {}
) => {
  const wrappedCallback = useCallback(async () => {
    if (condition()) {
      await callback()
    }
  }, [callback, condition])

  return usePolling(wrappedCallback, {
    ...options,
    enabled: options.enabled !== false && condition()
  })
}
