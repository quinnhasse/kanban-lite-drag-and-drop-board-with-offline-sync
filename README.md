# kanban-lite

Drag-and-drop kanban board. Works offline after first load.

**Stack:** React 18, TypeScript, Zustand, Dexie (IndexedDB), @dnd-kit, Vite, vite-plugin-pwa

## Features

- Drag cards between columns and reorder both cards and columns
- Keyboard navigation: Tab to a drag handle, Space/Enter to activate, arrow keys to move, Space/Enter to drop (WCAG AA)
- IndexedDB persistence via Dexie — state survives page refresh without a backend
- Service worker caches all assets; the app loads fully offline after the first visit
- Optimistic updates with rollback: mutations apply immediately to the store; IndexedDB write failures revert the change
- Sync status indicator shows `Synced` / `Offline` based on `navigator.onLine`

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Test

```bash
# Unit tests (Vitest, fake-indexeddb)
npm test

# Type check
npm run typecheck

# E2E tests (Playwright, requires a build)
npm run build
npm run test:e2e
```

## Architecture

```
src/
  types.ts          — Board, Column, Card, PendingMutation interfaces
  db.ts             — Dexie schema, seedIfEmpty, loadAll
  store.ts          — Zustand store with immer middleware; all mutations
                      write optimistically then persist to IndexedDB
  sync.ts           — window online/offline listeners; flushes pending
                      mutation queue on reconnect
  components/
    Board.tsx        — DndContext, SortableContext for columns, drag handlers
    Column.tsx       — SortableContext for cards, inline add/edit
    CardItem.tsx     — useSortable hook, inline title edit, drag handle
    Header.tsx       — title + sync status dot
e2e/
  board.spec.ts     — Playwright: load, add/delete card, column add,
                      keyboard focus, offline status
```

## Offline sync model

Dexie is the source of truth for persistence. Every Zustand mutation writes to IndexedDB synchronously after updating the store. The app boots by reading from IndexedDB, so it works fully offline after the first load.

The `pendingMutations` table is a queue for future backend integration. When `window.online` fires, the queue is flushed. Currently there is no remote backend, so flush just clears the queue and marks status as `Synced`. Swap `flushPendingQueue` in `sync.ts` with real API calls to add server sync.

## Deploy

Deployed to Vercel. `vercel.json` has SPA rewrites and long-term asset caching headers.
