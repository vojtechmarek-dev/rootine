# ADR 001: Why Drizzle ORM?

## Context
For the "Rootine" Habit Tracker, I require a database interaction layer that integrates seamlessly with TypeScript, supports the polymorphic data model (JSONB columns with Zod validation), and performs efficiently in a serverless environment (Vercel).

## Options Considered
1. **Prisma**: Popular, great DX, but traditionally heavy (large binary size) which contributes to "cold start" issues in serverless functions.
2. **TypeORM**: Mature, but relies heavily on decorators and classes, which can feel "Java-like" and less idiomatic in modern functional TypeScript.
3. **Raw SQL**: Maximum control/performance, but lacks type safety and migration management out-of-the-box.
4. **Kysely**: Good type-safe query builder, but less comprehensive ecosystem for migrations/schema management compared to full ORMs.
5. **Drizzle ORM**: Lightweight, "If you know SQL, you know Drizzle" philosophy, zero-dependency at runtime.

## Decision
I chose **Drizzle ORM**.

## Detailed Reasoning

### 1. Serverless Performance
Drizzle is extremely lightweight. Unlike Prisma, which ships a Rust binary, Drizzle is just a thin TypeScript wrapper around the database driver. This significantly reduces the bundle size of the serverless functions, leading to faster startup times ("cold starts") on Vercel.

### 2. Type Safety & Schema Definition
Drizzle allows me to define the schema in TypeScript (`src/lib/server/db/schema.ts`) and infers TypeScript types directly from the database schema.
- **Inference**: `type Activity = typeof schema.activities.$inferSelect;`
- **Zod Integration**: I heavily use Zod for validating the polymorphic `config` and `data` JSONB columns. Drizzle plays nicely with Zod, allowing me to validate data at the application boundary before it hits the DB.

### 3. SQL-Like Syntax
Drizzle's API mirrors SQL closely. This reduces the abstraction layer. If I know how to write the query in SQL, writing it in Drizzle is intuitive. This prevents the "black box" query generation often associated with heavier ORMs.

### 4. Migration Management
`drizzle-kit` provides a robust workflow for generating and running migrations, ensuring the database schema stays in sync with the TypeScript definitions.

## Consequences
- **Positive**: Fast queries, low latency, full type safety across the stack.
- **Negative**: Slightly more boilerplate than Prisma for complex relations (though `with` syntax has improved this). I must manage connections carefully in serverless (using `neondatabase/serverless` driver).
