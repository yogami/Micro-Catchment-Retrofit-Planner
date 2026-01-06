import { test, expect } from '@playwright/test';

/**
 * Camera Validation E2E - Tests AR scanner with fake camera stream
 * Uses Chromium's fake media args configured in playwright.config.ts
 */
test.describe('Camera Validation E2E', () => {
    test.use({
        // No permissions needed - fake media handles this via launch args
        deviceScaleFactor: undefined,
        viewport: { width: 390, height: 844 }, // Mobile iPhone 14
    });

    test('validates AR overlay in scanner with demo scenario', async ({ page }) => {
        // 1. Visit landing page
        await page.goto('/');

        // 2. Bypass demo overlay via localStorage
        await page.evaluate(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });

        // 3. Click the Fairfax demo button (uses simulated data)
        await page.getByRole('button', { name: /Fairfax/i }).click();

        // 4. Handle any skip overlay
        const skipBtn = page.getByRole('button', { name: 'Skip' });
        try {
            await skipBtn.waitFor({ state: 'visible', timeout: 2000 });
            await skipBtn.click();
        } catch {
            // Skip button not present, continue
        }

        // 5. Verify we are in the scanner view - look for actual UI text
        await expect(page.locator('text=Catchment Area')).toBeVisible({ timeout: 10000 });

        // 6. Check for demo data display (sq ft units in Fairfax)
        await expect(page.getByTestId('locked-area-value').locator('..').getByText('sq ft')).toBeVisible();
        await expect(page.locator('text=Peak Site Runoff')).toBeVisible();
    });

    test('scanner displays accuracy label', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
        await page.getByRole('button', { name: /Fairfax/i }).click();

        // Handle skip if present
        const skipBtn = page.getByRole('button', { name: 'Skip' });
        try {
            await skipBtn.waitFor({ state: 'visible', timeout: 2000 });
            await skipBtn.click();
        } catch {
            // Continue
        }

        // Wait for scanner to load
        await expect(page.locator('text=Catchment Area')).toBeVisible({ timeout: 10000 });

        // Check for accuracy indicator in Survey-Grade Mapping section
        await expect(page.locator('text=Survey-Grade Mapping')).toBeVisible();
    });
});
