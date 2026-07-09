// ════════════════════════════════════════════════════════════
// EBOS PIN Lock — persists across sessions, auto-locks after 5 min idle
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'

const PIN_KEY        = 'ebos_pin'
const LAST_ACTIVE_KEY= 'ebos_last_active'
const IDLE_MS        = 5 * 60 * 1000  // 5 minutes

const hashPin = (pin: string) => btoa(pin + '-ebos-v1-2025')

export function usePinLock() {
  const [isLocked,    setIsLocked]    = useState(false)
  const [hasPin,      setHasPin]      = useState(false)
  const [wrongCount,  setWrongCount]  = useState(0)

  // On mount: fresh page load = app was closed → lock immediately if PIN exists
  useEffect(() => {
    const stored = localStorage.getItem(PIN_KEY)
    setHasPin(!!stored)
    if (stored) {
      // Always lock on fresh load (app was closed/killed)
      setIsLocked(true)
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
    }
  }, [])

  // Track visibility — lock when app returns after idle
  useEffect(() => {
    const onHide = () => {
      if (localStorage.getItem(PIN_KEY)) {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
      }
    }
    const onShow = () => {
      const stored = localStorage.getItem(PIN_KEY)
      if (!stored) return
      const last = localStorage.getItem(LAST_ACTIVE_KEY)
      const elapsed = last ? Date.now() - parseInt(last) : Infinity
      if (elapsed > IDLE_MS) setIsLocked(true)
    }
    document.addEventListener('visibilitychange', () => {
      document.hidden ? onHide() : onShow()
    })
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', () => {})
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  // Reset idle timer on user activity
  const resetIdle = useCallback(() => {
    if (localStorage.getItem(PIN_KEY)) {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
    }
  }, [])

  const setPin = useCallback((pin: string) => {
    localStorage.setItem(PIN_KEY, hashPin(pin))
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
    setHasPin(true)
    setIsLocked(false)
  }, [])

  const verifyPin = useCallback((pin: string): boolean => {
    const stored = localStorage.getItem(PIN_KEY)
    const correct = stored === hashPin(pin)
    if (correct) {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
      setIsLocked(false)
      setWrongCount(0)
    } else {
      setWrongCount(c => c + 1)
    }
    return correct
  }, [])

  const removePin = useCallback(() => {
    localStorage.removeItem(PIN_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
    setHasPin(false)
    setIsLocked(false)
  }, [])

  const manualLock = useCallback(() => {
    if (localStorage.getItem(PIN_KEY)) setIsLocked(true)
  }, [])

  return { isLocked, hasPin, wrongCount, setPin, verifyPin, removePin, manualLock, resetIdle }
}
