export interface Card {
  id: string
  title: string
  description: string
  columnId: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface Column {
  id: string
  title: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface Board {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export type DragType = 'card' | 'column'

export interface DragData {
  type: DragType
  id: string
  columnId?: string
}

export type SyncStatus = 'synced' | 'pending' | 'offline'

export interface PendingMutation {
  id: string
  type: 'card' | 'column' | 'board'
  action: 'create' | 'update' | 'delete'
  payload: unknown
  timestamp: number
}
