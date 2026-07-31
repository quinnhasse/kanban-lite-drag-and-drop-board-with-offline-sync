import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import type { Card, Column as ColumnType } from '../types'
import { useKanbanStore } from '../store'
import { Column } from './Column'
import { CardItem } from './CardItem'
import styles from './Board.module.css'

export function Board() {
  const { columns, cards, addColumn, moveColumn, moveCard } = useKanbanStore()
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columnIds = columns.map((c) => c.id)

  function getCardsForColumn(colId: string): Card[] {
    return cards
      .filter((c) => c.columnId === colId)
      .sort((a, b) => a.order - b.order)
  }

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === 'card') {
      const card = cards.find((c) => c.id === event.active.id)
      setActiveCard(card ?? null)
      setActiveColumn(null)
    } else if (data?.type === 'column') {
      const col = columns.find((c) => c.id === event.active.id)
      setActiveColumn(col ?? null)
      setActiveCard(null)
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current

    if (activeData?.type !== 'card') return

    // Card dragged over another card or a column
    const activeCardId = active.id as string
    const activeCard = cards.find((c) => c.id === activeCardId)
    if (!activeCard) return

    let targetColumnId: string

    if (overData?.type === 'card') {
      const overCard = cards.find((c) => c.id === over.id)
      if (!overCard) return
      targetColumnId = overCard.columnId
    } else if (overData?.type === 'column') {
      targetColumnId = over.id as string
    } else {
      return
    }

    // If crossing columns, trigger optimistic move for visual feedback
    if (activeCard.columnId !== targetColumnId) {
      const destCards = cards
        .filter((c) => c.columnId === targetColumnId)
        .sort((a, b) => a.order - b.order)
      const overCardIndex = overData?.type === 'card'
        ? destCards.findIndex((c) => c.id === over.id)
        : destCards.length
      const insertIndex = overCardIndex === -1 ? destCards.length : overCardIndex
      moveCard(activeCardId, targetColumnId, insertIndex)
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    setActiveColumn(null)

    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData = over.data.current

    if (activeData?.type === 'column' && overData?.type === 'column') {
      const fromIndex = columns.findIndex((c) => c.id === active.id)
      const toIndex = columns.findIndex((c) => c.id === over.id)
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        await moveColumn(fromIndex, toIndex)
      }
      return
    }

    if (activeData?.type === 'card') {
      const activeCard = cards.find((c) => c.id === active.id)
      if (!activeCard) return

      let targetColumnId: string
      let targetIndex: number

      if (overData?.type === 'card') {
        const overCard = cards.find((c) => c.id === over.id)
        if (!overCard) return
        targetColumnId = overCard.columnId
        const colCards = cards
          .filter((c) => c.columnId === targetColumnId)
          .sort((a, b) => a.order - b.order)
        targetIndex = colCards.findIndex((c) => c.id === over.id)
      } else if (overData?.type === 'column') {
        targetColumnId = over.id as string
        const colCards = cards.filter((c) => c.columnId === targetColumnId)
        targetIndex = colCards.length
      } else {
        return
      }

      if (activeCard.columnId === targetColumnId) {
        const colCards = cards
          .filter((c) => c.columnId === targetColumnId)
          .sort((a, b) => a.order - b.order)
        const fromIdx = colCards.findIndex((c) => c.id === active.id)
        if (fromIdx !== targetIndex && fromIdx !== -1) {
          const reordered = arrayMove(colCards, fromIdx, targetIndex)
          for (let i = 0; i < reordered.length; i++) {
            if (reordered[i].order !== i) {
              await moveCard(active.id as string, targetColumnId, targetIndex)
              break
            }
          }
        }
      }
    }
  }

  async function handleAddColumn() {
    const title = newColTitle.trim()
    if (!title) { setAddingColumn(false); return }
    await addColumn(title)
    setNewColTitle('')
    setAddingColumn(false)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className={styles.board} role="main" aria-label="Kanban board">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={getCardsForColumn(col.id)}
              />
            ))}
        </SortableContext>

        <div className={styles.addColumnSection}>
          {addingColumn ? (
            <div className={styles.addColumnForm}>
              <input
                className={styles.addColumnInput}
                placeholder="Column title..."
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddColumn() }
                  if (e.key === 'Escape') { setAddingColumn(false); setNewColTitle('') }
                }}
                autoFocus
                aria-label="New column title"
              />
              <div className={styles.addColumnActions}>
                <button className={styles.confirmBtn} onClick={handleAddColumn}>
                  Add column
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => { setAddingColumn(false); setNewColTitle('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.addColumnBtn}
              onClick={() => setAddingColumn(true)}
              aria-label="Add new column"
            >
              + Add column
            </button>
          )}
        </div>
      </div>

      {createPortal(
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeCard && (
            <div className={styles.dragOverlayCard}>
              <CardItem card={activeCard} />
            </div>
          )}
          {activeColumn && (
            <div className={styles.dragOverlayColumn}>
              <Column
                column={activeColumn}
                cards={getCardsForColumn(activeColumn.id)}
              />
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}
