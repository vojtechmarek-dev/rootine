# ADR 005: Why sveltekit-superforms?

## Context

Rootine’s activity drawer submits **polymorphic activity data** (habit / plant / workout) to SvelteKit form actions, including **nested JSON** (`config`, `schedule`) and **arrays** (e.g. workout `exercises`). We already use **Zod 4** as the source of truth for validation and types.

We needed an approach that:

- Keeps **one schema** wired to both **server** (`+page.server.ts` actions) and **client** state.
- Supports **nested structures and arrays** without hand-rolled `FormData` naming conventions.
- Preserves **progressive enhancement** (real `POST`, `use:enhance`) where we want it.

## Options Considered

1. **Manual `FormData` + dot/bracket keys**: A small helper (`formDataToObj`) flattened dotted keys into nested objects. That works for simple fields and repeated keys (e.g. `schedule.days`), but **does not model arrays of objects** (workout exercises) cleanly without custom parsing or fragile parallel arrays.
2. **Hidden JSON field only**: Serialize the whole payload into one input. Simple, but we would still want shared validation, error shape, and enhancement behavior—reinventing what a form library already provides.
3. **sveltekit-superforms**: Integrates with **Zod** via the **`zod4` adapter** ([Superforms Zod 4 guide](https://superforms.rocks/get-started/zod4)), validates on the server with **`superValidate`**, and returns **`{ form }`** on failure so the client stays in sync.
4. **Other form libraries**: Fewer ecosystem fits for **SvelteKit actions + Zod discriminated unions** with the same first-class story for action results and **`fail(400, { form })`**.

## Decision

We adopted **sveltekit-superforms** for:

- **Create / update activity** (`DrawerActivitySchema`), using **`dataType: 'json'`** so the posted body carries full nested payloads (including `config.exercises`) without encoding every leaf as a separate named `FormData` field.
- **Archive activity** (`ArchiveActivityFormSchema`): a minimal traditional `POST` with a hidden `id` still goes through **`superValidate`** so validation and **`{ form }`** errors stay consistent with the rest of the app.

Client-side validators use **`zod4Client`** with the schema defined in **`$lib/types/schemas`** (schemas stay **module-level** for adapter caching, per Superforms documentation).

## Detailed Reasoning

### 1. Nested and array-heavy config

Workout templates are **lists of structured objects**. Flat `FormData` encodings are error-prone and easy to drift from **`WorkoutConfigSchema`**. JSON transport + Zod parsing keeps **one structural contract**.

### 2. Single validation pipeline

**`superValidate(event.request, zod4(...))`** in actions replaces ad hoc **`formDataToObj` + safeParse`** for those flows. Invalid submissions return **`fail(400, { form })`** with structured errors aligned to the schema.

### 3. Progressive enhancement and SvelteKit conventions

Forms remain normal **`method="POST"`** actions (`?/createActivity`, `?/updateActivity`, `?/archiveActivity`). **`superForm`’s `enhance`** composes with SvelteKit’s enhanced forms so navigations and **`applyAction`** behavior stay idiomatic.

### 4. Alignment with stack rules

The project standard is **Zod at boundaries** and **SvelteKit form actions for mutations**. Superforms reinforces that pattern instead of adding a parallel client-only validation layer.

## Consequences

- **Positive**: Less custom serialization code; exercise lists and nested `config` / `schedule` stay type-checked; failure responses are consistent (**`{ form }`**).
- **Positive**: Official **Zod 4** adapter path (`zod4` / `zod4Client`) matches our dependency choice.
- **Trade-off**: Drawer state must stay careful with **Svelte `$state` proxies**—anything passed to **`structuredClone`** needs **`$state.snapshot`** first (see `CreateActivity.svelte`, `activity-drawer.svelte.ts`).
- **Trade-off**: Controlled drawer **open** state can flicker with Vaul **`bind:open`**; deferred resets must **`clearTimeout`** in **`$effect` cleanup** so we do not wipe edit mode after opening.

## Related code

- Schemas: `src/lib/types/schemas.ts` (`DrawerActivitySchema`, `ArchiveActivityFormSchema`, etc.).
- Actions: `src/routes/(app)/+page.server.ts`.
- Drawer + superform wiring: `src/lib/components/activity/CreateActivity.svelte`, `src/lib/components/activity/ActivityEditor.svelte`.
