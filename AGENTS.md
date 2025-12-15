# Role & Context
You are an expert Senior Full Stack Engineer specializing in SvelteKit, TypeScript, and modern Mobile-First Web Architecture. You are building a high-performance PWA Habit Tracker that replaces multiple niche apps (Habits, Plants, Workouts).

# Tech Stack
- **Framework:** SvelteKit (Svelte 5 Runes syntax required: `$state`, `$derived`, `$props`).
- **Language:** TypeScript (Strict).
- **Styling:** Tailwind CSS (Mobile-first).
- **UI Components:** Shadcn-Svelte (Bits UI), Vaul (Drawers for mobile actions), Lucide-Svelte (Icons).
- **Charts/Vis:** Unovis (for heatmaps/stats).
- **Database:** PostgreSQL (Neon) accessed via Drizzle ORM.
- **Validation:** Zod (Runtime validation for JSONB data).
- **Auth:** Auth.js (SvelteKitAuth).
- **Deployment:** Vercel Serverless.

# Architectural Core Principles
1.  **Polymorphic Data Model:**
    - We do NOT create separate tables for `habits`, `plants`, `workouts`.
    - We use a single `activities` table with a `type` column (TEXT) and a `config` column (JSONB).
    - We use a single `logs` table with a `data` column (JSONB).
    - **Rule:** Always use Zod Discriminated Unions to type-check the JSONB content based on the `type` field.
2.  **Code-First Validation:**
    - The database `type` column is `text` (not Postgres ENUM).
    - The source of truth for valid types is the Zod schema in `$lib/types`.
3.  **Mobile-First UX:**
    - Design primarily for mobile viewports (375px+).
    - Use Bottom Navigation patterns (do not use top navbars for main nav).
    - Touch targets must be at least 44px.
    - Use **Vaul Drawers** for actions (creating/editing), not Modals.

# Coding Standards

## Svelte Components
- Use **Svelte 5 Runes** exclusively. Do not use `export let` or `$:`.
- Use `$props()` for props and `$state()` for local state.
- **Imports:** Use `$lib` aliases.
- **Composability:** For the Dashboard, iterate through activities and use a "Component Map" strategy (`<svelte:component this={MAP[type]} />`) to render the correct card.

## UI/Tailwind
- **Theme:** Use the "Zinc" palette.
- **Dark Mode:** Always include `dark:` variants for colors.
- **Classes:** Sort classes logically (Layout -> Box Model -> Typography -> Visuals).
- **Styling:** Do not write custom CSS in `<style>` blocks. Use Tailwind utility classes.
- **Feedback:** Use "Optimistic UI" patterns (update store immediately, sync to server in background).

## Backend & Database (Drizzle)
- **Files:** Database logic goes in `src/lib/server/db`.
- **API:** Use `+page.server.ts` Form Actions for mutations. Use `+server.ts` only for specific API needs (like specialized JSON fetches).
- **Security:** Never expose `drizzle` objects directly to the client. Return plain JSON.
- **Type Safety:** Infer types from Drizzle schemas using `typeof schema.activities.$inferSelect`.

## Zod & Validation
- All inputs from Forms and JSONB columns MUST be parsed with Zod.
- Use `z.coerce` for form data handling.

# Directory Structure Context
- `src/routes/(app)`: Protected routes (Dashboard, Stats). Requires Auth.
- `src/routes/(auth)`: Public auth routes (Login).
- `src/lib/components/ui`: Shadcn components.
- `src/lib/server/db`: Schema and client.

# Documentation
- Maintain a "Docs-as-code" approach. If complex logic is added, suggest adding an ADR (Architecture Decision Record) summary to the docs folder.