import Dexie, { type Table } from 'dexie'
import type { Board, Card, Column, PendingMutation } from './types'

export class KanbanDB extends Dexie {
  boards!: Table<Board>
  columns!: Table<Column>
  cards!: Table<Card>
  pendingMutations!: Table<PendingMutation>

  constructor() {
    super('kanban-lite')

    this.version(1).stores({
      boards: '&id, title, createdAt',
      columns: '&id, order, createdAt',
      cards: '&id, columnId, order, createdAt',
      pendingMutations: '&id, type, action, timestamp',
    })
  }
}

export const db = new KanbanDB()

/**
 * Seeds the database with a default board and columns if empty.
 */
export async function seedIfEmpty(): Promise<void> {
  const boardCount = await db.boards.count()
  if (boardCount > 0) return

  const now = Date.now()

  const board: Board = {
    id: 'board-default',
    title: 'My Board',
    createdAt: now,
    updatedAt: now,
  }

  const columns: Column[] = [
    { id: 'col-todo', title: 'To Do', order: 0, createdAt: now, updatedAt: now },
    { id: 'col-inprogress', title: 'In Progress', order: 1, createdAt: now, updatedAt: now },
    { id: 'col-done', title: 'Done', order: 2, createdAt: now, updatedAt: now },
  ]

  const cards: Card[] = [
    {
      id: 'card-1',
      title: 'Set up project',
      description: 'Initialize repo and install dependencies',
      columnId: 'col-done',
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'card-2',
      title: 'Build drag-and-drop',
      description: 'Wire up dnd-kit for card and column reordering',
      columnId: 'col-inprogress',
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'card-3',
      title: 'Add offline sync',
      description: 'Persist state to IndexedDB via Dexie',
      columnId: 'col-todo',
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'card-4',
      title: 'Write E2E tests',
      description: 'Cover drag, keyboard, and offline scenarios with Playwright',
      columnId: 'col-todo',
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
  ]

  await db.transaction('rw', db.boards, db.columns, db.cards, async () => {
    await db.boards.add(board)
    await db.columns.bulkAdd(columns)
    await db.cards.bulkAdd(cards)
  })
}

/**
 * Loads all board data from IndexedDB in one transaction.
 */
export async function loadAll(): Promise<{
  columns: Column[]
  cards: Card[]
}> {
  const [columns, cards] = await Promise.all([
    db.columns.orderBy('order').toArray(),
    db.cards.orderBy('order').toArray(),
  ])
  return { columns, cards }
}
