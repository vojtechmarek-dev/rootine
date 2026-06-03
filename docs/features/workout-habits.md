# Workout Habits — Flexible Scheduling & Set Sequencing

Two features layered on top of the existing workout habit type:

- **Week shifting** — push a week's schedule forward by one day when life gets in the way.
- **Set sequencing** — define named workout sets (Push Day, Pull Day, …) and rotate through them automatically.

---

## Data Model

```mermaid
erDiagram
    activities {
        uuid id PK
        uuid userId FK
        text type
        jsonb config
        jsonb schedule
    }
    week_exception {
        uuid id PK
        uuid habitId FK
        text weekOf
        int shiftDays
        timestamp createdAt
    }
    logs {
        uuid id PK
        uuid activityId FK
        timestamp date
        text status
        jsonb data
    }

    activities ||--o{ week_exception : "1 per shifted week"
    activities ||--o{ logs : "one per completion"
```

`WorkoutConfig` (inside `activities.config` JSONB) carries:

| Field         | Type           | Default | Description                                                                        |
| ------------- | -------------- | ------- | ---------------------------------------------------------------------------------- |
| `workoutSets` | `WorkoutSet[]` | `[]`    | Ordered list of named sets. Empty for legacy single-list habits.                   |
| `rotation`    | `string[]`     | `[]`    | Ordered `WorkoutSet` IDs defining the cycle, e.g. `["push","pull"]`.               |
| `useRotation` | `boolean`      | `true`  | When `false`, no set is recommended at workout start — user always picks manually. |

`WorkoutSet` shape:

```ts
{
  id: string        // crypto.randomUUID()
  name: string      // e.g. "Push Day"
  exercises: Exercise[]
}
```

`WorkoutLog.data` (inside `logs.data` JSONB) gains:

| Field   | Type             | Description                                                                           |
| ------- | ---------------- | ------------------------------------------------------------------------------------- |
| `setId` | `string \| null` | Which `WorkoutSet` was completed. `null` for habits without sets or for skipped logs. |

Sequence position is **never stored** — derived at runtime from the last completed log.

`WeekException` unique constraint: `(habitId, weekOf)` — at most one shift per habit per week.

> **First deploy:** `npm run db:push` is required to create the `week_exception` table.

---

## Scheduler — Week Shifting

`isScheduledForDate(activity, targetDate, exceptions?)` in `src/lib/scheduler.ts` accepts an optional `WeekException[]`. When a matching exception is found for the target date's ISO week, the habit's weekly preferred days are shifted before the membership check.

```mermaid
flowchart TD
    A([isScheduledForDate]) --> B{schedule type?}
    B -- weekly --> C{WeekException\nfor this ISO week?}
    B -- daily --> D[always true]
    B -- interval --> E[diff % interval === 0]
    C -- yes --> F[shift preferred days\nby shiftDays]
    C -- no --> G[use original days]
    F --> H{targetDay ∈\nshifted days?}
    G --> I{targetDay ∈\noriginal days?}
    H --> J([return true / false])
    I --> J
```

### Clamping decision

A shift past the end of the week is **clamped to Sunday** (last entry of `WEEKDAYS = ['mon'…'sun']`). Saturday is _not_ the boundary — clamping there silently collapses distinct days (e.g. Fri + Sat both become Sat, dropping one scheduled day).

```mermaid
block-beta
  columns 7
  Mon Tue Wed Thu Fri Sat Sun
  block:shift:7
    Mon2["Tue ↑"] Tue2["Wed ↑"] Wed2["Thu ↑"] Thu2["Fri ↑"] Fri2["Sat ↑"] Sat2["Sun ↑"] Sun2["Sun ⊣"]
  end
```

| Input           | Shift | Output                              |
| --------------- | ----- | ----------------------------------- |
| `mon, wed, fri` | +1    | `tue, thu, sat`                     |
| `wed, fri, sat` | +1    | `thu, sat, sun`                     |
| `fri, sat`      | +1    | `sat, sun`                          |
| `sat, sun`      | +1    | `sun` _(genuine boundary collapse)_ |

### Exception lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant DB

    User->>Dashboard: Open (any date)
    Dashboard->>DB: SELECT WHERE weekOf = targetWeek AND weekOf >= currentWeek
    DB-->>Dashboard: exceptions[]
    Dashboard->>Dashboard: apply exceptions to scheduler
```

Past-week exceptions are never applied to historical schedule views. Records are cleaned up in the background on each dashboard load.

---

## Rotation Logic

Implemented as pure functions in `src/lib/workout-rotation.ts` (unit-tested).

```mermaid
flowchart TD
    A([getRotationPosition]) --> B{rotation\nempty?}
    B -- yes --> C([return null])
    B -- no --> D{lastSetId\nin rotation?}
    D -- no / orphan --> E[currentIndex = 0]
    D -- yes, at index i --> F["currentIndex = (i+1) % len"]
    E --> G["nextIndex = (currentIndex+1) % len"]
    F --> G
    G --> H([return lastIndex / currentIndex / nextIndex])
```

| Scenario                              | currentIndex                |
| ------------------------------------- | --------------------------- |
| No prior log                          | `0`                         |
| `lastSetId` at index `i`              | `(i + 1) % rotation.length` |
| `lastSetId` is orphaned (set deleted) | `0` (fallback)              |

Skipped logs are **invisible to rotation** — only completed logs with a non-null `setId` advance the sequence. This means the sequence self-heals if logs are deleted or sets are reordered.

---

## User Flows

### Skip day

```mermaid
flowchart TD
    A([Tap 'Skip day']) --> B{week already\nshifted?}
    B -- yes --> C[Toast: already shifted]
    B -- no --> D[Open SkipDayModal]
    D --> E{User choice}
    E -- Skip this workout --> F[POST skipDay mode=skip]
    E -- Shift this week --> G[POST skipDay mode=shift]
    F --> H[INSERT log status=skipped setId=null]
    G --> I{WeekException\nalready exists?}
    I -- yes --> J[409 → toast already shifted]
    I -- no --> K[INSERT week_exception shiftDays=1]
    H --> L([Card shows Skipped badge])
    K --> M([Schedule shifts +1 for this week])
```

### Start workout (set picker)

```mermaid
flowchart TD
    A([Tap 'Start Workout']) --> B{sets defined?}
    B -- no --> C[Focus mode\nusing config.exercises]
    B -- yes --> D{useRotation off\nAND only 1 set?}
    D -- yes --> E[Auto-select\nthat set]
    D -- no --> F[Show set picker\npre-select recommended]
    E --> G[Focus mode\nusing set.exercises]
    F --> H{User confirms\nset choice}
    H --> G
    G --> I[On finish: log with setId]
    I --> J[Next visit derives\nrecommended from log]
```

### Make up a missed day (backfill)

When life interrupts a routine (illness, travel), the user can return on a day that
isn't in the schedule and find no card — historically a lockout, because the
dashboard only renders scheduled cards and completion was gated to _today_ only.

The fix leans on the existing derived model: **logs are truth, the schedule only
recommends, and rotation self-heals.** Completion is allowed for **today, or a
missed day earlier in the _current ISO week_** (the make-up / backfill window).
The physical session can happen on any later day — it is simply recorded against
the missed scheduled slot via the dashboard date navigator.

```mermaid
flowchart TD
    A([Open dashboard]) --> B[Navigate to a missed day\nvia date picker / prev arrow]
    B --> C{isBackfillableDate?\ntoday OR past-in-current-ISO-week}
    C -- no --> D[Action disabled\nclock button + Missed chip]
    C -- yes, workout --> E["'Make up' → /workout/[id]?date=…"]
    C -- yes, habit/plant --> F[Done button enabled]
    E --> G[Focus mode → complete\nlog dated to the chosen day]
    F --> H[toggleActivity logs to the chosen day]
    G --> I([Rotation continues from this log])
    H --> I
```

The window is a single pure function shared by the client gate and **both** server
actions (`toggleActivity`, workout `complete`) so the UI and the authorization
never drift:

```ts
// src/lib/utils/date.ts
isBackfillableDate(date, now = new Date()): boolean
// today → true; future → false; past → only if isoWeekOf(date) === isoWeekOf(now)
```

Notes:

- **Log date.** A backfilled log is dated to `startOfDay(targetDate)` so it lands
  in the dashboard's per-day read window (`between(startOfDay, endOfDay)`). Today
  still logs at `now`. The `targetDate` is threaded through the workout link
  (`/workout/[id]?date=…`) and the toggle action (`?/toggleActivity&date=…`).
- **What happens next is already solved.** Rotation derives from the last
  _completed_ log (skips invisible, orphans self-heal), so a made-up session
  advances the sequence with no re-shift.
- **Other habits are unaffected.** A weekly "chain" is one activity's
  `schedule.days`; `WeekException` is per-habit. Completing one activity never
  cascades to another.
- **Optional re-shift.** If the user also wants the _remaining_ days of this week
  to move, the existing **Skip day → "Shift this week +1 day"** control (today's
  card) writes the same `WeekException` for the current ISO week. No separate
  prompt — the schedule is left as-is by default and self-resets next Monday.
- **Skip on past days is hidden** — a skip writes a log dated `now`, which is
  meaningless for a past day.

### Dashboard data flow

```mermaid
sequenceDiagram
    participant Browser
    participant PageServer as +page.server.ts
    participant Dashboard as getDashboardActivities
    participant Scheduler

    Browser->>PageServer: GET / (today)
    PageServer->>Dashboard: getDashboardActivities(userId, today)
    Dashboard->>Dashboard: fetch activities + today's logs
    Dashboard->>Dashboard: fetch WeekExceptions (current week only)
    Dashboard->>Dashboard: fetch last set log per workout activity
    loop each activity
        Dashboard->>Scheduler: isScheduledForDate(activity, today, exceptions)
        Scheduler-->>Dashboard: true / false
        Dashboard->>Dashboard: build workoutRotation view
        Dashboard->>Dashboard: set isSkippedToday / weekShifted
    end
    Dashboard-->>PageServer: DashboardActivity[]
    PageServer-->>Browser: stream page
```

---

## Dashboard Card Status Chips

Status chips are mutually exclusive, evaluated in priority order:

```mermaid
flowchart LR
    A{isCompleted?} -- yes --> B[✓ Completed\ngreen]
    A -- no --> C{isSkippedToday?}
    C -- yes --> D[⌕ Skipped\nmuted]
    C -- no --> E{isPast AND\nnot completed?}
    E -- yes --> F[Missed\nsoft red]
    E -- no --> G[no chip\npending / future]
```

`isSkippedToday`: at least one `status: "skipped"` log exists for the day and zero completed logs do. Skipped logs are excluded from `logCountToday`.

---

## Edge Cases

| Scenario                       | Behaviour                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Skip without shift             | Log with `status: "skipped"`. Rotation unaffected — skips invisible to sequence logic. |
| Shift week, already worked out | Exception applies to remaining days; past completed logs unaffected.                   |
| Shift pushes day past Sunday   | Clamped to Sunday (see Clamping decision).                                             |
| Shift when already shifted     | Server 409; toast "This week is already shifted."                                      |
| `useRotation` off              | Set picker still shows (unless ≤1 set); no Recommended badge or pre-selection.         |
| Orphaned `setId` (set deleted) | Treated as no prior log — rotation falls back to index 0.                              |
| Duplicate `WeekException`      | Prevented by unique constraint `(habitId, weekOf)`.                                    |
| Past-week exception            | Filtered by `weekOf >= currentWeek`; old records cleaned up in background.             |
| Future date on dashboard       | "Missed" chip not shown — requires `isPast` prop to be true.                           |
| Backfill within current week   | Allowed: workout "Make up" / habit "Done" enabled; log dated to that day.              |
| Backfill outside current week  | Action disabled in UI; server returns `403` (`isBackfillableDate` guard).              |
| Backfill a future day          | Never backfillable; blocked in UI and server.                                          |
| Undo a backfilled completion   | Targets the chosen day's log range (or the precise `logId`), not today's.              |
| Make up then shift             | Optional: existing Skip day → "Shift this week" moves the remaining days.              |
