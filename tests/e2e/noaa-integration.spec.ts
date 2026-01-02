import { test, expect } from '@playwright/test';

test.describe('NOAA Atlas 14 Integration & Step Intensity Toggle', () => {
    test.beforeEach(async ({ page }) => {
        // Use demo shortcut for login
        await page.goto('/');
        await page.click('button:has-text("🗽 Fairfax")');
        await page.waitForURL('**/scanner');

        // Skip the tour if it appears
        const skipButton = page.locator('button:has-text("Skip")');
        if (await skipButton.isVisible()) {
            await skipButton.click();
        }
    });

    test('should allow switching to manual intensity mode and entering NOAA 10-year storm values', async ({ page }) => {
        // 1. Initial state should show Storm Intensity card
        // Wait for demo to initialize and lock results
        await page.waitForSelector('text=Storm Intensity', { timeout: 10000 });
        await expect(page.locator('text=Storm Intensity')).toBeVisible();

        // 2. Click the Storm Intensity card to open controls
        await page.click('text=Storm Intensity');

        // 3. Switch to Manual/Engineering mode
        // In the current implementation, clicking the card toggles it.
        // It's already clicked in step 2. Let's verify it's MANUAL.
        await expect(page.locator('text=MANUAL')).toBeVisible();

        // 4. Enter the Fairfax 10-year 5-min intensity (6.76 in/hr)
        const unitToggle = page.locator('button:has-text("UNIT:")');
        if (await unitToggle.innerText() === 'UNIT: METRIC') {
            await unitToggle.click();
        }
        await expect(unitToggle).toContainText('UNIT: US/IMP');

        // Target the numeric input (spinbutton)
        const intensityInput = page.locator('input[type="number"]');
        await intensityInput.fill('6.76');

        // 5. Verify the value is reflected in the UI
        await expect(page.locator('text=6.76in/hr')).toBeVisible();

        // 6. Verify that peak runoff is displayed
        const flowValue = page.locator('text=cfs');
        await expect(flowValue).toBeVisible();
        // Just checking it's a number and visible for now
    });
});
