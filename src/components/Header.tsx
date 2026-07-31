import type { SyncStatus } from '../types'
import styles from './Header.module.css'

interface HeaderProps {
  syncStatus: SyncStatus
}

const statusLabel: Record<SyncStatus, string> = {
  synced: 'Synced',
  pending: 'Pending',
  offline: 'Offline',
}

export function Header({ syncStatus }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Kanban Lite</h1>
      <div className={styles.status} data-status={syncStatus}>
        <span className={styles.dot} aria-hidden="true" />
        <span>{statusLabel[syncStatus]}</span>
      </div>
    </header>
  )
}
