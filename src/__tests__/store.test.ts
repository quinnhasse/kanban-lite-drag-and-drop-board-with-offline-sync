import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'

// Reset modules between tests to get a fresh store and DB
beforeEach(async () => {
  // Each test gets a fresh module instance via dynamic import
})

describe('Zustand store — column actions', () => {
  it('adds a column and persists to DB', async () => {
    const { useKanbanStore } = await import('../store')
    const { db } = await import('../db')

    const store = useKanbanStore.getState()
    await store.hydrate()

    const initialCount = useKanbanStore.getState().columns.length

    await store.addColumn('New Column')

    const state = useKanbanStore.getState()
    expect(state.columns).toHaveLength(initialCount + 1)
    expect(state.columns.at(-1)?.title).toBe('New Column')

    const dbCols = await db.columns.toArray()
    expect(dbCols.some((c) => c.title === 'New Column')).toBe(true)
  })

  it('updates a column title', async () => {
    const { useKanbanStore } = await import('../store')

    const store = useKanbanStore.getState()
    await store.hydrate()
    await store.addColumn('Before')

    const col = useKanbanStore.getState().columns.at(-1)!
    await store.updateColumn(col.id, 'After')

    const updated = useKanbanStore.getState().columns.find((c) => c.id === col.id)
    expect(updated?.title).toBe('After')
  })

  it('deletes a column and its cards', async () => {
    const { useKanbanStore } = await import('../store')

    const store = useKanbanStore.getState()
    await store.hydrate()
    await store.addColumn('Temp')

    const col = useKanbanStore.getState().columns.at(-1)!
    await store.addCard(col.id, 'Card in temp')
    await store.deleteColumn(col.id)

    const state = useKanbanStore.getState()
    expect(state.columns.find((c) => c.id === col.id)).toBeUndefined()
    expect(state.cards.filter((c) => c.columnId === col.id)).toHaveLength(0)
  })

  it('reorders columns', async () => {
    const { useKanbanStore } = await import('../store')

    const store = useKanbanStore.getState()
    await store.hydrate()

    const beforeCols = useKanbanStore.getState().columns
    expect(beforeCols.length).toBeGreaterThanOrEqual(2)

    const firstId = beforeCols[0].id
    const lastIndex = beforeCols.length - 1

    await store.moveColumn(0, lastIndex)

    const afterCols = useKanbanStore.getState().columns
    expect(afterCols[lastIndex].id).toBe(firstId)
    afterCols.forEach((c, i) => expect(c.order).toBe(i))
  })
})

describe('Zustand store — card actions', () => {
  it('adds a card to a column', async () => {
    const { useKanbanStore } = await import('../store')

    const store = useKanbanStore.getState()
    await store.hydrate()

    const col = useKanbanStore.getState().columns[0]
    const beforeCount = useKanbanStore.getState().cards.filter((c) => c.columnId === col.id).length

    await store.addCard(col.id, 'Test card', 'desc')

    const after = useKanbanStore.getState().cards.filter((c) => c.columnId === col.id)
    expect(after).toHaveLength(beforeCount + 1)
    expect(after.at(-1)?.title).toBe('Test card')
    expect(after.at(-1)?.description).toBe('desc')
  })

  it('updates a card title', async () => {
    const { useKanbanStore } = await import('../store')

    const store = useKanbanStore.getState()
    await store.hydrate()

    const col = useKanbanStore.getState().columns[0]
    await store.addCard(col.id, 'Old title')

    const card = useKanbanStore.getState().cards.at(-1)!
    await store.updateCard(card.id, { title: 'New title' })

    const updated = useKanbanStore.getState().cards.find((c) => c.id === card.id)
    expect(updated?.title).toBe('New title')
  })

  it('deletes a card', async () => {
    const { useKanbanStore } = await import('../store')

    const store = useKanbanStore.getState()
    await store.hydrate()

    const col = useKanbanStore.getState().columns[0]
    await store.addCard(col.id, 'To delete')

    const card = useKanbanStore.getState().cards.at(-1)!
    await store.deleteCard(card.id)

    expect(useKanbanStore.getState().cards.find((c) => c.id === card.id)).toBeUndefined()
  })

  it('moves a card between columns', async () => {
    const { useKanbanStore } = await import('../store')

    const store = useKanbanStore.getState()
    await store.hydrate()

    const cols = useKanbanStore.getState().columns
    const [src, dest] = cols

    await store.addCard(src.id, 'Moveable')
    const card = useKanbanStore.getState().cards.find(
      (c) => c.columnId === src.id && c.title === 'Moveable'
    )!

    await store.moveCard(card.id, dest.id, 0)

    const moved = useKanbanStore.getState().cards.find((c) => c.id === card.id)
    expect(moved?.columnId).toBe(dest.id)
    expect(moved?.order).toBe(0)
  })
})

describe('Zustand store — sync status', () => {
  it('sets sync status', async () => {
    const { useKanbanStore } = await import('../store')
    useKanbanStore.getState().setSyncStatus('offline')
    expect(useKanbanStore.getState().syncStatus).toBe('offline')
    useKanbanStore.getState().setSyncStatus('synced')
    expect(useKanbanStore.getState().syncStatus).toBe('synced')
  })
})
