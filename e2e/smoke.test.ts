import { expect, test } from '@playwright/test';

// Smoke tests: app boots, public/auth routing works, no SSR/hydration crash.
// These run unauthenticated, so they never touch the DB (JWT session + no cookie
// returns null before any Drizzle query). No seeded data required.

test('protected root redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
});

test('login page renders its heading and Google sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome to Rootine' })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
});

test('login page hydrates without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    expect(errors).toEqual([]);
});
