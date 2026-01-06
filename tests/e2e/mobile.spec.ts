import { test, expect } from '@playwright/test';

test.describe('Mobile AR Scanner Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('landing page loads with email form', async ({ page }) => {
        await expect(page.locator('text=Micro-Catchment')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('text=Start Scan')).toBeVisible();
    });

    test('email input accepts valid email', async ({ page }) => {
        const emailInput = page.locator('input[type="email"]');
        await emailInput.fill('test@berlin.de');
        await expect(emailInput).toHaveValue('test@berlin.de');
    });
});

test.describe('AR Scanner Page (simulated auth)', () => {
    test.beforeEach(async ({ page }) => {
        // Pre-set demo seen flag to avoid overlay
        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
        await page.goto('/');

        // Use the Berlin demo button to enter scanner
        await page.getByRole('button', { name: /Berlin/i }).click();

        // Wait for scanner to load
        await page.waitForURL('**/scanner');
    });

    test('scanner page shows results for demo', async ({ page }) => {
        // Since we are using the Berlin demo, it should auto-lock and show results
        // Wait for the Catchment Area label which appears when results are displayed
        await page.waitForSelector('text=Catchment Area', { timeout: 15000 });
        await expect(page.locator('text=Catchment Area')).toBeVisible();

        // Check for specific Berlin demo value
        await expect(page.locator('text=80')).toBeVisible();
        await expect(page.locator('text=m²')).toBeVisible();
    });
});

test.describe('Responsive Layout', () => {
    test('mobile viewport shows properly', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
        await page.goto('/');

        await expect(page.locator('text=Micro-Catchment')).toBeVisible();

        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();
    });
});
