import { differenceInCalendarMonths, differenceInCalendarYears, endOfMonth, startOfDay, subDays, differenceInCalendarDays } from 'date-fns';
import type { Activity, WeekException } from '$lib/types/schemas';
import { WEEKDAYS } from '$lib/constants';
import { isoWeekOf, shiftWeekdays } from '$lib/workout-rotation';

export function isScheduledForDate(activity: Activity, targetDate: Date, exceptions: WeekException[] = []): boolean {
    const start = startOfDay(new Date(activity.startDate));
    const target = startOfDay(targetDate);

    // 1. Don't show habits before they started
    if (target < start) {
        return false;
    }

    // 2. Don't show archived activities (optional, usually filtered in DB)
    if (activity.archived) {
        return false;
    }

    // 3. Don't show activities after they ended
    if (activity.endDate) {
        const end = startOfDay(new Date(activity.endDate));
        if (target > end) {
            return false;
        }
    }

    // JS getDay(): 0=Sun..6=Sat, but WEEKDAYS is mon..sun
    const weekdayIndex = (target.getDay() + 6) % 7;
    const dayName = WEEKDAYS[weekdayIndex];

    // A WeekException for the target's ISO week shifts the weekly preferred
    // days for that week only (spec §1, §4). Past completed days are logs,
    // not schedule, so they are unaffected.
    const schedule = applyWeekException(activity, target, exceptions);

    // Schedule interpretation can differ by activity.type, so we branch first.
    switch (activity.type) {
        case 'habit': {
            return isScheduledBySchedule(schedule, start, target, dayName);
        }
        case 'plant': {
            // For rolling intervals, plants typically anchor on "lastWatered" if present.
            const maybeLast = activity.config.lastWatered;
            const anchor = maybeLast ? startOfDay(new Date(maybeLast)) : start;
            return isScheduledBySchedule(schedule, anchor, target, dayName);
        }
        case 'workout': {
            return isScheduledBySchedule(schedule, start, target, dayName);
        }
        default: {
            return false;
        }
    }
}

/**
 * Most recent scheduled day strictly before `targetDate`, or `null` if there is
 * none on/after `startDate`. Drives flexible "spillover": the cycle the activity
 * is currently overdue for began on this day.
 *
 * Generic backward scan over {@link isScheduledForDate} so it works for every
 * schedule type/unit; it breaks on the first match (cheap for daily/weekly/short
 * intervals) and is bounded so a long interval can't loop unbounded — past the cap
 * spillover simply doesn't trigger. WeekException shifting is intentionally ignored
 * here (v1): the cycle anchor uses the base schedule.
 */
export function getPreviousScheduledDate(activity: Activity, targetDate: Date): Date | null {
    const start = startOfDay(new Date(activity.startDate));
    const target = startOfDay(targetDate);
    if (target <= start) {
        return null;
    }

    const MAX_LOOKBACK_DAYS = 366;
    for (let i = 1; i <= MAX_LOOKBACK_DAYS; i++) {
        const candidate = subDays(target, i);
        if (candidate < start) {
            return null;
        }
        if (isScheduledForDate(activity, candidate)) {
            return candidate;
        }
    }
    return null;
}

/** Returns the activity's schedule with any matching WeekException shift applied. */
function applyWeekException(activity: Activity, target: Date, exceptions: WeekException[]): Activity['schedule'] {
    if (activity.schedule.type !== 'weekly' || exceptions.length === 0) {
        return activity.schedule;
    }

    const week = isoWeekOf(target);
    const exception = exceptions.find((e) => e.habitId === activity.id && e.weekOf === week);
    if (!exception || exception.shiftDays === 0 || target < startOfDay(exception.createdAt)) {
        return activity.schedule;
    }

    return { ...activity.schedule, days: shiftWeekdays(activity.schedule.days, exception.shiftDays) };
}

function isScheduledBySchedule(schedule: Activity['schedule'], anchor: Date, target: Date, weekday: (typeof WEEKDAYS)[number]): boolean {
    switch (schedule.type) {
        case 'daily': {
            return true;
        }
        case 'weekly': {
            return schedule.days.includes(weekday);
        }
        case 'interval': {
            const intervalVal = schedule.value ?? 1;

            switch (schedule.unit) {
                case 'weeks': {
                    return differenceInCalendarDays(target, anchor) % (intervalVal * 7) === 0;
                }
                case 'months': {
                    const months = differenceInCalendarMonths(target, anchor);
                    return months >= 0 && months % intervalVal === 0 && matchesDayOfMonth(target, anchor);
                }
                case 'years': {
                    const years = differenceInCalendarYears(target, anchor);
                    return (
                        years >= 0 &&
                        years % intervalVal === 0 &&
                        target.getMonth() === anchor.getMonth() &&
                        matchesDayOfMonth(target, anchor)
                    );
                }
                case 'days':
                default: {
                    const diff = differenceInCalendarDays(target, anchor);
                    return diff % intervalVal === 0;
                }
            }
        }
        default: {
            return false;
        }
    }
}

/**
 * True when target lands on the anchor's day-of-month. When the anchor day
 * exceeds the target month's length (e.g. anchor Jan 31 in Feb), the last day
 * of the target month counts as a match so monthly schedules never skip.
 */
function matchesDayOfMonth(target: Date, anchor: Date): boolean {
    const anchorDay = anchor.getDate();
    const targetDay = target.getDate();
    if (targetDay === anchorDay) {
        return true;
    }
    const lastDay = endOfMonth(target).getDate();
    return anchorDay > lastDay && targetDay === lastDay;
}
