import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'

describe('Dexie persistence — seedIfEmpty', () => {
  beforeEach(async () => {
    // Re-import gets a fresh fake-indexeddb instance per test suite run
  })

  it('seeds default board, columns, and cards on first run', async () => {
    const { db, seedIfEmpty } = await import('../db')

    await seedIfEmpty()

    const boards = await db.boards.toArray()
    expect(boards).toHaveLength(1)
    expect(boards[0].title).toBe('My Board')

    const columns = await db.columns.toArray()
    expect(columns.length).toBeGreaterThanOrEqual(3)
    expect(columns.map((c) => c.title)).toContain('To Do')
    expect(columns.map((c) => c.title)).toContain('In Progress')
    expect(columns.map((c) => c.title)).toContain('Done')

    const cards = await db.cards.toArray()
    expect(cards.length).toBeGreaterThan(0)
  })

  it('does not seed twice', async () => {
    const { db, seedIfEmpty } = await import('../db')

    await seedIfEmpty()
    await seedIfEmpty()

    const boards = await db.boards.toArray()
    expect(boards).toHaveLength(1)
  })
})

describe('Dexie persistence — loadAll', () => {
  it('returns columns sorted by order and cards sorted by order', async () => {
    const { db, seedIfEmpty, loadAll } = await import('../db')

    await seedIfEmpty()

    const { columns, cards } = await loadAll()

    expect(columns.length).toBeGreaterThan(0)
    for (let i = 1; i < columns.length; i++) {
      expect(columns[i].order).toBeGreaterThanOrEqual(columns[i - 1].order)
    }

    const colCards = cards.filter((c) => c.columnId === columns[0].id)
    for (let i = 1; i < colCards.length; i++) {
      expect(colCards[i].order).toBeGreaterThanOrEqual(colCards[i - 1].order)
    }
  })
})

describe('Dexie persistence — CRUD', () => {
  it('stores and retrieves a card', async () => {
    const { db, seedIfEmpty } = await import('../db')
    await seedIfEmpty()

    const cols = await db.columns.toArray()
    const col = cols[0]
    const now = Date.now()

    await db.cards.add({
      id: 'test-card-direct',
      title: 'Direct write',
      description: 'desc',
      columnId: col.id,
      order: 99,
      createdAt: now,
      updatedAt: now,
    })

    const found = await db.cards.get('test-card-direct')
    expect(found?.title).toBe('Direct write')
    expect(found?.columnId).toBe(col.id)
  })

  it('updates a card field', async () => {
    const { db, seedIfEmpty } = await import('../db')
    await seedIfEmpty()

    const card = (await db.cards.toArray())[0]
    await db.cards.update(card.id, { title: 'Updated via DB' })

    const updated = await db.cards.get(card.id)
    expect(updated?.title).toBe('Updated via DB')
  })

  it('deletes a card', async () => {
    const { db, seedIfEmpty } = await import('../db')
    await seedIfEmpty()

    const card = (await db.cards.toArray())[0]
    await db.cards.delete(card.id)

    const found = await db.cards.get(card.id)
    expect(found).toBeUndefined()
  })
})
