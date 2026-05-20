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
    color: z
        .string()
        .nullish()
        .transform((v) => v ?? 'zinc'),
    icon: z
        .string()
        .nullish()
        .transform((v) => v ?? 'circle'),
    startDate: z.coerce.date().default(() => new Date()),
    endDate: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
    archived: z.preprocess((v) => v === 'true' || v === 'on' || v === '1', z.boolean().default(false)),
});

// ==========================================
// 2. CONFIG SCHEMAS (Type-Specific)
// ==========================================
// These define "What is this activity?"
// Stored in activities.config JSONB

// Base for type-specific JSONB `config` only. Row timestamps are `activities.createdAt` / `activities.updatedAt`.
export const ActivityConfig = z.object({});

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
    unit: z
        .string()
        .nullish()
        .transform((v) => v ?? 'times'),
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
export const ExerciseSchema = z.object({
    id: z.string().default(() => crypto.randomUUID()),
    name: z.string().min(1, 'Exercise name required'),
    sets: z.coerce.number().min(1).default(3),
    reps: z.coerce.number().min(1).default(10),
    weight: z.coerce.number().nullish(),
});

// A named group of exercises (e.g. "Push Day") the habit cycles through.
export const WorkoutSetSchema = z.object({
    id: z.string().default(() => crypto.randomUUID()),
    name: z.string().min(1, 'Set name required'),
    exercises: z.array(ExerciseSchema).default([]),
});

export const WorkoutConfigSchema = ActivityConfig.extend({
    exercises: z.array(ExerciseSchema).default([]),
    estimatedDurationMin: z.coerce.number().nullish(),
    // Named sets the habit rotates through. Empty for legacy single-list habits.
    workoutSets: z.array(WorkoutSetSchema).default([]),
    // Ordered WorkoutSet IDs defining the cycle, e.g. ["push","pull"].
    rotation: z.array(z.string()).default([]),
    // When false, no set is recommended/pre-selected at workout start.
    useRotation: z.preprocess(
        (v) => (v === undefined || v === null ? true : v === 'true' || v === 'on' || v === '1' || v === true),
        z.boolean().default(true)
    ),
});

// ==========================================
// 3. POLYMORPHIC CONFIGS (Type-Specific)
// ==========================================
// Defines the type-specific configurations for each activity type
// This discriminated union contains only the polymorphic parts

const ActivityConfigs = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('habit'),
        config: z.preprocess((value) => value ?? {}, HabitConfigSchema),
        schedule: ScheduleSchema.default({ type: 'daily' }),
    }),
    z.object({
        type: z.literal('plant'),
        config: z.preprocess((value) => value ?? {}, PlantConfigSchema),
        schedule: ScheduleSchema.default({ type: 'interval', value: 7, unit: 'days' }),
    }),
    z.object({
        type: z.literal('workout'),
        config: z.preprocess((value) => value ?? {}, WorkoutConfigSchema),
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

/** Single-field archive POST (`name="id"`). */
export const ArchiveActivityFormSchema = z.object({
    id: z.uuid('Invalid activity ID'),
});

/** Create / edit drawer: same shape as create, optional id when inserting. */
export const DrawerActivitySchema = CreateActivitySchema.and(
    z.object({
        id: z.uuid().optional(),
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

// For workouts, the log is much richer than the config.
// Fields are lenient so a "skipped" log (no work performed) still validates.
export const WorkoutLogSchema = z.object({
    durationMin: z.number().default(0),
    // Which WorkoutSet was completed. null for habits without sets or skips.
    setId: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
    // We record exactly what was lifted
    exercises: z
        .array(
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
        )
        .default([]),
});

export const LogSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('habit'), data: HabitLogSchema }),
    z.object({ type: z.literal('plant'), data: PlantLogSchema }),
    z.object({ type: z.literal('workout'), data: WorkoutLogSchema }),
]);

// ==========================================
// 4c. WEEK EXCEPTION (Schedule Shifting)
// ==========================================
// One record per shifted ISO week. Offsets a habit's weekly preferred
// days for the remainder of that week. Expired/deleted after the week ends.

export const WeekExceptionSchema = z.object({
    id: z.uuid(),
    habitId: z.uuid(),
    weekOf: z.string().regex(/^\d{4}-W\d{2}$/, 'Invalid ISO week'), // e.g. "2025-W03"
    shiftDays: z.coerce.number().int(),
});

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
export type UpdateActivity = z.infer<typeof UpdateActivitySchema>;
export type ArchiveActivityForm = z.infer<typeof ArchiveActivityFormSchema>;
export type BaseActivity = z.infer<typeof BaseActivitySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type HabitConfig = z.infer<typeof HabitConfigSchema>;
export type PlantConfig = z.infer<typeof PlantConfigSchema>;
export type WorkoutConfig = z.infer<typeof WorkoutConfigSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;
export type WeekException = z.infer<typeof WeekExceptionSchema>;

export type Log = z.infer<typeof LogSchema>;
export type WorkoutLog = z.infer<typeof WorkoutLogSchema>;

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;

// ==========================================
// 7. UI - View Model Types
// ==========================================
// Those types are used in the UI and are not stored in the database

/** Runtime-derived rotation state for a workout habit card / picker. */
export type WorkoutRotationView = {
    /** Most recently completed set (null if none / orphaned). */
    lastSetId: string | null;
    lastSetName: string | null;
    /** Days since the last completed workout (null if none). */
    daysSinceLast: number | null;
    /** Recommended set for the next workout (null when rotation disabled). */
    currentSetId: string | null;
    currentSetName: string | null;
    /** The set after the recommended one (null when < 2 sets / disabled). */
    nextSetId: string | null;
    nextSetName: string | null;
};

export type DashboardActivity = Activity & {
    isCompleted: boolean;
    logCountToday: number;
    targetCount: number;
    logs?: Log[] | null;
    /** True when at least one log for this period has status "skipped". */
    isSkippedToday: boolean;
    /** Present only for workout habits that have sets defined. */
    workoutRotation?: WorkoutRotationView | null;
    /** True when a WeekException already shifts the current ISO week. */
    weekShifted?: boolean;
};

export type DrawerActivity = z.infer<typeof DrawerActivitySchema>;

export type ActivityFormData = DrawerActivity;

export function getEmptyDrawerActivity(): DrawerActivity {
    return {
        title: '',
        description: undefined,
        color: 'zinc',
        icon: 'circle',
        startDate: new Date(),
        endDate: undefined,
        archived: false,
        type: 'habit',
        config: { targetValue: 1, unit: 'times' },
        schedule: { type: 'daily' },
    };
}
