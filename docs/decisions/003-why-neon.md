# ADR 003: Why Neon (Serverless Postgres)?

## Context

I need a relational database to store the structured `activities` and `logs`. Since the application backend is hosted on Vercel Serverless Functions, I need a database that manages connections efficiently and scales to zero when not in use to minimize costs for a personal project.

## Options Considered

1. **Self-Hosted Postgres (Docker/VPS)**: Maximum control and privacy, but high maintenance overhead (backups, updates, security) and fixed monthly cost.
2. **Supabase**: Excellent "Firebase alternative" with Postgres. Good choice, but often pushes you towards using their client SDKs and Realtime features, whereas I wanted a pure standard Postgres connection for Drizzle.
3. **PlanetScale**: Great serverless DB, but it's MySQL. I prefer PostgreSQL for its JSONB capabilities and richer ecosystem.
4. **Neon**: Serverless Postgres built for the cloud. Separates storage from compute.

## Decision

I chose **Neon**.

## Detailed Reasoning

### 1. Serverless Architecture

Neon separates storage and compute. This means the database "compute" can scale down to zero when not active, which is perfect for a personal app that isn't receiving 24/7 traffic. It wakes up almost instantly, unlike traditional databases that might timeout serverless functions during cold boots.

### 2. Drizzle Compatibility

Neon has a first-class driver (`@neondatabase/serverless`) that works perfectly with Drizzle ORM over HTTP or WebSockets. This avoids the need for a complex connection pooler (like PgBouncer) when running thousands of short-lived serverless functions.

### 3. Branching

Neon allows "database branching" (similar to Git branches). I can create a copy of the production database for development or testing instantly using Copy-on-Write (CoW) technology. This makes testing migrations safe and easy.

### 4. Postgres & JSONB

I rely heavily on polymorphic data structures (`config` and `data` columns). Postgres's `JSONB` support is superior to other SQL dialects, allowing for efficient indexing and querying of nested JSON fields if needed.

## Consequences

- **Positive**: Cost-effective (free tier is generous). rapid development with branching. High compatibility with Vercel.
- **Negative**: Vendor lock-in to some extent (though data is just standard Postgres dump). Latency can vary if the compute scales to zero (though Neon is very fast).
