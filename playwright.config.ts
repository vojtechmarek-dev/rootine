import { defineConfig } from '@playwright/test';

export default defineConfig({
    // Use the dev server: adapter-vercel's build output isn't servable by
    // `vite preview` (serverless target) and its symlink step fails on Windows.
    // Dev mode runs full SSR and works cross-platform / in CI.
    webServer: {
        command: 'npm run dev',
        port: 8007,
        reuseExistingServer: true,
    },
    use: { baseURL: 'http://localhost:8007' },
    testDir: 'e2e',
});
