import { db } from '$lib/server/db';
import { activities, logs, weekExceptions } from '$lib/server/db/schema';
import {
    ActivitySchema,
    LogSchema,
    WeekExceptionSchema,
    type Activity,
    type DashboardActivity,
    type Log,
    type WeekException,
    type WorkoutRotationView,
} from '$lib/types/schemas';
import { eq, desc, and, between, inArray, gte, lt, ne } from 'drizzle-orm';
import { formatZodErrorTree } from '$lib/utils';
import {
    differenceInCalendarDays,
    differenceInDays,
    eachDayOfInterval,
    endOfDay,
    endOfWeek,
    format,
    isSameDay,
    startOfDay,
    startOfWeek,
} from 'date-fns';
import { isScheduledForDate, getPreviousScheduledDate } from '$lib/scheduler';
import { aggregateHabitStreaks, completedDayOrdinals } from '$lib/streak';
import { getRotationPosition, isoWeekOf } from '$lib/workout-rotation';
import type { DashboardWeekDay } from '$lib/types/schemas';

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

    // No recommendation when rotation is disabled
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
    targetDate: Date,
    localTzToday: Date
): Promise<{
    activities: DashboardActivity[];
    errors: Array<{ id: string; type: string; message: string }>;
    /** Per-day completion for the target date's ISO week (Mon–Sun). */
    week: DashboardWeekDay[];
    /** Global streak: the longest currently-alive per-habit schedule-aware streak. */
    streak: number;
}> {
    // Load the whole ISO week of logs: the day view needs the target date, the
    // week ribbon needs every day around it.
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    const userActivities = await db.query.activities.findMany({
        where: and(eq(activities.userId, userId), eq(activities.archived, false)),
        orderBy: [desc(activities.createdAt)],
        with: {
            logs: {
                where: between(logs.date, startOfDay(weekStart), endOfDay(weekEnd)),
            },
        },
    });

    const activityIds = userActivities.map((a) => a.id);

    // Lifetime completions (non-skipped) per activity. One scan feeds BOTH the
    // root-growth meter (distinct days) and the schedule-aware streak (which needs
    // each habit's actual completed days, not just a count).
    const completionRows = activityIds.length
        ? await db
              .select({ activityId: logs.activityId, date: logs.date })
              .from(logs)
              .innerJoin(activities, eq(logs.activityId, activities.id))
              .where(and(eq(activities.userId, userId), ne(logs.status, 'skipped')))
        : [];
    const datesByActivity = new Map<string, Date[]>();
    for (const row of completionRows) {
        const list = datesByActivity.get(row.activityId);
        if (list) list.push(row.date);
        else datesByActivity.set(row.activityId, [row.date]);
    }
    // A day counts as DONE only when the target was met (matches the week ribbon) —
    // one definition driving both the growth meter and the schedule-aware streak.
    const completedDaysByActivity = new Map<string, Set<number>>(
        userActivities.map((a) => [a.id, completedDayOrdinals(datesByActivity.get(a.id) ?? [], getTargetCount(a))])
    );
    const growthPointsByActivity = new Map<string, number>([...completedDaysByActivity].map(([id, set]) => [id, set.size]));

    // WeekExceptions for the target's ISO week. Only apply for the current or
    // future ISO week — past-week exceptions are expired and should not affect
    // historical schedule views. The weekOf text field sorts lexicographically
    // (e.g. "2025-W03" < "2025-W10" < "2026-W01"), so gte works correctly.
    const targetWeek = isoWeekOf(targetDate);
    const currentWeek = isoWeekOf(new Date());
    const rawExceptions = activityIds.length
        ? await db.query.weekExceptions.findMany({
              where: and(
                  inArray(weekExceptions.habitId, activityIds),
                  eq(weekExceptions.weekOf, targetWeek),
                  gte(weekExceptions.weekOf, currentWeek)
              ),
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
    // Validated activities with their week of logs — feeds the week ribbon,
    // which needs every activity regardless of whether it's scheduled today.
    const validated: Array<{ parsed: Activity; weekLogs: (typeof userActivities)[number]['logs'] }> = [];

    for (const activity of userActivities) {
        const { logs: weekLogs, ...rawActivityData } = activity;

        const validationResult = ActivitySchema.safeParse(rawActivityData);

        if (!validationResult.success) {
            const errStr = JSON.stringify(validationResult.error.flatten().fieldErrors, null, 2);
            console.error(`Activity Validation Failed (ID: ${activity.id}, Type: ${activity.type}):`, errStr);
            errors.push({ id: activity.id, type: activity.type, message: errStr });
            continue;
        }

        const parsedActivity = validationResult.data;
        validated.push({ parsed: parsedActivity, weekLogs });

        // The dashboard list only looks at the target date's logs. Computed before
        // the schedule gate so the flexible spillover branch can read it.
        const rawLogs = weekLogs.filter((l) => isSameDay(l.date, targetDate));

        let prevDate: Date | null = null;

        if (!isScheduledForDate(parsedActivity, targetDate, exceptions)) {
            // Flexible activities "spillover": a missed scheduled day keeps showing
            // on "today" until completed, then resumes the normal schedule.
            if (!parsedActivity.config.flexible) {
                continue;
            }

            prevDate = getPreviousScheduledDate(parsedActivity, targetDate);
            if (!prevDate) {
                continue;
            }

            // Show flexible habit to spillover on "today's dashboard"
            if (!isSameDay(targetDate, localTzToday)) {
                continue;
            }

            // A log today means the user is completing it right now → keep rendering.
            // Otherwise, any log since the cycle's scheduled mark means it's done →
            // hide until the next mark.
            if (rawLogs.length === 0) {
                const cycleLog = await db.query.logs.findFirst({
                    where: and(
                        eq(logs.activityId, activity.id),
                        gte(logs.date, startOfDay(prevDate)),
                        lt(logs.date, startOfDay(targetDate))
                    ),
                });
                if (cycleLog) {
                    continue;
                }
            }
            // Fall through: not yet completed this cycle → render as spillover.
        }

        const targetCount = getTargetCount(parsedActivity);
        // Skipped logs record an intent, not a completion — don't count them.
        const completedLogs = rawLogs.filter((l) => l.status !== 'skipped');
        const logCountToday = completedLogs.length;
        const isCompleted = logCountToday >= targetCount;
        const isSkippedToday = logCountToday === 0 && rawLogs.some((l) => l.status === 'skipped');

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
            growthPoints: growthPointsByActivity.get(activity.id) ?? 0,
            streak: 0, // filled in below once all activities are validated
            logs: parsedLogs,
            isSkippedToday,
            workoutRotation,
            weekShifted: shiftedHabitIds.has(activity.id),
            spilloverDaysAgo: prevDate ? differenceInCalendarDays(localTzToday, prevDate) : null,
        });
    }

    // Week ribbon: a day is "completed" when every activity scheduled on it hit
    // its target. Days with nothing scheduled stay neutral (scheduledCount 0).
    const week: DashboardWeekDay[] = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
        let scheduledCount = 0;
        let completedCount = 0;
        for (const { parsed, weekLogs } of validated) {
            if (!isScheduledForDate(parsed, day, exceptions)) {
                continue;
            }
            scheduledCount++;
            const count = weekLogs.filter((l) => l.status !== 'skipped' && isSameDay(l.date, day)).length;
            if (count >= getTargetCount(parsed)) {
                completedCount++;
            }
        }
        return {
            date: format(day, 'yyyy-MM-dd'),
            scheduledCount,
            completedCount,
            completed: scheduledCount > 0 && completedCount === scheduledCount,
        };
    });

    // Schedule-aware streaks. Each habit's streak counts consecutive *scheduled*
    // days it completed (rest days don't break it); the global streak is the
    // longest currently-alive habit streak. Anchored on the real today, not the
    // viewed date. Exceptions only matter for the current week.
    const { byActivity, global } = aggregateHabitStreaks(
        validated.map((v) => v.parsed),
        completedDaysByActivity,
        new Date(),
        exceptions
    );
    for (const a of dashboardActivities) {
        a.streak = byActivity.get(a.id)?.current ?? 0;
    }
    const streak = global.current;

    return { activities: dashboardActivities, errors, week, streak };
}
