import { WEEKDAYS } from '$lib/constants';
import { z } from 'zod';

// ==========================================
// 1. SHARED FIELDS (Common Properties)
// ==========================================
// Stored as explicit columns in the 'activities' table.
// z.coerce turns form strings into the right types; no separate coercion maps needed.

export const BaseActivitySchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().nullish(),
    color: z.string().nullish().transform((v) => v ?? 'zinc'),
    icon: z.string().nullish().transform((v) => v ?? 'circle'),
    startDate: z.coerce.date().default(() => new Date()),
    endDate: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
    archived: z.preprocess((v) => v === 'true' || v === 'on' || v === '1', z.boolean().default(false)),
});

// ==========================================
// 2. CONFIG SCHEMAS (Type-Specific)
// ==========================================
// These define "What is this activity?"
// Stored in activities.config JSONB

// Base config (currently empty as common props moved up, but kept for extensibility)
export const ActivityConfig = z.object({
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

// --- SCHEDULE SCHEMA ---
// Unified scheduling for all activity types
export const ScheduleSchema = z.discriminatedUnion('type', [
    // Case 1: Simple Daily (Habits)
    // "I want to do this every day"
    z.object({
        type: z.literal('daily'),
        times: z.array(z.string()).optional(), // e.g. ["09:00"] for reminders
    }),

    // Case 2: Specific Days (Workouts, Weekly Habits)
    // "I do this on Mon, Wed, Fri"
    z.object({
        type: z.literal('weekly'),
        days: z.array(z.enum(WEEKDAYS)),
        times: z.array(z.string()).optional(),
    }),

    // Case 3: Rolling Interval (Plants, Chores)
    // "Due 7 days after I last did it"
    z.object({
        type: z.literal('interval'),
        value: z.coerce.number().min(1),
        unit: z.enum(['days', 'hours']), // Usually 'days'
    }),
]);

// --- TYPE 1: HABIT (Simple Counter) ---
// Example: "Drink Water", Target: 3 liters
export const HabitConfigSchema = ActivityConfig.extend({
    targetValue: z.coerce.number().min(1).default(1),
    unit: z.string().nullish().transform((v) => v ?? 'times'),
});

// --- TYPE 2: PLANT (Interval Tracker) ---
// Example: "Monstera", Water every 7 days
export const PlantConfigSchema = ActivityConfig.extend({
    location: z.string().nullish(), // e.g., "Living Room"
    species: z.string().nullish(),
    // We store dates as Strings in JSON, Zod validates they are ISO formatted
    lastWatered: z.iso.datetime().nullish(),
});

// --- TYPE 3: WORKOUT (Complex Template) ---
// Example: "Push Day", List of exercises to perform
export const WorkoutConfigSchema = ActivityConfig.extend({
    exercises: z.array(
        z.object({
            id: z.string().default(() => crypto.randomUUID()),
            name: z.string().min(1, 'Exercise name required'),
            sets: z.coerce.number().min(1).default(3),
            reps: z.coerce.number().min(1).default(10),
            weight: z.coerce.number().nullish(),
        })
    ).default([]),
    estimatedDurationMin: z.coerce.number().nullish(),
});

// ==========================================
// 3. POLYMORPHIC CONFIGS (Type-Specific)
// ==========================================
// Defines the type-specific configurations for each activity type
// This discriminated union contains only the polymorphic parts

const ActivityConfigs = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('habit'),
        config: HabitConfigSchema,
        schedule: ScheduleSchema.default({ type: 'daily' }),
    }),
    z.object({
        type: z.literal('plant'),
        config: PlantConfigSchema,
        schedule: ScheduleSchema.default({ type: 'interval', value: 7, unit: 'days' }),
    }),
    z.object({
        type: z.literal('workout'),
        config: WorkoutConfigSchema,
        schedule: ScheduleSchema.default({ type: 'weekly', days: ['mon', 'wed', 'fri'] }),
    }),
]);

// ==========================================
// 4. SCHEMA FOR CREATING ACTIVITIES (Form Submission)
// ==========================================
// For form validation - combines shared fields with polymorphic configs
export const CreateActivitySchema = z.intersection(BaseActivitySchema, ActivityConfigs);

// ==========================================
// 4b. SCHEMA FOR UPDATING ACTIVITIES
// ==========================================
export const UpdateActivitySchema = CreateActivitySchema.and(
    z.object({
        id: z.uuid('Invalid activity ID'),
    })
);

// ==========================================
// 5. THE MASTER ACTIVITY SCHEMA (For Reading from DB)
// ==========================================
// Extends CreateActivitySchema with required DB fields
export const ActivitySchema = CreateActivitySchema.and(
    z.object({
        id: z.uuid(),
        userId: z.uuid(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
    })
);

// ==========================================
// 4. LOG DATA SCHEMAS (History)
// ==========================================
// These define "What actually happened?"
// Stored in logs.data

export const HabitLogSchema = z.object({
    count: z.number().default(1), // How many times did I do it today?
});

export const PlantLogSchema = z.object({
    action: z.enum(['water', 'fertilize', 'prune']).default('water'),
    notes: z.string().optional(),
    // Maybe user attached a photo of the plant growing
    photoUrl: z.string().optional(),
});

// For workouts, the log is much richer than the config
export const WorkoutLogSchema = z.object({
    durationMin: z.number(),
    // We record exactly what was lifted
    exercises: z.array(
        z.object({
            name: z.string(),
            sets: z.array(
                z.object({
                    weight: z.number(),
                    reps: z.number(),
                    rpe: z.number().optional(), // Rate of Perceived Exertion (1-10)
                })
            ),
        })
    ),
});

export const LogSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('habit'), data: HabitLogSchema }),
    z.object({ type: z.literal('plant'), data: PlantLogSchema }),
    z.object({ type: z.literal('workout'), data: WorkoutLogSchema }),
]);

export const UserSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    emailVerified: z.date().optional(),
    email: z.email(),
    image: z.string().optional(),
});

export const SessionSchema = z.object({
    sessionToken: z.string(),
    uesrId: z.uuid(),
    expires: z.date(),
    user: UserSchema,
});

// ==========================================
// 6. TYPESCRIPT EXPORTS
// ==========================================
// This extracts the Typescript types from the Zod logic

export type Activity = z.infer<typeof ActivitySchema>;
export type CreateActivity = z.infer<typeof CreateActivitySchema>;
export type BaseActivity = z.infer<typeof BaseActivitySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type HabitConfig = z.infer<typeof HabitConfigSchema>;
export type PlantConfig = z.infer<typeof PlantConfigSchema>;
export type WorkoutConfig = z.infer<typeof WorkoutConfigSchema>;

export type Log = z.infer<typeof LogSchema>;

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;

// ==========================================
// 7. UI - View Model Types
// ==========================================
// Those types are used in the UI and are not stored in the database

export type DashboardActivity = Activity & {
    isCompleted: boolean;
    logCountToday: number;
    targetCount: number;
    logs?: Log[] | null;
};

export type ActivityFormData = CreateActivity & { id?: string };
