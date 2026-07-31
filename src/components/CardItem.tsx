import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { useKanbanStore } from '../store'
import styles from './CardItem.module.css'

interface CardItemProps {
  card: Card
}

export function CardItem({ card }: CardItemProps) {
  const { updateCard, deleteCard } = useKanbanStore()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', id: card.id, columnId: card.columnId },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  function startEdit() {
    setEditTitle(card.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function commitEdit() {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== card.title) {
      await updateCard(card.id, { title: trimmed })
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false); setEditTitle(card.title) }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.card}
      data-card-id={card.id}
      aria-label={`Card: ${card.title}`}
    >
      <div
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${card.title}`}
        role="button"
        tabIndex={0}
      >
        <span className={styles.dragIcon} aria-hidden="true">⠿</span>
      </div>

      <div className={styles.content}>
        {editing ? (
          <input
            ref={inputRef}
            className={styles.titleInput}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            aria-label="Edit card title"
          />
        ) : (
          <p
            className={styles.title}
            onDoubleClick={startEdit}
            title="Double-click to edit"
          >
            {card.title}
          </p>
        )}
        {card.description && !editing && (
          <p className={styles.description}>{card.description}</p>
        )}
      </div>

      <button
        className={styles.deleteBtn}
        onClick={() => deleteCard(card.id)}
        aria-label={`Delete ${card.title}`}
        title="Delete card"
      >
        ×
      </button>
    </div>
  )
}
