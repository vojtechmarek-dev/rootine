import { browser } from '$app/environment';

export const THEME_MODE_STORAGE_KEY = 'rootine.theme.mode';
export const THEME_PRESET_STORAGE_KEY = 'rootine.theme.preset';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeResolvedMode = 'light' | 'dark';
export type ThemePreset = 'zinc';

class ThemeState {
    mode = $state<ThemeMode>('system');
    preset = $state<ThemePreset>('zinc');
    systemPrefersDark = $state<boolean>(false);

    resolvedMode = $derived<ThemeResolvedMode>(
        this.mode === 'system' ? (this.systemPrefersDark ? 'dark' : 'light') : this.mode
    );

    constructor() {
        if (browser) {
            const storedMode = localStorage.getItem(THEME_MODE_STORAGE_KEY);
            if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
                this.mode = storedMode as ThemeMode;
            }

            const storedPreset = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
            if (storedPreset === 'zinc') {
                this.preset = storedPreset as ThemePreset;
            }

            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.systemPrefersDark = mediaQuery.matches;

            mediaQuery.addEventListener('change', (e) => {
                this.systemPrefersDark = e.matches;
            });
        }
    }

    setMode(newMode: ThemeMode) {
        this.mode = newMode;
        if (browser) {
            localStorage.setItem(THEME_MODE_STORAGE_KEY, newMode);
        }
    }

    setPreset(newPreset: ThemePreset) {
        this.preset = newPreset;
        if (browser) {
            localStorage.setItem(THEME_PRESET_STORAGE_KEY, newPreset);
        }
    }
}

export const theme = new ThemeState();

export function initializeTheme() {
    if (!browser) {
        return;
    }

    $effect(() => {
        const root = document.documentElement;
        root.dataset.theme = theme.preset;
        root.dataset.mode = theme.resolvedMode;
        root.classList.toggle('dark', theme.resolvedMode === 'dark');
        root.style.colorScheme = theme.resolvedMode;
    });
}

// Export functions for simpler imports and backwards compatibility
export const setThemeMode = (mode: ThemeMode) => theme.setMode(mode);
export const setThemePreset = (preset: ThemePreset) => theme.setPreset(preset);
