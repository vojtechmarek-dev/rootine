import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import { ActivitySchema, type Schedule } from '$lib/types/schemas';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
        return {
            session,
            activities: []
        };
    }

    const userActivities = await db.query.activities.findMany({
        where: eq(activities.userId, session.user.id),
        orderBy: [desc(activities.createdAt)]
    });

    // Validate and Parse each activity
    for (const activity of userActivities) {
        // We must pass type, config, schedule AND shared props so Zod knows which schema to apply
        const payload = {
            type: activity.type,
            title: activity.title,
            description: activity.description,
            color: activity.color,
            icon: activity.icon,
            config: activity.config,
            schedule: activity.schedule
        };

        const validationResult = ActivitySchema.safeParse(payload);

        if (validationResult.success) {
            // Success: Update config with the clean, typed data (removes unknown fields)
            activity.config = validationResult.data.config;
            // Also ensure schedule follows the schema
            activity.schedule = validationResult.data.schedule;
        } else {
            // Failure: Log the specific error to the server console
            console.error(
                `Activity Validation Failed (ID: ${activity.id}, Type: ${activity.type}):`,
                validationResult.error.flatten().fieldErrors
            );

            // todo -  indicate an error to the UI
        }
    }

    return {
        session,
        activities: userActivities
    };
};


export const actions: Actions = {
    createActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }

        const formData = await event.request.formData();
        const type = formData.get('type') as string;

        // 1. Construct Schedule
        let schedule: Schedule;

        // Check if explicit schedule fields are present (from new forms)
        const scheduleType = formData.get('schedule_type');

        if (scheduleType === 'daily') {
            schedule = { type: 'daily' };
        } else if (scheduleType === 'interval') {
            schedule = {
                type: 'interval',
                value: Number(formData.get('schedule_value') || 1),
                unit: (formData.get('schedule_unit') as 'days' | 'hours') || 'days'
            };
        } else if (scheduleType === 'weekly') {
            // Parse selected days from formData (e.g., schedule_days=mon, schedule_days=wed)
            const rawDays = formData.getAll('schedule_days');
            const days = rawDays.map(d => d.toString());
            // Zod will validate these strings against the enum
            schedule = {
                type: 'weekly',
                days: (days.length > 0 ? days : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) as never
            };
        } else {
            // Fallback for legacy forms or implicit defaults
            const period = formData.get('period');
            const waterInterval = formData.get('waterIntervalDays');

            if (waterInterval) {
                schedule = { type: 'interval', value: Number(waterInterval), unit: 'days' };
            } else if (period === 'weekly') {
                schedule = { type: 'weekly', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] };
            } else {
                schedule = { type: 'daily' };
            }
        }

        // 2. Coerce Config Data
        // Map empty strings to undefined to allow Zod defaults to trigger
        const rawConfig = {
            // Habit Specific
            // Convert to Number, fallback to undefined if empty/invalid
            targetValue: formData.get('targetValue')
                ? Number(formData.get('targetValue'))
                : undefined,
            unit: formData.get('unit') || undefined,
            // period: REMOVED (handled by schedule)

            // Plant Specific
            // waterIntervalDays: REMOVED (handled by schedule)
            location: formData.get('location') || undefined,
            species: formData.get('species') || undefined,

            // Workout Specific
            exercises: [], // TODO: Parse complex list when implemented
            estimatedDurationMin: formData.get('estimatedDurationMin')
                ? Number(formData.get('estimatedDurationMin'))
                : undefined,
        };

        // 3. Validate
        // The discriminated union will only validate the fields relevant to the 'type'
        const payload = {
            type,
            // Shared Fields need to be at top level for validation
            title: formData.get('title') || undefined,
            description: formData.get('description') || undefined,
            color: formData.get('color') || undefined,
            icon: formData.get('icon') || undefined,
            config: rawConfig,
            schedule
        };

        const result = ActivitySchema.safeParse(payload);

        if (!result.success) {
            return fail(400, {
                message: 'Invalid activity data',
                errors: result.error.flatten().fieldErrors,
                values: rawConfig
            });
        }

        const { data } = result;

        try {
            // 4. Insert
            await db.insert(activities).values({
                userId: session.user.id,
                type: data.type,
                // Explicitly map columns for indexing/sorting
                title: data.title,
                description: data.description,
                color: data.color || 'zinc', // Fallback to match DB default
                icon: data.icon || 'circle',
                // Store PURE config (without shared props) and schedule
                config: data.config,
                schedule: data.schedule,
            });
        } catch (err) {
            console.error('Create Activity Error:', err);
            return fail(500, { message: 'Failed to create activity' });
        }

        return { success: true };
    }
};
