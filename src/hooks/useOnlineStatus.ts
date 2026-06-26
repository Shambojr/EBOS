import { useState, useEffect } from 'react'
import { queueLength, flushQueue } from '../lib/offlineQueue'

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'failed'

export function useOnlineStatus() {
  const [status, setStatus] = useState<SyncStatus>(navigator.onLine ? 'online' : 'offline')
  const [pending, setPending] = useState(queueLength())

  useEffect(() => {
    const goOnline = async () => {
      setStatus('syncing')
      setPending(queueLength())
      await flushQueue((remaining) => setPending(remaining))
      const remaining = queueLength()
      setStatus(remaining > 0 ? 'failed' : 'online')
      setPending(remaining)
    }
    const goOffline = () => { setStatus('offline'); setPending(queueLength()) }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return { status, pending }
}
