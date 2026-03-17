import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit(),
        SvelteKitPWA({
            manifest: {
                name: 'Rootine',
                short_name: 'Rootine',
                theme_color: '#fafafa',
                background_color: '#fafafa',
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
