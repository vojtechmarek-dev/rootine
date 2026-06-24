import { describe, it, expect } from 'vitest';
import { HabitConfigSchema } from './schemas';

// Regression guard: the fill flags must survive a jsonb round-trip and apply the
// right default for legacy rows that predate the flags (missing keys).
describe('ActivityConfig fill flags', () => {
    it('defaults a missing allowBackFill to true (legacy rows back-fill by default)', () => {
        const parsed = HabitConfigSchema.parse({ targetValue: 1, unit: 'times' });
        expect(parsed.allowBackFill).toBe(true);
        expect(parsed.allowFutureFill).toBe(false);
        expect(parsed.flexible).toBe(false);
    });

    it('preserves real boolean values across a read (no true→false flip)', () => {
        const parsed = HabitConfigSchema.parse({
            targetValue: 1,
            unit: 'times',
            allowBackFill: false,
            allowFutureFill: true,
            flexible: true,
        });
        expect(parsed.allowBackFill).toBe(false);
        expect(parsed.allowFutureFill).toBe(true);
        expect(parsed.flexible).toBe(true);
    });

    it('coerces form-style string values', () => {
        const parsed = HabitConfigSchema.parse({
            targetValue: 1,
            unit: 'times',
            allowBackFill: 'on',
            allowFutureFill: 'true',
            flexible: '1',
        });
        expect(parsed.allowBackFill).toBe(true);
        expect(parsed.allowFutureFill).toBe(true);
        expect(parsed.flexible).toBe(true);
    });
});
