```
graph TD
sequenceDiagram
    participant User
    participant PWA as SvelteKit PWA
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