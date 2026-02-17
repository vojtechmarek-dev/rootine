import { z } from 'zod';
import { toDateOptional } from '$lib/utils/date.js';

// ==========================================
// 1. SHARED PROPS (Top-level DB Columns)
// ==========================================
// These are stored as explicit columns in the 'activities' table
// and should NOT be duplicated in the JSONB 'config'.
// startDate/endDate accept Date, string (ISO), or DateValue (from Shadcn calendar).

export const SharedActivityProps = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    startDate: z.preprocess(toDateOptional, z.date()).default(() => new Date()),
    endDate: z.preprocess(toDateOptional, z.date().optional()),
});

// ==========================================
// 2. CONFIG SCHEMAS (Type-Specific)
// ==========================================
// These define "What is this activity?"
// Stored in activities.config JSONB

// Base config (currently empty as common props moved up, but kept for extensibility)
export const ActivityConfig = z.object({
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
});

// --- SCHEDULE SCHEMA ---
// Unified scheduling for all activity types
export const ScheduleSchema = z.discriminatedUnion('type', [
    // Case 1: Simple Daily (Habits)
    // "I want to do this every day"
    z.object({
        type: z.literal('daily'),
        times: z.array(z.string()).optional() // e.g. ["09:00"] for reminders
    }),

    // Case 2: Specific Days (Workouts, Weekly Habits)
    // "I do this on Mon, Wed, Fri"
    z.object({
        type: z.literal('weekly'),
        days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])),
        times: z.array(z.string()).optional()
    }),

    // Case 3: Rolling Interval (Plants, Chores)
    // "Due 7 days after I last did it"
    z.object({
        type: z.literal('interval'),
        value: z.number().min(1),
        unit: z.enum(['days', 'hours']), // Usually 'days'
    })
]);

// --- TYPE 1: HABIT (Simple Counter) ---
// Example: "Drink Water", Target: 3 liters
export const HabitConfigSchema = ActivityConfig.extend({
    targetValue: z.number().min(1).default(1), // Must be at least 1, defaults to 1
    unit: z.string().optional().default('times'), // e.g., "liters", "pages", "reps"
});

// --- TYPE 2: PLANT (Interval Tracker) ---
// Example: "Monstera", Water every 7 days
export const PlantConfigSchema = ActivityConfig.extend({
    location: z.string().optional(), // e.g., "Living Room"
    species: z.string().optional(),
    // We store dates as Strings in JSON, Zod validates they are ISO formatted
    lastWatered: z.iso.datetime().optional(),
});

// --- TYPE 3: WORKOUT (Complex Template) ---
// Example: "Push Day", List of exercises to perform
export const WorkoutConfigSchema = ActivityConfig.extend({
    // A simple list of exercise names to populate the default form
    exercises: z.array(z.string()).default([]),
    estimatedDurationMin: z.number().optional(),
});

// ==========================================
// 3. THE MASTER ACTIVITY SCHEMA
// ==========================================
// This is the "Discriminated Union".
// It is used for FULL validation of an activity object (e.g. from API or Form)

export const ActivitySchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('habit'),
        // Merge shared props so we can validate a complete form submission
        ...SharedActivityProps.shape,
        config: HabitConfigSchema,
        schedule: ScheduleSchema.default({ type: 'daily' }),
    }),
    z.object({
        type: z.literal('plant'),
        ...SharedActivityProps.shape,
        config: PlantConfigSchema,
        schedule: ScheduleSchema.default({ type: 'interval', value: 7, unit: 'days' }),
    }),
    z.object({
        type: z.literal('workout'),
        ...SharedActivityProps.shape,
        config: WorkoutConfigSchema,
        schedule: ScheduleSchema.default({ type: 'weekly', days: ['mon', 'wed', 'fri'] }),
    }),
]);

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
// 5. TYPESCRIPT EXPORTS
// ==========================================
// This extracts the Typescript types from the Zod logic
// @example: let act: Activity = ...

export type Activity = z.infer<typeof ActivitySchema>;
export type SharedActivityProps = z.infer<typeof SharedActivityProps>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type HabitConfig = z.infer<typeof HabitConfigSchema>;
export type PlantConfig = z.infer<typeof PlantConfigSchema>;
export type WorkoutConfig = z.infer<typeof WorkoutConfigSchema>;

export type Log = z.infer<typeof LogSchema>;

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
