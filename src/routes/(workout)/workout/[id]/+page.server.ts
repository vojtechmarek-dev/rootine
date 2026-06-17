import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { eq, and, desc, ne, sql } from 'drizzle-orm';
import { WorkoutConfigSchema, WorkoutLogSchema } from '$lib/types/schemas';
import { z } from 'zod';
import { differenceInDays, endOfDay, parseISO, startOfDay } from 'date-fns';
import { getRotationPosition } from '$lib/workout-rotation';
import { isBackfillableDate } from '$lib/utils/date';
import { growthStage } from '$lib/growth';

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

    // Derive rotation position from the most recent completed log carrying a
    // setId. Sequence position is never stored.
    let lastSetId: string | null = null;
    let lastSetName: string | null = null;
    let daysSinceLast: number | null = null;

    if (config.workoutSets.length > 0) {
        const completedLogs = await db.query.logs.findMany({
            where: and(eq(logs.activityId, activityId), eq(logs.status, 'completed')),
            orderBy: [desc(logs.date)],
        });
        for (const log of completedLogs) {
            const sid = (log.data as { setId?: unknown })?.setId;
            if (typeof sid === 'string' && sid.length > 0) {
                // Orphaned set (deleted) → treat as no prior log.
                if (config.workoutSets.some((s) => s.id === sid)) {
                    lastSetId = sid;
                    lastSetName = config.workoutSets.find((s) => s.id === sid)?.name ?? null;
                    daysSinceLast = differenceInDays(startOfDay(new Date()), startOfDay(log.date));
                }
                break;
            }
        }
    }

    let recommendedSetId: string | null = null;
    if (config.useRotation && config.rotation.length > 0) {
        const pos = getRotationPosition(config.rotation, lastSetId);
        if (pos) {
            recommendedSetId = config.rotation[pos.currentIndex] ?? null;
        }
    }

    return {
        activity: {
            ...activity,
            config,
        },
        sets: config.workoutSets,
        useRotation: config.useRotation,
        recommendedSetId,
        lastSet: lastSetId ? { id: lastSetId, name: lastSetName, daysSinceLast } : null,
    };
};

const CompleteWorkoutFormSchema = z.object({
    logData: z.string().transform((str, ctx) => {
        try {
            const parsed = JSON.parse(str);
            return WorkoutLogSchema.parse(parsed);
        } catch {
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

        // Use provided targetDate, or fallback to current date.
        const date = targetDate ? parseISO(targetDate) : new Date();

        // Only today or a missed day earlier this ISO week may be logged
        // (make-up / backfill window). Enforced here, not just in the UI.
        if (!isBackfillableDate(date)) {
            return fail(403, { message: 'You can only log a workout for today or a missed day earlier this week' });
        }

        // Ensure activity belongs to user
        const activityId = event.params.id;
        const activity = await db.query.activities.findFirst({
            where: and(eq(activities.id, activityId), eq(activities.userId, session.user.id)),
        });

        if (!activity) {
            return fail(404, { message: 'Activity not found' });
        }

        // Growth check for the client toast: growth counts DISTINCT days, so this
        // log only banks a day if no other non-skipped log exists on `date`. A
        // stage crossing means the habit's root grew a segment.
        const [{ days: daysBefore }] = await db
            .select({ days: sql<number>`count(distinct date_trunc('day', ${logs.date}))`.mapWith(Number) })
            .from(logs)
            .where(and(eq(logs.activityId, activityId), ne(logs.status, 'skipped')));
        const existingSameDay = await db.query.logs.findFirst({
            where: and(
                eq(logs.activityId, activityId),
                ne(logs.status, 'skipped'),
                sql`${logs.date} between ${startOfDay(date)} and ${endOfDay(date)}`
            ),
        });
        const daysAfter = existingSameDay ? daysBefore : daysBefore + 1;
        const grew = growthStage(daysAfter) > growthStage(daysBefore);

        await db.insert(logs).values({
            activityId,
            date,
            status: 'completed',
            data: logData,
        });

        return { success: true, grew };
    },
};
