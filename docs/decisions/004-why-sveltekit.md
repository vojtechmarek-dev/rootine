# ADR 004: Why SvelteKit?

## Context
I am building a modern web application that needs to be SEO-friendly (initially), highly interactive, and capable of handling server-side logic (Auth, DB access) securely. I want a unified codebase for both frontend and backend.

## Options Considered
1. **React (Next.js)**: The industry standard. Powerful but has become complex (Server Components vs Client Components boundary can be mentally taxing).
2. **Vue (Nuxt)**: Great DX, but Svelte's reactivity model is often simpler.
3. **Single Page Apps (Vite + React/Vue)**: Good for dashboards but lacks easy server-side integration (requires separate API backend).
4. **SvelteKit**: The meta-framework for Svelte.

## Decision
I chose **SvelteKit** (specifically with **Svelte 5**).

## Detailed Reasoning

### 1. Svelte 5 & Runes
I am using the latest Svelte 5 syntax (`$state`, `$derived`, `$props`). This "Runes" system provides fine-grained reactivity that is:
- **Explicit**: No more "magic" assignments or dependency tracking guesswork.
- **Composable**: Reactivity works outside of components (in `.ts` files), making state management simple without external libraries like Redux or Zustand.

### 2. Unified Backend (BFF)
SvelteKit is a full-stack framework.
- **`+page.server.ts`**: I load data on the server, ensuring the client receives fully rendered HTML (fast LCP).
- **Form Actions**: I handle mutations (Create, Update, Delete) using standard Web Form submissions that work even without JS (progressive enhancement), though I enhance them with `use:enhance` for a seamless SPA feel.
- **Safety**: DB credentials stay on the server. I don't need a separate API project.

### 3. Performance
Svelte compiles away the framework. It produces highly optimized imperative code that surgically updates the DOM. This results in smaller bundle sizes compared to React's Virtual DOM approach, which is crucial for the mobile performance goals.

### 4. Developer Experience
SvelteKit's file-system routing is intuitive. Features like "Layouts", "Hooks" (middleware), and "Scoped Styling" are built-in and require zero configuration.

## Consequences
- **Positive**: Blazing fast performance. Simple mental model for reactivity. Full-stack type safety.
- **Negative**: Smaller ecosystem than React (though growing). Svelte 5 is relatively new, so some community libraries might still be in the process of upgrading.
