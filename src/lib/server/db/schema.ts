import type { AdapterAccount } from '@auth/core/adapters';
import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, primaryKey, jsonb, boolean, unique } from 'drizzle-orm/pg-core';

// =========================================
// 1. THE AUTHENTICATION TABLES
// =========================================

// This is our users table
export const users = pgTable('user', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('emailVerified', { mode: 'date' }),
    image: text('image'),
});

// This links Google/GitHub accounts to our users
export const accounts = pgTable(
    'account',
    {
        userId: uuid('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: text('type').$type<AdapterAccount['type']>().notNull(),
        provider: text('provider').notNull(),
        providerAccountId: text('providerAccountId').notNull(),
        refresh_token: text('refresh_token'),
        access_token: text('access_token'),
        expires_at: integer('expires_at'),
        token_type: text('token_type'),
        scope: text('scope'),
        id_token: text('id_token'),
        session_state: text('session_state'),
    },
    (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

// This links sessions to our users
export const sessions = pgTable('session', {
    sessionToken: text('sessionToken').primaryKey(),
    userId: uuid('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
    'verificationToken',
    {
        identifier: text('identifier').notNull(),
        token: text('token').notNull(),
        expires: timestamp('expires', { mode: 'date' }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// =========================================
// 2. THE CORE APPLICATION TABLES
// =========================================

export const activities = pgTable('activity', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    // THE POLYMORPHIC IDENTIFIER
    // stored as text: "habit", "plant", "workout"
    // Validation happens in Zod, not here.
    type: text('type').notNull(),

    title: text('title').notNull(),
    description: text('description'),

    // THE CONFIGURATION BLOB
    // Stores: target_count, plant_interval, exercise_list, etc.
    config: jsonb('config').notNull().$type<Record<string, unknown>>(),

    // THE SCHEDULER
    // Stores: { "frequency": "daily" } or { "cron": "* * * *" }
    schedule: jsonb('schedule').default({}).notNull(),

    // UI Customization
    color: text('color').default('zinc'), // e.g., 'red', 'green', 'blue'
    icon: text('icon').default('circle'), // Lucide icon name

    archived: boolean('archived').default(false).notNull(),
    startDate: timestamp('start_date').defaultNow().notNull(),
    endDate: timestamp('end_date', { mode: 'date' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const logs = pgTable('log', {
    id: uuid('id').defaultRandom().primaryKey(),
    activityId: uuid('activityId')
        .notNull()
        .references(() => activities.id, { onDelete: 'cascade' }),

    // When did this happen?
    date: timestamp('date').defaultNow().notNull(),

    // Status: "completed", "skipped", "failed", "partial"
    // kept as text for flexibility
    status: text('status').notNull(),

    // THE DATA BLOB
    // Stores: { "count": 1 }, { "reps": [10, 8] }, { "note": "Fertilized" }
    data: jsonb('data').default({}).notNull().$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Schedule shifts. One row per shifted ISO week per habit.
// Apply shiftDays to the habit's weekly preferred days for that week only.
// Expire/delete once the week has passed.
export const weekExceptions = pgTable(
    'week_exception',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        habitId: uuid('habitId')
            .notNull()
            .references(() => activities.id, { onDelete: 'cascade' }),
        // ISO week string, e.g. "2025-W03"
        weekOf: text('week_of').notNull(),
        // Integer day offset (spec scope: +1)
        shiftDays: integer('shift_days').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    // At most one shift per habit per week (edge case 6).
    (table) => [unique('week_exception_habit_week_unique').on(table.habitId, table.weekOf)]
);

// One row per browser/device push subscription. A user can have several
// (phone PWA, desktop). Timezone is captured at subscribe time so the
// reminder cron can evaluate schedule times in the user's local clock.
export const pushSubscriptions = pgTable('push_subscription', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    timezone: text('timezone').default('UTC').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =========================================
// 3. RELATIONS (For Drizzle Queries)
// =========================================

export const usersRelations = relations(users, ({ many }) => ({
    activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
    user: one(users, {
        fields: [activities.userId],
        references: [users.id],
    }),
    logs: many(logs),
    weekExceptions: many(weekExceptions),
}));

export const weekExceptionsRelations = relations(weekExceptions, ({ one }) => ({
    activity: one(activities, {
        fields: [weekExceptions.habitId],
        references: [activities.id],
    }),
}));

export const logsRelations = relations(logs, ({ one }) => ({
    activity: one(activities, {
        fields: [logs.activityId],
        references: [activities.id],
    }),
}));
