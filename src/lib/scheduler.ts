import { differenceInDays, differenceInHours, startOfDay } from 'date-fns';
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

/** Returns the activity's schedule with any matching WeekException shift applied. */
function applyWeekException(activity: Activity, target: Date, exceptions: WeekException[]): Activity['schedule'] {
    if (activity.schedule.type !== 'weekly' || exceptions.length === 0) {
        return activity.schedule;
    }

    const week = isoWeekOf(target);
    const exception = exceptions.find((e) => e.habitId === activity.id && e.weekOf === week);
    if (!exception || exception.shiftDays === 0) {
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

            if (schedule.unit === 'hours') {
                const diff = differenceInHours(target, anchor);
                return diff % intervalVal === 0;
            }

            const diff = differenceInDays(target, anchor);
            return diff % intervalVal === 0;
        }
        default: {
            return false;
        }
    }
}
