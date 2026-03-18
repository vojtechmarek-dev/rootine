# ADR 005: Why Offline Sync Engine?

## Context

Rootine is mobile-first and frequently used in low-connectivity environments (subway, elevators, poor cellular coverage). The previous mutation flow relied on immediate server availability. If a user tapped "Done" while offline, the action could fail and be lost, creating an unreliable habit-tracking experience.

The goal is to make habit completion resilient while preserving fast interaction feedback.

## Options Considered

1. **Direct server calls only**: Simple implementation, but unreliable offline behavior and possible data loss.
2. **Full offline-first data layer with IndexedDB cache and conflict resolution**: Very robust, but significantly larger implementation scope.
3. **Queue-based sync engine with local persistence + replay on reconnect**: Focused reliability for write actions with manageable complexity.

## Decision

We chose a **queue-based offline sync engine** for activity toggle actions.

## Detailed Reasoning

### 1. User Experience Reliability

The UI updates optimistically immediately. If the network is unavailable, the action is persisted locally and marked pending instead of being discarded.

### 2. Progressive Complexity

A queue-based write-sync approach addresses the most painful failure mode first (lost completion actions) without committing to a full local replica architecture.

### 3. Operational Fit With Existing SvelteKit Pattern

Rootine already uses form actions for primary mutations. The sync engine adds a dedicated replay endpoint (`/api/sync`) for queued actions, which is an appropriate targeted use of `+server.ts`.

### 4. Clear Ownership and Security Boundaries

Replay requests are authenticated and activity ownership is validated server-side before applying DB mutations.

### 5. Deterministic Replay

Pending actions are replayed in FIFO order, with successful items removed from local storage. This provides predictable behavior and straightforward debugging.

## Consequences

- **Positive**
  - Habit completion remains reliable in offline or flaky network conditions.
  - Users retain confidence because taps are not lost.
  - Implementation is contained to sync-focused modules and one replay endpoint.

- **Negative**
  - Added client complexity (queue management, online listeners, replay coordination).
  - Potential edge cases if users rapidly toggle while offline for long periods.
  - Not a full offline read model; current scope is reliable write replay.

## Scope Boundaries

This ADR covers only `complete`/`undo` action durability and replay.

Out of scope:

- Full activity/query caching for offline reads.
- Offline support for create/edit activity flows.
- Advanced conflict resolution beyond ordered replay and server truth refresh.
