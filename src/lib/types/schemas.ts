import { z } from 'zod';

// ==========================================
// 1. CONFIG SCHEMAS (Definitions)
// ==========================================
// These define "What is this activity?"
// Stored in activities.config

// --- TYPE 1: HABIT (Simple Counter) ---
// Example: "Drink Water", Target: 3 liters
export const HabitConfigSchema = z.object({
  targetValue: z.number().min(1).default(1), // Must be at least 1, defaults to 1
  unit: z.string().optional().default('times'), // e.g., "liters", "pages", "reps"
  period: z.enum(['daily', 'weekly']).default('daily'), 
});

// --- TYPE 2: PLANT (Interval Tracker) ---
// Example: "Monstera", Water every 7 days
export const PlantConfigSchema = z.object({
  waterIntervalDays: z.number().min(1, "Interval must be at least 1 day"),
  location: z.string().optional(), // e.g., "Living Room"
  species: z.string().optional(),
  // We store dates as Strings in JSON, Zod validates they are ISO formatted
  lastWatered: z.iso.datetime().optional(), 
});

// --- TYPE 3: WORKOUT (Complex Template) ---
// Example: "Push Day", List of exercises to perform
export const WorkoutConfigSchema = z.object({
  // A simple list of exercise names to populate the default form
  exercises: z.array(z.string()).default([]), 
  estimatedDurationMin: z.number().optional(),
});


// ==========================================
// 2. THE MASTER ACTIVITY SCHEMA
// ==========================================
// This is the "Discriminated Union". 
// It tells TS: "Check the 'type' field first. 
// If it says 'plant', then 'config' MUST match PlantConfigSchema."

export const ActivitySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('habit'),
    config: HabitConfigSchema
  }),
  z.object({
    type: z.literal('plant'),
    config: PlantConfigSchema
  }),
  z.object({
    type: z.literal('workout'),
    config: WorkoutConfigSchema
  }),
]);


// ==========================================
// 3. LOG DATA SCHEMAS (History)
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
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.array(z.object({
      weight: z.number(),
      reps: z.number(),
      rpe: z.number().optional() // Rate of Perceived Exertion (1-10)
    }))
  }))
});

export const LogSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('habit'), data: HabitLogSchema }),
  z.object({ type: z.literal('plant'), data: PlantLogSchema }),
  z.object({ type: z.literal('workout'), data: WorkoutLogSchema }),
]);


// ==========================================
// 4. TYPESCRIPT EXPORTS
// ==========================================
// This extracts the Typescript types from the Zod logic
// @example: let act: Activity = ...

export type Activity = z.infer<typeof ActivitySchema>;
export type HabitConfig = z.infer<typeof HabitConfigSchema>;
export type PlantConfig = z.infer<typeof PlantConfigSchema>;
export type WorkoutConfig = z.infer<typeof WorkoutConfigSchema>;

export type Log = z.infer<typeof LogSchema>;