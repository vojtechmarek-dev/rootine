import { db } from '$lib/server/db';
import { activities, logs, weekExceptions } from '$lib/server/db/schema';
import {
    ActivitySchema,
    LogSchema,
    WeekExceptionSchema,
    type DashboardActivity,
    type Log,
    type WeekException,
    type WorkoutRotationView,
} from '$lib/types/schemas';
import { eq, desc, and, between, inArray } from 'drizzle-orm';
import { formatZodErrorTree } from '$lib/utils';
import { differenceInDays, endOfDay, startOfDay } from 'date-fns';
import { isScheduledForDate } from '$lib/scheduler';
import { getRotationPosition, isoWeekOf } from '$lib/workout-rotation';

/** Target count for "done" today: habits use config.targetValue, others default to 1. */
function getTargetCount(activity: { type: string; config: Record<string, unknown> }): number {
    if (activity.type === 'habit' && typeof activity.config?.targetValue === 'number') {
        return Math.max(1, activity.config.targetValue);
    }
    return 1;
}

/**
 * Build the rotation preview for a workout habit. Sequence position is never
 * stored — derive it from the most recent completed log carrying a setId.
 */
function buildWorkoutRotation(
    activity: { config: Record<string, unknown> },
    lastCompleted: { setId: string | null; date: Date } | null,
    targetDate: Date
): WorkoutRotationView | null {
    const sets = Array.isArray(activity.config?.workoutSets) ? (activity.config.workoutSets as { id: string; name: string }[]) : [];
    if (sets.length === 0) {
        return null;
    }

    const rotation = Array.isArray(activity.config?.rotation) ? (activity.config.rotation as string[]) : [];
    const useRotation = activity.config?.useRotation !== false;
    const nameOf = (id: string | null) => (id ? (sets.find((s) => s.id === id)?.name ?? null) : null);

    // Treat an orphaned (deleted) set as no prior log for sequencing.
    const lastSetId = lastCompleted?.setId && sets.some((s) => s.id === lastCompleted.setId) ? lastCompleted.setId : null;
    const daysSinceLast = lastCompleted ? differenceInDays(startOfDay(targetDate), startOfDay(lastCompleted.date)) : null;

    const view: WorkoutRotationView = {
        lastSetId,
        lastSetName: nameOf(lastSetId),
        daysSinceLast,
        currentSetId: null,
        currentSetName: null,
        nextSetId: null,
        nextSetName: null,
    };

    // No recommendation when rotation is disabled (edge case: §6).
    if (!useRotation || rotation.length === 0) {
        return view;
    }

    const pos = getRotationPosition(rotation, lastSetId);
    if (pos) {
        view.currentSetId = rotation[pos.currentIndex] ?? null;
        view.currentSetName = nameOf(view.currentSetId);
        if (rotation.length > 1) {
            view.nextSetId = rotation[pos.nextIndex] ?? null;
            view.nextSetName = nameOf(view.nextSetId);
        }
    }

    return view;
}

export async function getDashboardActivities(
    userId: string,
    targetDate: Date
): Promise<{ activities: DashboardActivity[]; errors: Array<{ id: string; type: string; message: string }> }> {
    const userActivities = await db.query.activities.findMany({
        where: and(eq(activities.userId, userId), eq(activities.archived, false)),
        orderBy: [desc(activities.createdAt)],
        with: {
            logs: {
                where: between(logs.date, startOfDay(targetDate), endOfDay(targetDate)),
            },
        },
    });

    const activityIds = userActivities.map((a) => a.id);

    // WeekExceptions for the target's ISO week. The scheduler applies the shift;
    // we also expose `weekShifted` so the card can suppress the shift action.
    const targetWeek = isoWeekOf(targetDate);
    const rawExceptions = activityIds.length
        ? await db.query.weekExceptions.findMany({
              where: and(inArray(weekExceptions.habitId, activityIds), eq(weekExceptions.weekOf, targetWeek)),
          })
        : [];
    const exceptions: WeekException[] = [];
    for (const row of rawExceptions) {
        const parsed = WeekExceptionSchema.safeParse(row);
        if (parsed.success) {
            exceptions.push(parsed.data);
        }
    }
    const shiftedHabitIds = new Set(exceptions.map((e) => e.habitId));

    // Most recent completed log carrying a setId, per workout habit. Used to
    // derive rotation position without storing it.
    const workoutIds = userActivities.filter((a) => a.type === 'workout').map((a) => a.id);
    const lastSetLogByActivity = new Map<string, { setId: string | null; date: Date }>();
    if (workoutIds.length) {
        const completedLogs = await db.query.logs.findMany({
            where: and(inArray(logs.activityId, workoutIds), eq(logs.status, 'completed')),
            orderBy: [desc(logs.date)],
        });
        for (const log of completedLogs) {
            if (lastSetLogByActivity.has(log.activityId)) {
                continue; // already have the newest for this activity
            }
            const setId = (log.data as { setId?: unknown })?.setId;
            if (typeof setId === 'string' && setId.length > 0) {
                lastSetLogByActivity.set(log.activityId, { setId, date: log.date });
            }
        }
    }

    const dashboardActivities: DashboardActivity[] = [];
    const errors: Array<{ id: string; type: string; message: string }> = [];

    for (const activity of userActivities) {
        const { logs: rawLogs, ...rawActivityData } = activity;

        const validationResult = ActivitySchema.safeParse(rawActivityData);

        if (!validationResult.success) {
            const errStr = JSON.stringify(validationResult.error.flatten().fieldErrors, null, 2);
            console.error(`Activity Validation Failed (ID: ${activity.id}, Type: ${activity.type}):`, errStr);
            errors.push({ id: activity.id, type: activity.type, message: errStr });
            continue;
        }

        const parsedActivity = validationResult.data;

        if (!isScheduledForDate(parsedActivity, targetDate, exceptions)) {
            continue;
        }

        const targetCount = getTargetCount(parsedActivity);
        // Skipped logs record an intent, not a completion — don't count them.
        const logCountToday = rawLogs.filter((l) => l.status !== 'skipped').length;
        const isCompleted = logCountToday >= targetCount;

        const parsedLogs: Log[] = rawLogs
            .map((log) => {
                const result = LogSchema.safeParse({
                    type: parsedActivity.type,
                    data: log.data ?? {},
                });
                if (!result.success) {
                    console.error(`Log Validation Failed`, formatZodErrorTree(result.error));
                    return null;
                }
                return result.data;
            })
            .filter((result): result is Log => result !== null);

        const workoutRotation =
            parsedActivity.type === 'workout'
                ? buildWorkoutRotation(parsedActivity, lastSetLogByActivity.get(activity.id) ?? null, targetDate)
                : null;

        dashboardActivities.push({
            ...parsedActivity,
            isCompleted,
            logCountToday,
            targetCount,
            logs: parsedLogs,
            workoutRotation,
            weekShifted: shiftedHabitIds.has(activity.id),
        });
    }

    return { activities: dashboardActivities, errors };
}
