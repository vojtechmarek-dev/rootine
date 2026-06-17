import { browser } from '$app/environment';

// Device-local app preferences (not synced). Mirrors the theme store pattern.

export const HAPTIC_INTENSITY_STORAGE_KEY = 'rootine.haptics.intensity';

// 'off' disables vibration entirely; the rest map to the patterns in haptics.ts.
export type HapticPreference = 'off' | 'light' | 'medium' | 'strong';

const HAPTIC_PREFERENCES: HapticPreference[] = ['off', 'light', 'medium', 'strong'];

function isHapticPreference(value: unknown): value is HapticPreference {
    return typeof value === 'string' && (HAPTIC_PREFERENCES as string[]).includes(value);
}

class SettingsState {
    hapticIntensity = $state<HapticPreference>('light');

    constructor() {
        if (browser) {
            const stored = localStorage.getItem(HAPTIC_INTENSITY_STORAGE_KEY);
            if (isHapticPreference(stored)) {
                this.hapticIntensity = stored;
            }
        }
    }

    setHapticIntensity(next: HapticPreference) {
        this.hapticIntensity = next;
        if (browser) {
            localStorage.setItem(HAPTIC_INTENSITY_STORAGE_KEY, next);
        }
    }
}

export const settings = new SettingsState();

export const setHapticIntensity = (next: HapticPreference) => settings.setHapticIntensity(next);
