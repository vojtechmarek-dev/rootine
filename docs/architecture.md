# Rootine Architecture

## System Overview

Rootine uses a server-rendered SvelteKit application with progressive enhancement for mutations and a mobile-first UI shell.

- Frontend: SvelteKit + Svelte 5 runes + Tailwind + shadcn-svelte components.
- Backend: SvelteKit server load functions and form actions.
- Database: Neon Postgres through Drizzle ORM.
- Validation: Zod for form boundaries and polymorphic JSONB payloads.
- Auth: Auth.js session-based flow in server hooks.

## Core Data Model

Rootine follows a polymorphic model:

- `activity` table stores all activity types (`habit`, `plant`, `workout`) in one place.
- `log` table stores completion history with a generic JSONB `data` blob.
- Zod discriminated unions are the source of truth for valid activity and log payload shapes.

## Dashboard Request Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as DashboardUI
    participant Load as PageServerLoad
    participant Svc as DashboardService
    participant DB as NeonPostgres

    User->>UI: Open dashboard
    UI->>Load: GET /(app)
    Load->>Svc: getDashboardActivities(userId, targetDate)
    Svc->>DB: Query activity + log records
    DB-->>Svc: Rows
    Svc-->>Load: Validated DashboardActivity[]
    Load-->>UI: Rendered page + hydrated data
```

## Offline Sync Engine (Habit Completion Reliability)

To prevent data loss when connectivity drops, habit toggles use an offline-first sync pipeline:

```mermaid
sequenceDiagram
    participant User
    participant Card as ActivityCard
    participant Queue as LocalStorageQueue
    participant Sync as SyncEngine
    participant Api as SyncApi
    participant DB as NeonPostgres

    User->>Card: Tap Done/Undo
    Card->>Card: Optimistic UI update
    alt Offline or network error
        Card->>Queue: Persist pending action
        Card-->>User: Keep optimistic state visible
    else Online success
        Card->>Api: Form action / toggle
        Api->>DB: Write log mutation
        Api-->>Card: Success
    end
    Sync->>Queue: Read pending actions on online event
    loop Pending items
        Sync->>Api: POST /api/sync
        Api->>DB: Replay action
        Api-->>Sync: Success/Failure
        Sync->>Queue: Remove successful item
    end
```

### Sync Responsibilities

- `src/lib/components/activity/ActivityCard.svelte`: optimistic UI and queue fallback.
- `src/lib/sync/queue.ts`: localStorage persistence and queue operations.
- `src/lib/sync/network.svelte.ts`: online/offline reactive state.
- `src/lib/sync/engine.svelte.ts`: replay orchestration on reconnect.
- `src/routes/api/sync/+server.ts`: authenticated server endpoint for replaying queued actions.

### Consistency Model

- Optimistic updates are immediate on user interaction.
- Local queue is the durability layer during offline periods.
- Reconnection triggers replay in FIFO order.
- Successful replay removes the local pending action.
- `invalidateAll()` refreshes dashboard state after replay to align client/server truth.
