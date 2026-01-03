import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities } from '$lib/server/db/schema';
import { ActivitySchema } from '$lib/types/schemas';
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
        // We must pass both 'type' and 'config' so Zod knows which schema to apply
        const validationResult = ActivitySchema.safeParse({
            type: activity.type,
            config: activity.config
        });

        if (validationResult.success) {
            // Success: Update config with the clean, typed data (removes unknown fields)
            activity.config = validationResult.data.config;
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

        // 1. Coerce Form Data
        // Map empty strings to undefined to allow Zod defaults to trigger
        const rawConfig = {
            // Shared Fields
            title: formData.get('title') || undefined,
            description: formData.get('description') || undefined,
            color: formData.get('color') || undefined,
            icon: formData.get('icon') || undefined,

            // Habit Specific
            // Convert to Number, fallback to undefined if empty/invalid
            targetValue: formData.get('targetValue')
                ? Number(formData.get('targetValue'))
                : undefined,
            unit: formData.get('unit') || undefined,
            period: formData.get('period') || undefined,

            // Plant Specific
            waterIntervalDays: formData.get('waterIntervalDays')
                ? Number(formData.get('waterIntervalDays'))
                : undefined,
            location: formData.get('location') || undefined,
            species: formData.get('species') || undefined,

            // Workout Specific
            exercises: [], // TODO: Parse complex list when implemented
            estimatedDurationMin: formData.get('estimatedDurationMin')
                ? Number(formData.get('estimatedDurationMin'))
                : undefined,
        };

        // 2. Validate
        // The discriminated union will only validate the fields relevant to the 'type'
        // Extra fields (e.g. waterIntervalDays on a habit) are stripped by Zod
        const payload = {
            type,
            config: rawConfig
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
            // 3. Insert
            await db.insert(activities).values({
                userId: session.user.id,
                type: data.type,
                // Explicitly map columns for indexing/sorting
                title: data.config.title,
                description: data.config.description,
                color: data.config.color || 'zinc', // Fallback to match DB default
                icon: data.config.icon || 'circle',
                // Store full config for the polymorphic jsonb column
                // This ensures the Source of Truth is preserved with all type-specific data
                config: data.config,
            });
        } catch (err) {
            console.error('Create Activity Error:', err);
            return fail(500, { message: 'Failed to create activity' });
        }

        return { success: true };
    }
};