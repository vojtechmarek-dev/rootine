import { describe, it, expect } from 'vitest';
import { toToastDescription, getActivityTypeLabel, getActivityAccentClasses, cn } from './utils';

describe('toToastDescription', () => {
    it('returns undefined for falsy values', () => {
        expect(toToastDescription('')).toBeUndefined();
        expect(toToastDescription(null)).toBeUndefined();
        expect(toToastDescription(undefined)).toBeUndefined();
        expect(toToastDescription(0)).toBeUndefined();
    });

    it('trims and collapses whitespace in a string', () => {
        expect(toToastDescription('  hello   world  ')).toBe('hello world');
    });

    it('returns undefined for a whitespace-only string', () => {
        expect(toToastDescription('   ')).toBeUndefined();
    });

    it('uses the message of an Error', () => {
        expect(toToastDescription(new Error('boom'))).toBe('boom');
    });

    it('JSON-stringifies other objects', () => {
        expect(toToastDescription({ a: 1 })).toBe('{"a":1}');
    });

    it('truncates long descriptions with an ellipsis', () => {
        const long = 'a'.repeat(300);
        const result = toToastDescription(long);
        expect(result).toBe(`${'a'.repeat(220)}...`);
    });

    it('respects a custom max length', () => {
        expect(toToastDescription('abcdef', 3)).toBe('abc...');
    });

    it('does not truncate when exactly at the limit', () => {
        expect(toToastDescription('abc', 3)).toBe('abc');
    });
});

describe('getActivityTypeLabel', () => {
    it('maps known types to capitalised labels', () => {
        expect(getActivityTypeLabel('habit')).toBe('Habit');
        expect(getActivityTypeLabel('plant')).toBe('Plant');
        expect(getActivityTypeLabel('workout')).toBe('Workout');
    });

    it('falls back to "Activity" for unknown types', () => {
        expect(getActivityTypeLabel('unknown')).toBe('Activity');
        expect(getActivityTypeLabel('')).toBe('Activity');
    });
});

describe('getActivityAccentClasses', () => {
    it('returns the matching accent for a known color', () => {
        expect(getActivityAccentClasses('emerald').chip).toContain('emerald');
    });

    it('is case- and whitespace-insensitive', () => {
        expect(getActivityAccentClasses('  EMERALD ')).toEqual(getActivityAccentClasses('emerald'));
    });

    it('falls back to zinc for null/unknown colors', () => {
        const zinc = getActivityAccentClasses('zinc');
        expect(getActivityAccentClasses(null)).toEqual(zinc);
        expect(getActivityAccentClasses(undefined)).toEqual(zinc);
        expect(getActivityAccentClasses('not-a-color')).toEqual(zinc);
    });
});

describe('cn', () => {
    it('merges class names', () => {
        expect(cn('a', 'b')).toBe('a b');
    });

    it('resolves conflicting tailwind classes (last wins)', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('drops falsy values', () => {
        expect(cn('a', false, null, undefined, 'b')).toBe('a b');
    });
});
