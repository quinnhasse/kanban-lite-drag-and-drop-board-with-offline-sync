import { useState, useRef } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import type { Card, Column as ColumnType } from '../types'
import { useKanbanStore } from '../store'
import { CardItem } from './CardItem'
import styles from './Column.module.css'

interface ColumnProps {
  column: ColumnType
  cards: Card[]
}

export function Column({ column, cards }: ColumnProps) {
  const { addCard, updateColumn, deleteColumn } = useKanbanStore()
  const [addingCard, setAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(column.title)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', id: column.id },
  })

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: column.id,
    data: { type: 'column', id: column.id },
  })

  function mergeRefs(...refs: React.Ref<HTMLDivElement>[]) {
    return (node: HTMLDivElement | null) => {
      refs.forEach((ref) => {
        if (typeof ref === 'function') ref(node)
        else if (ref && typeof ref === 'object') {
          ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      })
    }
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  const cardIds = cards.map((c) => c.id)

  async function handleAddCard() {
    const title = newCardTitle.trim()
    if (!title) { setAddingCard(false); return }
    await addCard(column.id, title)
    setNewCardTitle('')
    setAddingCard(false)
  }

  function startAddCard() {
    setAddingCard(true)
    setTimeout(() => addInputRef.current?.focus(), 0)
  }

  async function commitTitleEdit() {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== column.title) {
      await updateColumn(column.id, trimmed)
    }
    setEditingTitle(false)
  }

  function startTitleEdit() {
    setEditTitle(column.title)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  return (
    <div
      ref={mergeRefs(setSortableRef, setDropRef)}
      style={style}
      className={`${styles.column} ${isOver ? styles.dragOver : ''}`}
      data-column-id={column.id}
      aria-label={`Column: ${column.title}, ${cards.length} cards`}
    >
      <div className={styles.header}>
        <div
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label={`Drag column ${column.title}`}
          role="button"
          tabIndex={0}
        >
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className={styles.titleInput}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitTitleEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitTitleEdit() }
                if (e.key === 'Escape') { setEditingTitle(false); setEditTitle(column.title) }
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Edit column title"
            />
          ) : (
            <h2 className={styles.title} onDoubleClick={startTitleEdit} title="Double-click to edit">
              {column.title}
            </h2>
          )}
        </div>
        <div className={styles.actions}>
          <span className={styles.count} aria-label={`${cards.length} cards`}>{cards.length}</span>
          <button
            className={styles.deleteBtn}
            onClick={() => deleteColumn(column.id)}
            aria-label={`Delete column ${column.title}`}
            title="Delete column"
          >
            ×
          </button>
        </div>
      </div>

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className={styles.cardList} data-column-cards>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
          {cards.length === 0 && !addingCard && (
            <div className={styles.empty} aria-label="Empty column">No cards</div>
          )}
        </div>
      </SortableContext>

      <div className={styles.footer}>
        {addingCard ? (
          <div className={styles.addForm}>
            <input
              ref={addInputRef}
              className={styles.addInput}
              placeholder="Card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddCard() }
                if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle('') }
              }}
              aria-label="New card title"
            />
            <div className={styles.addActions}>
              <button className={styles.confirmBtn} onClick={handleAddCard}>Add card</button>
              <button className={styles.cancelBtn} onClick={() => { setAddingCard(false); setNewCardTitle('') }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className={styles.addBtn} onClick={startAddCard} aria-label={`Add card to ${column.title}`}>
            + Add card
          </button>
        )}
      </div>
    </div>
  )
}
