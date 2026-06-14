// Reminder dispatcher. Hit every 15 minutes by a scheduler (Vercel cron or
// any external one) with `Authorization: Bearer ${CRON_SECRET}`. For each push
// subscription it evaluates the owner's activities in the subscription's
// timezone and sends a notification for every schedule time falling inside the
// current 15-minute window — unless the activity is already done today.

import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { activities, logs, weekExceptions } from '$lib/server/db/schema';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { ActivitySchema, WeekExceptionSchema, type Activity, type WeekException } from '$lib/types/schemas';
import { isScheduledForDate } from '$lib/scheduler';
import { isoWeekOf } from '$lib/workout-rotation';
import { sendPush, type StoredSubscription } from '$lib/server/push';
import type { RequestHandler } from './$types';

// Must match the scheduler's firing interval.
const WINDOW_MINUTES = 15;

/** Wall-clock "now" in the given IANA timezone, as a server-local Date. */
function nowInTimezone(timezone: string): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

/** yyyy-MM-dd of an absolute instant in the given timezone. */
function localDayOf(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, dateStyle: 'short' }).format(date);
}

/** True when "HH:mm" falls inside the window [windowStart, windowStart + WINDOW_MINUTES). */
function isTimeInWindow(time: string, windowStartMinutes: number): boolean {
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const minutes = h * 60 + m;
    return minutes >= windowStartMinutes && minutes < windowStartMinutes + WINDOW_MINUTES;
}

function targetCountOf(activity: Activity): number {
    if (activity.type === 'habit' && typeof activity.config.targetValue === 'number') {
        return Math.max(1, activity.config.targetValue);
    }
    return 1;
}

export const GET: RequestHandler = async ({ request }) => {
    if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
        throw error(401, 'Unauthorized');
    }

    const subscriptions = await db.query.pushSubscriptions.findMany();
    if (subscriptions.length === 0) {
        return json({ sent: 0 });
    }

    const subsByUser = new Map<string, StoredSubscription[]>();
    for (const sub of subscriptions) {
        subsByUser.set(sub.userId, [...(subsByUser.get(sub.userId) ?? []), sub]);
    }

    let sent = 0;

    for (const [userId, userSubs] of subsByUser) {
        const rows = await db.query.activities.findMany({
            where: and(eq(activities.userId, userId), eq(activities.archived, false)),
        });

        const parsed: Activity[] = [];
        for (const row of rows) {
            const result = ActivitySchema.safeParse(row);
            // Only activities with reminder times can fire.
            if (result.success && 'times' in result.data.schedule && result.data.schedule.times?.length) {
                parsed.push(result.data);
            }
        }
        if (parsed.length === 0) continue;

        const activityIds = parsed.map((a) => a.id);

        // Current-week schedule shifts (same expiry rule as the dashboard).
        const currentWeek = isoWeekOf(new Date());
        const rawExceptions = await db.query.weekExceptions.findMany({
            where: and(inArray(weekExceptions.habitId, activityIds), gte(weekExceptions.weekOf, currentWeek)),
        });
        const exceptions: WeekException[] = [];
        for (const row of rawExceptions) {
            const result = WeekExceptionSchema.safeParse(row);
            if (result.success) exceptions.push(result.data);
        }

        // Logs from the last 24h cover "today" in any timezone.
        const recentLogs = await db.query.logs.findMany({
            where: and(inArray(logs.activityId, activityIds), gte(logs.date, new Date(Date.now() - 24 * 60 * 60 * 1000))),
        });

        // Evaluate once per distinct timezone, then fan out to its subscriptions.
        const subsByTimezone = new Map<string, StoredSubscription[]>();
        for (const sub of userSubs) {
            subsByTimezone.set(sub.timezone, [...(subsByTimezone.get(sub.timezone) ?? []), sub]);
        }

        for (const [timezone, tzSubs] of subsByTimezone) {
            let localNow: Date;
            try {
                localNow = nowInTimezone(timezone);
            } catch {
                continue; // bad stored timezone — skip rather than crash the run
            }
            const windowStart = Math.floor((localNow.getHours() * 60 + localNow.getMinutes()) / WINDOW_MINUTES) * WINDOW_MINUTES;
            const localToday = localDayOf(new Date(), timezone);

            for (const activity of parsed) {
                const times = 'times' in activity.schedule ? (activity.schedule.times ?? []) : [];
                if (!times.some((t) => isTimeInWindow(t, windowStart))) continue;
                if (!isScheduledForDate(activity, localNow, exceptions)) continue;

                const doneCount = recentLogs.filter(
                    (l) => l.activityId === activity.id && l.status !== 'skipped' && localDayOf(l.date, timezone) === localToday
                ).length;
                if (doneCount >= targetCountOf(activity)) continue;

                for (const sub of tzSubs) {
                    const ok = await sendPush(sub, {
                        title: activity.title,
                        body: activity.description ?? `Time for ${activity.title}!`,
                        url: '/',
                    });
                    if (ok) sent++;
                }
            }
        }
    }

    return json({ sent });
};
