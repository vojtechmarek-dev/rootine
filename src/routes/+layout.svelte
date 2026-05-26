<script lang="ts">
    import './layout.css';
    import '../app.scss';
    import favicon from '$lib/assets/favicon.svg';
    import { initializeTheme } from '$lib/theme/theme.svelte';
    import { onMount } from 'svelte';

    let { children } = $props();

    // In Svelte 5, calling this sync function with $effect
    // at the root of a component sets up the reactivity automatically.
    initializeTheme();

    let swUpdateDetected = false;

    async function detectServiceWorkerUpdate() {
        if (swUpdateDetected) {
            return;
        }
        swUpdateDetected = true;

        const registration = await navigator.serviceWorker.ready;

        function promptUpdate(worker: ServiceWorker) {
            if (confirm('A new version of the app is available. Do you want to update?')) {
                worker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        }

        if (registration.waiting) {
            promptUpdate(registration.waiting);
            return;
        }

        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    promptUpdate(newWorker);
                }
            });
        });
    }

    // Hide splash screen after app is hydrated and ready
    onMount(() => {
        detectServiceWorkerUpdate();

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

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
