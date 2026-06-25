import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit(),
        SvelteKitPWA({
            // injectManifest = we author the worker (src/service-worker.ts) so
            // custom logic (push notifications, etc.) is possible, while workbox
            // still injects the precache list via self.__WB_MANIFEST. See ADR 006.
            // SvelteKit builds the file; its auto-registration is disabled in
            // svelte.config.js (kit.serviceWorker.register = false) so ONLY
            // VitePWA registers it — no dual-SW conflict.
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'service-worker.ts',
            // 'prompt' = no auto-reload; the app drives the update UX itself via
            // useRegisterSW in src/routes/+layout.svelte (prompts, then calls
            // updateServiceWorker() which posts SKIP_WAITING to the worker).
            registerType: 'prompt',
            // We register the worker ourselves through `virtual:pwa-register/svelte`
            // (useRegisterSW) in the root layout, so VitePWA must NOT also inject a
            // registerSW.js <script>. Its HTML injection never landed in our SPA
            // fallback anyway, which is why prod registered no worker before.
            injectRegister: false,
            // Single source of truth for the web manifest. VitePWA emits
            // /manifest.webmanifest from this — do NOT also keep a copy in
            // static/, they collide and the generated one wins.
            manifest: {
                name: 'Rootine',
                short_name: 'Rootine',
                id: '/',
                start_url: '/',
                display: 'standalone',
                description: 'A simple, open-source habit tracker built with SvelteKit.',
                theme_color: '#F8F9FA',
                background_color: '#F8F9FA',
                icons: [
                    { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png', purpose: 'any' },
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
                screenshots: [
                    {
                        src: 'screenshot-wide.png',
                        sizes: '1200x720',
                        type: 'image/png',
                        form_factor: 'wide',
                        label: 'Rootine on desktop',
                    },
                    {
                        src: 'screenshot-mobile.png',
                        sizes: '720x1200',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'Rootine on mobile',
                    },
                ],
            },
            // globPatterns precache all client chunks (incl. route chunks) so
            // client-side navigation never falls back to a hard reload.
            injectManifest: {
                globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,webmanifest}'],
            },
            // Run the worker in `vite dev` so SW features (push, caching) are
            // testable without build/preview. Off by default upstream to avoid
            // fighting HMR; we opt in. See ADR 006.
            devOptions: {
                enabled: true,
                type: 'module',
                suppressWarnings: true,
            },
        }),
    ],

    test: {
        expect: { requireAssertions: true },

        projects: [
            {
                extends: './vite.config.ts',

                test: {
                    name: 'server',
                    environment: 'node',
                    include: ['src/**/*.{test,spec}.{js,ts}'],
                    exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
                },
            },
        ],
    },
    server: {
        port: 8007,
        host: true,
    },
});
