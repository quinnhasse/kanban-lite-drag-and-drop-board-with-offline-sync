import { useKanbanStore } from './store'

let onlineHandler: (() => void) | null = null
let offlineHandler: (() => void) | null = null

/**
 * Registers window online/offline listeners to update sync status.
 * Returns a cleanup function.
 */
export function initSyncListeners(): () => void {
  const { setSyncStatus } = useKanbanStore.getState()

  onlineHandler = () => {
    setSyncStatus('synced')
    // In a production app with a backend, this is where you'd flush
    // the pending mutations queue. Without a backend, IndexedDB IS
    // the source of truth, so "sync" means re-marking as synced.
    flushPendingQueue()
  }

  offlineHandler = () => {
    setSyncStatus('offline')
  }

  window.addEventListener('online', onlineHandler)
  window.addEventListener('offline', offlineHandler)

  // Set initial status
  if (!navigator.onLine) {
    setSyncStatus('offline')
  }

  return () => {
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
  }
}

/**
 * Processes any pending mutations. Currently marks them as synced since
 * IndexedDB is the source of truth in this single-player implementation.
 * Replace with real API calls to add a backend.
 */
async function flushPendingQueue(): Promise<void> {
  try {
    const { db } = await import('./db')
    const pending = await db.pendingMutations.toArray()
    if (pending.length === 0) return

    // In a real implementation: iterate pending, POST to API, delete on success
    await db.pendingMutations.clear()
    useKanbanStore.getState().setSyncStatus('synced')
  } catch {
    // Silent fail — mutations remain in IndexedDB and will retry on next reconnect
  }
}
