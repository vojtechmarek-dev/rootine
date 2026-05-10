import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { WorkoutConfigSchema, WorkoutLogSchema } from '$lib/types/schemas';
import { z } from 'zod';
import { parseISO } from 'date-fns';

export const load: PageServerLoad = async (event) => {
    const session = event.locals.session;
    if (!session?.user?.id) {
        throw redirect(303, '/login');
    }

    const activityId = event.params.id;

    const activity = await db.query.activities.findFirst({
        where: and(eq(activities.id, activityId), eq(activities.userId, session.user.id)),
    });

    if (!activity) {
        throw error(404, 'Activity not found');
    }

    if (activity.type !== 'workout') {
        throw redirect(303, '/');
    }

    // Parse the config to ensure it's typed properly
    const config = WorkoutConfigSchema.parse(activity.config);

    return {
        activity: {
            ...activity,
            config,
        },
    };
};

const CompleteWorkoutFormSchema = z.object({
    logData: z.string().transform((str, ctx) => {
        try {
            const parsed = JSON.parse(str);
            return WorkoutLogSchema.parse(parsed);
        } catch (e) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid workout log data',
            });
            return z.NEVER;
        }
    }),
    targetDate: z.string().optional(),
});

export const actions: Actions = {
    complete: async (event) => {
        const session = event.locals.session;
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }

        const formData = await event.request.formData();
        const payload = {
            logData: formData.get('logData'),
            targetDate: formData.get('targetDate'),
        };

        const parsed = CompleteWorkoutFormSchema.safeParse(payload);

        if (!parsed.success) {
            console.error('Validation failed:', parsed.error);
            return fail(400, { message: 'Invalid data' });
        }

        const { logData, targetDate } = parsed.data;

        // Ensure activity belongs to user
        const activityId = event.params.id;
        const activity = await db.query.activities.findFirst({
            where: and(eq(activities.id, activityId), eq(activities.userId, session.user.id)),
        });

        if (!activity) {
            return fail(404, { message: 'Activity not found' });
        }

        // Use provided targetDate, or fallback to current date
        const date = targetDate ? parseISO(targetDate) : new Date();

        await db.insert(logs).values({
            activityId,
            date,
            status: 'completed',
            data: logData,
        });

        return { success: true };
    },
};
