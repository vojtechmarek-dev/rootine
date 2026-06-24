<script lang="ts">
    import './layout.css';
    import '../app.scss';
    import { initializeTheme } from '$lib/theme/theme.svelte';
    import { onMount } from 'svelte';
    import { afterNavigate } from '$app/navigation';
    import { useRegisterSW } from 'virtual:pwa-register/svelte';

    let { children } = $props();

    // In Svelte 5, calling this sync function with $effect
    // at the root of a component sets up the reactivity automatically.
    initializeTheme();

    // Keep the timezone cookie fresh on every navigation so "today" stays correct
    // even after the user travels across timezones (app.html sets it on first load).
    afterNavigate(() => {
        try {
            document.cookie = `tz=${Intl.DateTimeFormat().resolvedOptions().timeZone};path=/;max-age=31536000;samesite=lax`;
        } catch {
            /* timezone unavailable — server falls back to UTC */
        }
    });

    // Register the service worker and drive the update prompt via VitePWA's
    // lifecycle. useRegisterSW runs inside our app bundle (guaranteed to execute),
    // unlike the generated registerSW.js whose HTML injection never landed in our
    // SPA fallback — which is why production previously registered no worker at all
    // (no push, no offline cache). Dev registration is handled by VitePWA's dev
    // middleware. registerType is 'prompt' (vite.config.ts), so a freshly deployed
    // version waits until the user accepts before activating.
    const { needRefresh, updateServiceWorker } = useRegisterSW({
        onRegisterError(error) {
            console.error('Service worker registration failed:', error);
        },
    });

    // Mirror the previous confirm() flow: prompt when a new version is waiting.
    // updateServiceWorker() posts SKIP_WAITING to the worker and reloads on
    // controllerchange (see the message handler in src/service-worker.ts).
    $effect(() => {
        if ($needRefresh && confirm('A new version of the app is available. Do you want to update?')) {
            void updateServiceWorker();
        }
    });

    // Hide splash screen after app is hydrated and ready
    onMount(() => {
        const splash = document.getElementById('app-splash');
        if (!splash) {
            return;
        }

        const hide = () => {
            if (splash.dataset.hidden === 'true') {
                return;
            }
            splash.dataset.hidden = 'true';
            setTimeout(() => splash.remove(), 220);
        };

        hide();
    });
</script>

{@render children()}
