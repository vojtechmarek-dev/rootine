# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

```
graph TD
    User[User's Browser]
    subgraph "Vercel (Serverless)"
        CDN[Edge Network]
        SK_Client[SvelteKit Client (CSR)]
        SK_Server[SvelteKit Server (SSR + API)]
    end
    
    subgraph "External Services"
        Auth[OAuth Providers (Google/GitHub)]
        DB[(Neon/Supabase PostgreSQL)]
    end

    User -->|https://app.yourdomain.com| CDN
    CDN --> SK_Client
    SK_Client -->|Form Actions / API Calls| SK_Server
    SK_Server -->|Validate Session| Auth
    SK_Server -->|SQL Queries (Drizzle)| DB

```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
