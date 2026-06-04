import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter(),
        // VitePWA owns service-worker registration (injectManifest strategy).
        // SvelteKit still BUILDS src/service-worker.ts, but must not also
        // auto-register it — otherwise two registrations race. See ADR 006.
        serviceWorker: {
            register: false,
        },
        alias: {
            '@/*': './src/lib/*',
        },
    },
};

export default config;
