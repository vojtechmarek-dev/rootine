# Architecture

## Sequence Diagram
```mermaid
sequenceDiagram
    participant User
    participant PWA as SvelteKit PWA (SPA)
    participant IDB as IndexedDB
    participant API as Vercel Serverless
    participant DB as Neon Postgres

    User->>PWA: Clicks "Complete Habit"
    PWA->>IDB: Save "Pending Action"
    PWA->>User: Update UI (Green)
    PWA->>API: Try Sync
    alt Online
        API->>DB: INSERT Log
        API-->>PWA: 200 OK
        PWA->>IDB: Remove Pending Action
    else Offline
        PWA-->>PWA: Keep in IDB (Retry later)
    end
```

## Architectural Decisions
All major architectural decisions are documented in the `docs/adr` folder.
- [ADR 001: Transition to Single Page Application (SPA) Mode for PWA](./adr/001-spa-mode-for-pwa.md)
