import { db } from '$lib/server/db';
import { activities, logs } from '$lib/server/db/schema';
import { ActivitySchema, LogSchema, type DashboardActivity, type Log } from '$lib/types/schemas';
import { eq, desc, and, between, gte, lt } from 'drizzle-orm';
import { formatZodErrorTree } from '$lib/utils';
import { endOfDay, startOfDay } from 'date-fns';
import { isScheduledForDate, getPreviousScheduledDate } from '$lib/scheduler';

/** Target count for "done" today: habits use config.targetValue, others default to 1. */
function getTargetCount(activity: { type: string; config: Record<string, unknown> }): number {
    if (activity.type === 'habit' && typeof activity.config?.targetValue === 'number') {
        return Math.max(1, activity.config.targetValue);
    }
    return 1;
}

export async function getDashboardActivities(
    userId: string,
    targetDate: Date
): Promise<DashboardActivity[]> {
    const userActivities = await db.query.activities.findMany({
        where: and(eq(activities.userId, userId), eq(activities.archived, false)),
        orderBy: [desc(activities.createdAt)],
        with: {
            logs: {
                where: between(logs.date, startOfDay(targetDate), endOfDay(targetDate)),
            },
        },
    });

    const dashboardActivities: DashboardActivity[] = [];

    for (const activity of userActivities) {
        const { logs: rawLogs, ...rawActivityData } = activity;

        const validationResult = ActivitySchema.safeParse(rawActivityData);

        if (!validationResult.success) {
            console.error(
                `Activity Validation Failed (ID: ${activity.id}, Type: ${activity.type}):`,
                formatZodErrorTree(validationResult.error)
            );
            continue;
        }

        const parsedActivity = validationResult.data;

        if (!isScheduledForDate(parsedActivity, targetDate)) {
            // For flexible activities: spill over to subsequent days if the scheduled
            // cycle hasn't been completed yet.
            if (!parsedActivity.schedule.flexible) {
                continue;
            }

            const prevDate = getPreviousScheduledDate(parsedActivity, targetDate);
            if (!prevDate) {
                continue;
            }

            // If there's already a log today, the user is completing it right now —
            // the activity should still render so completion feedback is visible.
            // If there's a log from any earlier day in this cycle, skip (done).
            if (rawLogs.length === 0) {
                const cycleLog = await db.query.logs.findFirst({
                    where: and(
                        eq(logs.activityId, activity.id),
                        gte(logs.date, startOfDay(prevDate)),
                        lt(logs.date, startOfDay(targetDate))
                    ),
                });
                if (cycleLog) {
                    continue; // Completed on a previous spillover day — hide until next mark
                }
            }
            // Fall through: not yet completed this cycle → show as spillover
        }

        const targetCount = getTargetCount(parsedActivity);
        const logCountToday = rawLogs.length;
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

        dashboardActivities.push({
            ...parsedActivity,
            isCompleted,
            logCountToday,
            targetCount,
            logs: parsedLogs,
        });
    }

    return dashboardActivities;
}
