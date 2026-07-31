import { useEffect } from 'react'
import { useKanbanStore } from './store'
import { initSyncListeners } from './sync'
import { Board } from './components/Board'
import { Header } from './components/Header'
import './index.css'

export default function App() {
  const { hydrate, isHydrated, syncStatus } = useKanbanStore()

  useEffect(() => {
    hydrate()
    const cleanup = initSyncListeners()
    return cleanup
  }, [hydrate])

  if (!isHydrated) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
        aria-live="polite"
        aria-label="Loading board data"
      >
        Loading...
      </div>
    )
  }

  return (
    <>
      <Header syncStatus={syncStatus} />
      <Board />
    </>
  )
}
