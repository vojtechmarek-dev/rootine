import { parseDate, getLocalTimeZone } from '@internationalized/date';
import type { CalendarDate, DateValue } from '@internationalized/date';

export function toDateValue(value: Date | string | undefined): CalendarDate | undefined {
    if (value == null) return undefined;
    if (typeof value === 'string') return parseDate(value.slice(0, 10));
    return parseDate(value.toISOString().slice(0, 10));
}

export function toDate(val: unknown): Date {
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    if (val != null && typeof (val as DateValue).toDate === 'function') {
        return (val as DateValue).toDate(getLocalTimeZone());
    }
    return new Date();
}