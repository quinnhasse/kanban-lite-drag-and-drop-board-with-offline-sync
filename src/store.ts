import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Card, Column, SyncStatus } from './types'
import { db, loadAll, seedIfEmpty } from './db'

export interface KanbanState {
  columns: Column[]
  cards: Card[]
  isHydrated: boolean
  syncStatus: SyncStatus

  // Actions
  hydrate: () => Promise<void>
  addColumn: (title: string) => Promise<void>
  updateColumn: (id: string, title: string) => Promise<void>
  deleteColumn: (id: string) => Promise<void>
  moveColumn: (fromIndex: number, toIndex: number) => Promise<void>
  addCard: (columnId: string, title: string, description?: string) => Promise<void>
  updateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description'>>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => Promise<void>
  setSyncStatus: (status: SyncStatus) => void
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export const useKanbanStore = create<KanbanState>()(
  immer((set, get) => ({
    columns: [],
    cards: [],
    isHydrated: false,
    syncStatus: 'synced',

    hydrate: async () => {
      await seedIfEmpty()
      const { columns, cards } = await loadAll()
      set((s) => {
        s.columns = columns
        s.cards = cards
        s.isHydrated = true
      })
    },

    addColumn: async (title: string) => {
      const now = Date.now()
      const col: Column = {
        id: generateId('col'),
        title,
        order: get().columns.length,
        createdAt: now,
        updatedAt: now,
      }
      const snapshot = get().columns.slice()
      set((s) => { s.columns.push(col) })
      try {
        await db.columns.add(col)
      } catch (err) {
        set((s) => { s.columns = snapshot })
        throw err
      }
    },

    updateColumn: async (id: string, title: string) => {
      const prev = get().columns.find((c) => c.id === id)
      if (!prev) return
      const now = Date.now()
      set((s) => {
        const col = s.columns.find((c) => c.id === id)
        if (col) { col.title = title; col.updatedAt = now }
      })
      try {
        await db.columns.update(id, { title, updatedAt: now })
      } catch (err) {
        set((s) => {
          const col = s.columns.find((c) => c.id === id)
          if (col && prev) { col.title = prev.title; col.updatedAt = prev.updatedAt }
        })
        throw err
      }
    },

    deleteColumn: async (id: string) => {
      const prevCols = get().columns.slice()
      const prevCards = get().cards.slice()
      set((s) => {
        s.columns = s.columns.filter((c) => c.id !== id)
        s.cards = s.cards.filter((c) => c.columnId !== id)
      })
      try {
        const cardIds = prevCards.filter((c) => c.columnId === id).map((c) => c.id)
        await db.transaction('rw', db.columns, db.cards, async () => {
          await db.columns.delete(id)
          await db.cards.bulkDelete(cardIds)
        })
      } catch (err) {
        set((s) => { s.columns = prevCols; s.cards = prevCards })
        throw err
      }
    },

    moveColumn: async (fromIndex: number, toIndex: number) => {
      const prevCols = get().columns.slice()
      set((s) => {
        const [moved] = s.columns.splice(fromIndex, 1)
        s.columns.splice(toIndex, 0, moved)
        s.columns.forEach((c, i) => { c.order = i; c.updatedAt = Date.now() })
      })
      try {
        const updates = get().columns.map((c) => ({ key: c.id, changes: { order: c.order, updatedAt: c.updatedAt } }))
        await db.transaction('rw', db.columns, async () => {
          for (const u of updates) {
            await db.columns.update(u.key, u.changes)
          }
        })
      } catch (err) {
        set((s) => { s.columns = prevCols })
        throw err
      }
    },

    addCard: async (columnId: string, title: string, description = '') => {
      const now = Date.now()
      const cardsInCol = get().cards.filter((c) => c.columnId === columnId)
      const card: Card = {
        id: generateId('card'),
        title,
        description,
        columnId,
        order: cardsInCol.length,
        createdAt: now,
        updatedAt: now,
      }
      const snapshot = get().cards.slice()
      set((s) => { s.cards.push(card) })
      try {
        await db.cards.add(card)
      } catch (err) {
        set((s) => { s.cards = snapshot })
        throw err
      }
    },

    updateCard: async (id: string, updates: Partial<Pick<Card, 'title' | 'description'>>) => {
      const prev = get().cards.find((c) => c.id === id)
      if (!prev) return
      const now = Date.now()
      set((s) => {
        const card = s.cards.find((c) => c.id === id)
        if (card) {
          if (updates.title !== undefined) card.title = updates.title
          if (updates.description !== undefined) card.description = updates.description
          card.updatedAt = now
        }
      })
      try {
        await db.cards.update(id, { ...updates, updatedAt: now })
      } catch (err) {
        set((s) => {
          const card = s.cards.find((c) => c.id === id)
          if (card && prev) {
            card.title = prev.title
            card.description = prev.description
            card.updatedAt = prev.updatedAt
          }
        })
        throw err
      }
    },

    deleteCard: async (id: string) => {
      const snapshot = get().cards.slice()
      set((s) => { s.cards = s.cards.filter((c) => c.id !== id) })
      try {
        await db.cards.delete(id)
      } catch (err) {
        set((s) => { s.cards = snapshot })
        throw err
      }
    },

    moveCard: async (cardId: string, toColumnId: string, toIndex: number) => {
      const prevCards = get().cards.slice()
      const now = Date.now()

      set((s) => {
        const card = s.cards.find((c) => c.id === cardId)
        if (!card) return

        // Remove card from current position
        s.cards = s.cards.filter((c) => c.id !== cardId)

        // Reorder remaining cards in source column
        const srcCards = s.cards.filter((c) => c.columnId === card.columnId)
        srcCards.forEach((c, i) => { c.order = i })

        // Insert into destination column
        card.columnId = toColumnId
        card.updatedAt = now

        const destCards = s.cards.filter((c) => c.columnId === toColumnId)
        destCards.splice(toIndex, 0, card)
        destCards.forEach((c, i) => { c.order = i })

        s.cards.push(card)
      })

      try {
        const updatedCards = get().cards
        await db.transaction('rw', db.cards, async () => {
          for (const c of updatedCards) {
            await db.cards.update(c.id, { columnId: c.columnId, order: c.order, updatedAt: c.updatedAt })
          }
        })
      } catch (err) {
        set((s) => { s.cards = prevCards })
        throw err
      }
    },

    setSyncStatus: (status: SyncStatus) => {
      set((s) => { s.syncStatus = status })
    },
  }))
)
