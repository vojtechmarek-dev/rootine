# ADR 001: Transition to Single Page Application (SPA) Mode for PWA

## Status

Accepted

## Context

Rootine is designed to be a Mobile-First PWA Habit Tracker. Because we are using the free tier of Neon Serverless Postgres, the database "scales to zero" (goes to sleep) after a period of inactivity. 

During early development, we experienced an issue where the initial cold start of the application resulted in a blank, hanging browser screen for several seconds. 
This was caused by the combination of:

1. SvelteKit's default Server-Side Rendering (SSR).
2. Auth.js requiring a database connection via `DrizzleAdapter` during the server-side `hooks.server.ts` execution to verify the session.

Because the hook blocked the entire SSR pipeline, SvelteKit could not deliver the initial HTML (`app.html`) containing the splash screen until the Neon database fully woke up.

## Decision

We decided to completely disable Server-Side Rendering (SSR) globally by setting `export const ssr = false;` in `src/routes/+layout.ts`. This effectively turns the application into a Single Page Application (SPA).

Additionally, we switched Auth.js to use the `jwt` session strategy instead of the default database strategy to further reduce the number of queries needed on subsequent API requests, while keeping the `DrizzleAdapter` to link new OAuth users to our database.

## Consequences

### Positive

- **Instant Splash Screen:** SvelteKit immediately serves the static `app.html` without running any blocking server code. The splash screen renders instantly (0ms latency).
- **True PWA Behavior:** Disabling SSR aligns perfectly with the standard architecture of offline-first Progressive Web Apps.
- **Graceful Cold Starts:** The heavy lifting (waking up Neon via Auth.js and Drizzle) happens in the background via client-side `fetch` requests. The user sees a branded loading state instead of a blank browser page.
- **Reduced Server Load:** Vercel Serverless Functions no longer need to render HTML; they simply act as JSON APIs, which reduces compute time and costs.

### Negative

- **Loss of SEO:** The application will not be properly indexed by search engines. *Mitigation: This is acceptable because Rootine is a private, authenticated personal productivity tool.*
- **Requires JavaScript:** Users with JavaScript disabled cannot use the app. *Mitigation: Modern PWAs fundamentally require JavaScript, so this is an accepted baseline requirement.*

