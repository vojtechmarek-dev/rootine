import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { WEEKDAYS } from '$lib/constants';
import { ActivitySchema, type DashboardActivity, type Schedule } from '$lib/types/schemas';
import { eq, desc, and, between } from 'drizzle-orm';
import { formatZodErrorTree } from '$lib/utils';
import { endOfDay, startOfDay } from 'date-fns';
import { isScheduledForDate } from '@/scheduler';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
        return fail(401, { message: 'Unauthorized' });
    }

    const urlDate = event.url.searchParams.get('date');
    const targetDate = urlDate ? new Date(urlDate) : new Date();

    const userActivities = await db.query.activities.findMany({
        where: and(eq(activities.userId, session.user.id), eq(activities.archived, false)),
        orderBy: [desc(activities.createdAt)],
        with: {
            logs: {
                where: between(logs.date, startOfDay(targetDate), endOfDay(targetDate)),
            },
        },
    });

    const dashboardActivities: DashboardActivity[] = [];

    // Validate and parse each activity into the domain type
    for (const activity of userActivities) {
        // We must pass type, config, schedule AND shared props so Zod knows which schema to apply
        const { logs: rawLogs, ...rawActivityData } = activity;

        const validationResult = ActivitySchema.safeParse(rawActivityData);

        if (!validationResult.success) {
            // todo add snackbar notification
            console.error(
                `Activity Validation Failed (ID: ${activity.id}, Type: ${activity.type}):`,
                formatZodErrorTree(validationResult.error)
            );
            continue; // Skip to the next activity
        }

        const parsedActivity = validationResult.data;

        const isScheduled = isScheduledForDate(parsedActivity, targetDate);

        if (!isScheduled) {
            continue; // Skip habits not scheduled for today
        }

        // For the dashboard "done" state we only need to know if a log exists for the day.
        // todo: (We can add typed log parsing later once `logs.data` gets a stable shape.)
        const isCompleted = rawLogs.length > 0;

        dashboardActivities.push({
            ...parsedActivity,
            isCompleted,
            logs: null,
        });
    }

    console.log(dashboardActivities);

    return {
        session,
        activities: dashboardActivities,
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
                unit: (formData.get('schedule_unit') as 'days' | 'hours') || 'days',
            };
        } else if (scheduleType === 'weekly') {
            // Parse selected days from formData (e.g., schedule_days=mon, schedule_days=wed)
            const rawDays = formData.getAll('schedule_days');
            const days = rawDays.map((d) => d.toString());
            // Zod will validate these strings against the enum
            schedule = {
                type: 'weekly',
                days: (days.length > 0 ? days : [...WEEKDAYS]) as never,
            };
        } else {
            // Fallback for legacy forms or implicit defaults
            const period = formData.get('period');
            const waterInterval = formData.get('waterIntervalDays');

            if (waterInterval) {
                schedule = { type: 'interval', value: Number(waterInterval), unit: 'days' };
            } else if (period === 'weekly') {
                schedule = { type: 'weekly', days: [...WEEKDAYS] };
            } else {
                schedule = { type: 'daily' };
            }
        }

        // 2. Coerce Config Data
        // Map empty strings to undefined to allow Zod defaults to trigger
        const rawConfig = {
            // Habit Specific
            // Convert to Number, fallback to undefined if empty/invalid
            targetValue: formData.get('targetValue') ? Number(formData.get('targetValue')) : undefined,
            unit: formData.get('unit') || undefined,
            // period: REMOVED (handled by schedule)

            // Plant Specific
            // waterIntervalDays: REMOVED (handled by schedule)
            location: formData.get('location') || undefined,
            species: formData.get('species') || undefined,

            // Workout Specific
            exercises: [], // TODO: Parse complex list when implemented
            estimatedDurationMin: formData.get('estimatedDurationMin') ? Number(formData.get('estimatedDurationMin')) : undefined,
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
            schedule,
        };

        const result = ActivitySchema.safeParse(payload);

        if (!result.success) {
            console.error(`Activity Validation Failed`, formatZodErrorTree(result.error));
            return fail(400, {
                message: 'Invalid activity data',
                errors: formatZodErrorTree(result.error),
                values: rawConfig,
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
    },

    toggleActivity: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            return fail(401, { message: 'Unauthorized' });
        }

        const formData = await event.request.formData();
        const activityId = formData.get('activityId') as string;
        const action = formData.get('action') as 'complete' | 'undo';

        if (action !== 'complete' && action !== 'undo') {
            return fail(400, { message: 'Invalid action' });
        }

        // For accurate logging, we generally log "Now".
        // If you allow back-dating, pass the date from the form.
        const logDate = new Date();

        try {
            if (action === 'complete') {
                await db.insert(logs).values({
                    activityId: activityId,
                    date: logDate,
                    status: 'completed',
                    data: {}, // todo: Add arbitrary data here if needed (e.g. reps)
                });
            } else if (action === 'undo') {
                // To undo, we need the log ID.
                // Ideally passed from client, or we look it up.
                const logId = formData.get('logId') as string | null;

                if (logId) {
                    await db.delete(logs).where(eq(logs.id, logId));
                } else {
                    const mostRecent = await db.query.logs.findFirst({
                        where: and(eq(logs.activityId, activityId), between(logs.date, startOfDay(logDate), endOfDay(logDate))),
                        orderBy: [desc(logs.date)],
                    });

                    if (mostRecent) {
                        await db.delete(logs).where(eq(logs.id, mostRecent.id));
                    }
                }
            }
        } catch (err) {
            console.error('Toggle error:', err);
            return fail(500, { message: 'Could not update status' });
        }

        return { success: true };
    },
};
