import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UseIdleTimeoutOptions {
  idleMs?: number
  warningMs?: number
  onTimeout: () => void
}

interface UseIdleTimeoutResult {
  isWarning: boolean
  remainingSeconds: number
  acknowledgeAndReset: () => void
}

/**
 * Tracks user activity and triggers a warning state after `idleMs`.
 * If not acknowledged within `warningMs`, calls `onTimeout`.
 */
export function useIdleTimeout(options: UseIdleTimeoutOptions): UseIdleTimeoutResult {
  const {
    idleMs = 5 * 60 * 1000, // 5 minutes
    warningMs = 30 * 1000,  // 30 seconds
    onTimeout,
  } = options

  const [isWarning, setIsWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(Math.ceil(warningMs / 1000))

  const idleTimerRef = useRef<number | null>(null)
  const warningTimerRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  const startIdleTimer = useCallback(() => {
    idleTimerRef.current = window.setTimeout(() => {
      // Enter warning state
      setIsWarning(true)
      setRemainingSeconds(Math.ceil(warningMs / 1000))

      // Start countdown display
      countdownIntervalRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => Math.max(prev - 1, 0))
      }, 1000)

      // Execute timeout if not acknowledged within warning window
      warningTimerRef.current = window.setTimeout(() => {
        // Ensure countdown stops
        if (countdownIntervalRef.current) {
          window.clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        setIsWarning(false)
        onTimeout()
      }, warningMs)
    }, idleMs)
  }, [idleMs, warningMs, onTimeout])

  const resetAll = useCallback(() => {
    setIsWarning(false)
    setRemainingSeconds(Math.ceil(warningMs / 1000))
    clearTimers()
    startIdleTimer()
  }, [clearTimers, startIdleTimer, warningMs])

  const acknowledgeAndReset = useCallback(() => {
    resetAll()
  }, [resetAll])

  const activityHandler = useMemo(
    () => () => {
      // Any user activity resets the timers (also dismisses warning)
      resetAll()
    },
    [resetAll]
  )

  useEffect(() => {
    // Kick off initial idle timer
    startIdleTimer()

    // Activity events that should count as user presence
    const events: Array<keyof DocumentEventMap | keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'visibilitychange',
    ]

    events.forEach((evt) => {
      // visibilitychange fires on document
      if (evt === 'visibilitychange') {
        document.addEventListener(evt, activityHandler, { passive: true })
      } else {
        window.addEventListener(evt as any, activityHandler as any, { passive: true })
      }
    })

    return () => {
      clearTimers()
      events.forEach((evt) => {
        if (evt === 'visibilitychange') {
          document.removeEventListener(evt, activityHandler as any)
        } else {
          window.removeEventListener(evt as any, activityHandler as any)
        }
      })
    }
  }, [activityHandler, clearTimers, startIdleTimer])

  return { isWarning, remainingSeconds, acknowledgeAndReset }
}


