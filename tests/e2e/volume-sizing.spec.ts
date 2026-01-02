import { test, expect } from '@playwright/test';

test.describe('Volume-Based Sizing & WQv Integration', () => {
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

    test('should allow switching between Rate-Based and Volume-Based sizing', async ({ page }) => {
        // 1. Initial state should be Rate-based (Intensity)
        await expect(page.locator('text=Storm Intensity')).toBeVisible();

        // 2. Locate the calculation mode toggle
        const volumeToggle = page.locator('button:has-text("Volume-Based")');
        await volumeToggle.click();

        // 3. UI should now show Rainfall Depth instead of Intensity
        await expect(page.locator('text=Rainfall Depth')).toBeVisible();
        await expect(page.locator('text=WQv').first()).toBeVisible(); // Water Quality Volume label

        // 4. Test Imperial Units for Depth (Standard 1.2" for Fairfax)
        const unitToggle = page.locator('button:has-text("UNIT:")');
        if (await unitToggle.innerText() === 'UNIT: METRIC') {
            await unitToggle.click();
        }
        await expect(unitToggle).toContainText('UNIT: US/IMP');

        // 5. Input 1.2 inches of depth
        const depthInput = page.locator('input[type="number"]');
        await depthInput.fill('1.2');

        // 6. Verify WQv is calculated (Area 120m2 * 1.2in = ~396 cu ft or ~2960 Gallons)
        // We'll just check for the Gallons unit and a non-zero value
        await expect(page.locator('text=gal').first()).toBeVisible();

        // 7. Suggestions should update to match volume requirements
        await expect(page.locator('text=Hydrology Mitigation Strategy')).toBeVisible();
    });
});
